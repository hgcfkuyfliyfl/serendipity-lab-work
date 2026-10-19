from app.services.orchestration import OrchestrationService


def test_orchestration_service_abstracts_and_returns_trace(monkeypatch):
    monkeypatch.setenv("LLM_DRY_RUN", "1")

    service = OrchestrationService()
    result = service.run(
        "We need a passive mechanism that conforms to any shape and then holds firmly.",
        ["robotics"],
        0.6,
    )

    assert result["status"] == "completed"
    assert result["text"]
    assert result["home_fields"] == ["robotics"]
    assert "abstraction" in result
    assert result["trace"]
    assert any(event["step"] == "abstracting" for event in result["trace"])
    assert any(event["step"] == "done" for event in result["trace"])


def test_orchestration_service_reviews_candidates_and_builds_translations(monkeypatch):
    monkeypatch.setenv("LLM_DRY_RUN", "1")

    service = OrchestrationService()
    result = service.run(
        "We need a passive mechanism that conforms to any shape and then holds firmly.",
        ["robotics"],
        0.6,
    )

    assert "decomposition" in result
    assert result["decomposition"]["queries"]
    assert "reviewed_candidates" in result
    assert result["reviewed_candidates"]
    assert "translations" in result
    assert result["translations"]
    assert any(event["step"] == "reviewing" for event in result["trace"])
    assert any(event["step"] == "translating" for event in result["trace"])
