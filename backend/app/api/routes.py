import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.run_store import create_run_record, get_run_record
from pydantic import ValidationError

from app.schemas import CollideRequest, ResultEvent, RunCreateResponse
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
        trace = run["trace"]
        # Contract order: trace events, then results, then the final "done" trace.
        for trace_event in (e for e in trace if e["step"] != "done"):
            yield f"event: {trace_event['type']}\ndata: {json.dumps(trace_event)}\n\n"

        for raw in run.get("results", []):
            try:
                result = ResultEvent(**raw)
            except ValidationError:
                # Drop rule: anything that fails the contract (no passage, no mapping) is never shown.
                continue
            yield f"event: result\ndata: {result.model_dump_json()}\n\n"

        for trace_event in (e for e in trace if e["step"] == "done"):
            yield f"event: {trace_event['type']}\ndata: {json.dumps(trace_event)}\n\n"

        status_event = {
            "type": "status",
            "run_id": run_id,
            "status": run["status"],
        }
        yield f"event: status\ndata: {json.dumps(status_event)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
