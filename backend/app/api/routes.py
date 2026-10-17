import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.run_store import create_run_record, get_run_record
from app.schemas import CollideRequest, RunCreateResponse
from app.services.orchestration import OrchestrationService

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/collide", status_code=202)
async def create_collision_run(payload: CollideRequest) -> RunCreateResponse:
    run = create_run_record(payload.text, payload.home_fields, payload.chaos)
    orchestration = await OrchestrationService().arun(payload.text, payload.home_fields, payload.chaos)

    run.update(
        {
            "status": orchestration["status"],
            "abstraction": orchestration["abstraction"],
            "candidates": orchestration["candidates"],
            "results": orchestration.get("results", []),
            "trace": orchestration["trace"],
            "updated_at": int(__import__("time").time()),
        }
    )
    return RunCreateResponse(run_id=run["run_id"])


@router.get("/runs/{run_id}/stream")
async def stream_run(run_id: str):
    run = get_run_record(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")

    async def event_generator():
        for trace_event in run["trace"]:
            yield f"event: {trace_event['type']}\ndata: {json.dumps(trace_event)}\n\n"

        status_event = {
            "type": "status",
            "run_id": run_id,
            "status": run["status"],
        }
        yield f"event: status\ndata: {json.dumps(status_event)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
