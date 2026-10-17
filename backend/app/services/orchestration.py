"""Service orchestration layer for the agent workflow."""

from __future__ import annotations

import time
from typing import Any

from app.core.llm_gateway import LLMGateway


class OrchestrationService:
    """Thin workflow orchestrator built on top of the LLM gateway."""

    def __init__(self) -> None:
        self.gateway = LLMGateway()

    def _trace(self, step: str, message: str, *, task: str | None = None, cached: bool = False, attempt: int = 1, ms: int | None = None) -> dict[str, Any]:
        event = {
            "type": "trace",
            "step": step,
            "message": message,
            "ts": int(time.time()),
        }
        meta = {"task": task or step, "cached": cached, "attempt": attempt}
        if ms is not None:
            meta["ms"] = ms
        event["meta"] = meta
        return event

    def run(self, text: str, home_fields: list[str], chaos: float) -> dict[str, Any]:
        trace: list[dict[str, Any]] = [
            self._trace("abstracting", "Stripping domain terms...", task="abstractor"),
        ]

        abstraction = self.gateway.run(
            "abstractor",
            {"text": text},
            cache_id=f"abstractor:{text[:80]}",
        )

        trace.append(
            self._trace(
                "decomposing",
                "Breaking the problem into structural queries.",
                task="decomposer",
                cached=abstraction.cached,
                attempt=abstraction.attempts,
                ms=abstraction.latency_ms,
            )
        )

        trace.append(
            self._trace(
                "done",
                "Abstracted problem ready for retrieval pipeline.",
                task="abstractor",
                cached=abstraction.cached,
                attempt=abstraction.attempts,
                ms=abstraction.latency_ms,
            )
        )

        return {
            "text": text,
            "home_fields": home_fields,
            "chaos": chaos,
            "status": "completed",
            "abstraction": abstraction.data,
            "trace": trace,
        }
