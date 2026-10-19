"""Frozen response contract.

Typed with ``Optional``/``List`` rather than ``X | None`` on purpose: pydantic
evaluates these annotations at runtime, and the newer syntax raises a TypeError
on Python 3.9, which some of the team still run.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

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
TRACE_STEPS = frozenset(TraceStep.__args__)  # type: ignore[attr-defined]


class RunCreateResponse(BaseModel):
    run_id: str = Field(..., min_length=1)


class TraceEvent(BaseModel):
    type: Literal["trace"] = "trace"
    step: TraceStep
    message: str
    ts: int
    meta: Optional[Dict[str, Any]] = None


class MappingItem(BaseModel):
    source_concept: str = Field(..., min_length=1)
    home_concept: str = Field(..., min_length=1)


class ResultEvent(BaseModel):
    """A single result. ``prior_art`` is cut and must not appear here.

    The drop rule is enforced by validation: a result without a source passage
    or without at least one mapping item cannot be built, so it is never shown.
    """

    type: Literal["result"] = "result"
    id: str
    title: str
    year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    source_field: str
    structural_score: float = Field(..., ge=0.0, le=1.0)
    matched_on: Literal["problem", "mechanism"] = "problem"
    heresy: Literal["low", "medium", "high"]
    hypothesis: str
    source_passage: str = Field(..., min_length=1)
    mapping: List[MappingItem] = Field(..., min_length=1)
    reviewer_note: str
