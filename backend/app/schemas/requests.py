"""Request contract and the limits that bound a single call.

Typed with ``List`` rather than ``list[...]`` for the same reason as
``responses.py``: pydantic evaluates these at runtime, and the team runs a mix
of Python versions.
"""

from __future__ import annotations

from typing import List

from pydantic import BaseModel, ConfigDict, Field, field_validator

# A problem statement is a paragraph, not a book. The cap keeps a single request
# from running up the model bill or filling memory.
MAX_TEXT_CHARS = 4000
MAX_HOME_FIELDS = 8
MAX_FIELD_CHARS = 64


class CollideRequest(BaseModel):
    # Unknown keys are rejected rather than ignored, so a typo or an injected
    # field fails loudly instead of being silently dropped.
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    text: str = Field(..., min_length=1, max_length=MAX_TEXT_CHARS)
    home_fields: List[str] = Field(default_factory=list, max_length=MAX_HOME_FIELDS)
    # Accepted and ignored: the slider was cut at Hour 2. Still bounded.
    chaos: float = Field(default=0.0, ge=0.0, le=1.0)

    @field_validator("home_fields")
    @classmethod
    def _check_fields(cls, value: List[str]) -> List[str]:
        for item in value:
            if not item.strip():
                raise ValueError("home_fields entries cannot be empty")
            if len(item) > MAX_FIELD_CHARS:
                raise ValueError(f"home_fields entries cannot exceed {MAX_FIELD_CHARS} characters")
        return value
