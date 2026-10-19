import time
from typing import Any

RUN_STORE: dict[str, dict[str, Any]] = {}


def create_run_record(text: str, home_fields: list[str], chaos: float) -> dict[str, Any]:
    run_id = f"run_{int(time.time() * 1000)}_{len(RUN_STORE) + 1}"
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
