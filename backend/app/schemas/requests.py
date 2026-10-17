from pydantic import BaseModel, Field


class CollideRequest(BaseModel):
    text: str = Field(..., min_length=1)
    home_fields: list[str] = Field(default_factory=list)
    chaos: float = Field(default=0.0, ge=0.0, le=1.0)
