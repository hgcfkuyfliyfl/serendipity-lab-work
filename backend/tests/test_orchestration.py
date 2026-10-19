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


def test_orchestration_service_ranks_only_provenanced_results(monkeypatch):
    monkeypatch.setenv("LLM_DRY_RUN", "1")

    service = OrchestrationService()
    result = service.run(
        "We need a passive mechanism that conforms to any shape and then holds firmly.",
        ["robotics"],
        0.6,
    )

    assert "results" in result
    assert result["results"]
    assert all("source_passage" in item and item["source_passage"] for item in result["results"])
    assert all("mapping" in item and item["mapping"] for item in result["results"])
    assert all(item["heresy"] in {"low", "medium", "high"} for item in result["results"])
    assert result["results"] == sorted(result["results"], key=lambda item: item["structural_score"], reverse=True)
    assert any(event["step"] == "ranking" for event in result["trace"])
