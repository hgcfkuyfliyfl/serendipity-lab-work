"""A small per-client rate limiter.

`POST /api/collide` spends real money: every run makes several model calls on a
free-tier key with a hard quota. Without a limit one person (or one loop in a
browser tab) can drain the quota and take the demo down. This is a fixed window
counted in memory, which is enough for a single-process demo server. A real
deployment behind more than one worker needs a shared store instead.
"""

from __future__ import annotations

import os
import time
from collections import deque

from fastapi import HTTPException, Request


def _int_env(name: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(name, "").strip() or default))
    except ValueError:
        return default


# Generous enough for a demo and a judge clicking around, tight enough that a
# runaway loop is stopped within seconds.
MAX_REQUESTS = _int_env("RATE_LIMIT_REQUESTS", 20)
WINDOW_SECONDS = _int_env("RATE_LIMIT_WINDOW_SECONDS", 60)
MAX_CLIENTS = 1024

_hits: dict[str, deque[float]] = {}


def _client_key(request: Request) -> str:
    # X-Forwarded-For is attacker-controlled unless a trusted proxy sets it, so
    # it is used only when the deployment says it is behind one.
    if os.getenv("TRUST_PROXY_HEADERS", "").strip().lower() in {"1", "true", "yes", "on"}:
        forwarded = request.headers.get("x-forwarded-for", "")
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    client = request.client
    return client.host if client else "unknown"


def reset() -> None:
    """Clear all counters. For tests."""
    _hits.clear()


def check(request: Request) -> None:
    """Raise 429 when this client has used up its allowance for the window."""
    now = time.monotonic()
    key = _client_key(request)

    if key not in _hits and len(_hits) >= MAX_CLIENTS:
        # The counter table is itself memory: drop whichever entry is oldest.
        stalest = min(_hits, key=lambda k: _hits[k][-1] if _hits[k] else 0.0)
        _hits.pop(stalest, None)

    window = _hits.setdefault(key, deque())
    cutoff = now - WINDOW_SECONDS
    while window and window[0] <= cutoff:
        window.popleft()

    if len(window) >= MAX_REQUESTS:
        retry_after = max(1, int(WINDOW_SECONDS - (now - window[0])))
        raise HTTPException(
            status_code=429,
            detail="Too many runs from this client. Wait a moment and try again.",
            headers={"Retry-After": str(retry_after)},
        )

    window.append(now)
