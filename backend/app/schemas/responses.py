from typing import Literal

from pydantic import BaseModel, Field

TraceStep = Literal[
    "abstracting",
    "decomposing",
    "retrieving",
    "reviewing",
    "rewriting",
    "translating",
    "ranking",
    "llm_retry",
    "cache_hit",
    "done",
]
TRACE_STEPS: frozenset[str] = frozenset(TraceStep.__args__)  # type: ignore[attr-defined]


class RunCreateResponse(BaseModel):
    run_id: str = Field(..., min_length=1)


class TraceEvent(BaseModel):
    type: Literal["trace"] = "trace"
    step: TraceStep
    message: str
    ts: int
    meta: dict | None = None


class MappingItem(BaseModel):
    source_concept: str = Field(..., min_length=1)
    home_concept: str = Field(..., min_length=1)


class ResultEvent(BaseModel):
    """Frozen result contract. `prior_art` is cut and must not appear here.

    The drop rule is enforced by validation: a result without a source passage
    or without at least one mapping item cannot be built, so it is never shown.
    """

    type: Literal["result"] = "result"
    id: str
    title: str
    year: int | None = None
    venue: str | None = None
    doi: str | None = None
    source_field: str
    structural_score: float = Field(..., ge=0.0, le=1.0)
    matched_on: Literal["problem", "mechanism"] = "problem"
    heresy: Literal["low", "medium", "high"]
    hypothesis: str
    source_passage: str = Field(..., min_length=1)
    mapping: list[MappingItem] = Field(..., min_length=1)
    reviewer_note: str
