from __future__ import annotations

import os
from dataclasses import dataclass, field


def _get_bool_env(name: str) -> bool:
    value = os.getenv(name, "").strip().lower()
    return value in {"1", "true", "yes", "on"}


@dataclass
class Settings:
    """Application settings derived from the project environment template in .env.example."""

    app_name: str = "serendipity-lab"
    environment: str = field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    # Off unless DEBUG is explicitly switched on. Debug output in production leaks
    # paths, settings and stack traces to anyone who can trigger an error.
    debug: bool = field(default_factory=lambda: _get_bool_env("DEBUG"))
    chroma_collection: str = "serendipity_abstractions"
    max_retries: int = 3
    timeout_seconds: int = 30
    allowed_home_fields: list[str] = field(default_factory=lambda: ["civil engineering"])

    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", os.getenv("ANTHROPIC_API_KEY", "")))
    anthropic_api_key: str = field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", os.getenv("GEMINI_API_KEY", "")))
    openalex_api_key: str = field(default_factory=lambda: os.getenv("OPENALEX_API_KEY", ""))
    llm_cache_only: bool = field(default_factory=lambda: _get_bool_env("LLM_CACHE_ONLY"))
    llm_dry_run: bool = field(default_factory=lambda: _get_bool_env("LLM_DRY_RUN"))


settings = Settings()
