"""A paper must appear at most once in a run's results."""

from app.services.orchestration import OrchestrationService

TEXT = "A passive mechanism that conforms to any shape and then holds firmly."


def test_each_paper_appears_once(monkeypatch) -> None:
    monkeypatch.setenv("LLM_DRY_RUN", "1")
    run = OrchestrationService().run(TEXT, ["robotics_mech_eng"], 0.0)

    ids = [item["id"] for item in run["results"]]
    assert ids, "the dry-run corpus should return at least one grounded result"
    assert len(ids) == len(set(ids))


def test_each_candidate_is_reviewed_once(monkeypatch) -> None:
    monkeypatch.setenv("LLM_DRY_RUN", "1")
    run = OrchestrationService().run(TEXT, ["robotics_mech_eng"], 0.0)

    reviewed = [item["id"] for item in run["reviewed_candidates"]]
    assert len(reviewed) == len(set(reviewed))
