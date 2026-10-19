from __future__ import annotations

import secrets
import time
from typing import Any

# Runs live in memory only. Without a cap the dict grows for as long as the
# process runs, so a stream of requests becomes a memory-exhaustion attack.
# Oldest runs are evicted once the cap is reached.
MAX_RUNS = 200

RUN_STORE: dict[str, dict[str, Any]] = {}


def _evict_oldest() -> None:
    while len(RUN_STORE) >= MAX_RUNS:
        oldest = next(iter(RUN_STORE))
        RUN_STORE.pop(oldest, None)


def create_run_record(text: str, home_fields: list[str], chaos: float) -> dict[str, Any]:
    _evict_oldest()
    # A random suffix, so a run id cannot be guessed from the clock and someone
    # else's run read back off the stream endpoint. token_hex, not token_urlsafe:
    # urlsafe output can contain "_", which collides with the separator here.
    run_id = f"run_{int(time.time() * 1000)}_{secrets.token_hex(8)}"
    timestamp = int(time.time())
    record = {
        "run_id": run_id,
        "status": "queued",
        "text": text,
        "home_fields": home_fields,
        "chaos": chaos,
        "created_at": timestamp,
        "updated_at": timestamp,
        "trace": [
            {
                "type": "trace",
                "step": "abstracting",
                "message": "Stripping domain terms...",
                "ts": timestamp,
                "meta": {
                    "task": "abstractor",
                    "cached": False,
                    "attempt": 1,
                    "status": "queued",
                },
            }
        ],
    }
    RUN_STORE[run_id] = record
    return record


def get_run_record(run_id: str) -> dict[str, Any] | None:
    return RUN_STORE.get(run_id)


def transition_run_status(
    run_id: str,
    *,
    status: str,
    step: str,
    message: str,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    run = RUN_STORE.get(run_id)
    if run is None:
        return None

    timestamp = int(time.time())
    run["status"] = status
    run["updated_at"] = timestamp
    run["trace"].append(
        {
            "type": "trace",
            "step": step,
            "message": message,
            "ts": timestamp,
            "meta": meta or {"task": step, "cached": False, "attempt": 1},
        }
    )
    return run
