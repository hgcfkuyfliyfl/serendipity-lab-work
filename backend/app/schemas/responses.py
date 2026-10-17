from pydantic import BaseModel, Field


class RunCreateResponse(BaseModel):
    run_id: str = Field(..., min_length=1)


class TraceEvent(BaseModel):
    type: str = "trace"
    step: str
    message: str
    ts: int
    meta: dict | None = None


class MappingItem(BaseModel):
    source_concept: str
    home_concept: str


class PriorArt(BaseModel):
    found: bool = False
    note: str = ""


class ResultEvent(BaseModel):
    type: str = "result"
    id: str
    title: str
    source_field: str
    structural_score: float
    heresy: str
    hypothesis: str
    source_passage: str | None = None
    mapping: list[MappingItem] = Field(default_factory=list)
    reviewer_note: str | None = None
    prior_art: PriorArt = Field(default_factory=PriorArt)
