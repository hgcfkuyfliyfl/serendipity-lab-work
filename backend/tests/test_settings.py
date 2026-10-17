from app.core.config.settings import Settings


def test_settings_reads_project_env_contract(monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-test-key")
    monkeypatch.setenv("OPENALEX_API_KEY", "openalex-test-key")
    monkeypatch.setenv("LLM_CACHE_ONLY", "1")
    monkeypatch.setenv("LLM_DRY_RUN", "true")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    settings = Settings()

    assert settings.gemini_api_key == "gemini-test-key"
    assert settings.openalex_api_key == "openalex-test-key"
    assert settings.llm_cache_only is True
    assert settings.llm_dry_run is True
    assert settings.allowed_home_fields == ["civil engineering"]
