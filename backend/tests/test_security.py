"""Checks on the limits that keep one caller from spending everyone's quota."""

import pytest
from fastapi.testclient import TestClient

from app.core import rate_limit
from app.core.run_store import MAX_RUNS, RUN_STORE, create_run_record
from app.main import app
from app.schemas.requests import MAX_TEXT_CHARS

client = TestClient(app)

GOOD = {"text": "A mechanism that is compliant and then rigid.", "home_fields": ["robotics_mech_eng"]}


@pytest.fixture(autouse=True)
def _dry_run(monkeypatch):
    monkeypatch.setenv("LLM_DRY_RUN", "1")


def test_oversized_text_is_rejected() -> None:
    response = client.post("/api/collide", json={**GOOD, "text": "x" * (MAX_TEXT_CHARS + 1)})
    assert response.status_code == 422


def test_empty_text_is_rejected() -> None:
    assert client.post("/api/collide", json={**GOOD, "text": "   "}).status_code == 422


def test_unknown_fields_are_rejected() -> None:
    response = client.post("/api/collide", json={**GOOD, "is_admin": True})
    assert response.status_code == 422


def test_too_many_home_fields_are_rejected() -> None:
    response = client.post("/api/collide", json={**GOOD, "home_fields": [f"f{i}" for i in range(20)]})
    assert response.status_code == 422


def test_overlong_home_field_is_rejected() -> None:
    response = client.post("/api/collide", json={**GOOD, "home_fields": ["f" * 200]})
    assert response.status_code == 422


def test_chaos_outside_the_range_is_rejected() -> None:
    assert client.post("/api/collide", json={**GOOD, "chaos": 9.9}).status_code == 422


def test_rate_limit_returns_429_with_retry_after(monkeypatch) -> None:
    monkeypatch.setattr(rate_limit, "MAX_REQUESTS", 3)
    rate_limit.reset()

    for _ in range(3):
        assert client.post("/api/collide", json=GOOD).status_code == 202

    blocked = client.post("/api/collide", json=GOOD)
    assert blocked.status_code == 429
    assert blocked.headers.get("Retry-After")


def test_run_store_does_not_grow_without_bound() -> None:
    RUN_STORE.clear()
    for _ in range(MAX_RUNS + 25):
        create_run_record("text", ["robotics_mech_eng"], 0.0)
    assert len(RUN_STORE) <= MAX_RUNS
    RUN_STORE.clear()


def test_run_ids_are_not_guessable() -> None:
    RUN_STORE.clear()
    first = create_run_record("a", [], 0.0)["run_id"]
    second = create_run_record("a", [], 0.0)["run_id"]
    assert first != second
    # A bare counter or timestamp would be short and predictable.
    assert len(first.rsplit("_", 1)[-1]) >= 8
    RUN_STORE.clear()


def test_unknown_run_id_is_a_404_not_a_leak() -> None:
    response = client.get("/api/runs/run_does_not_exist/stream")
    assert response.status_code == 404
    assert "Traceback" not in response.text


def test_debug_is_off_unless_switched_on(monkeypatch) -> None:
    monkeypatch.delenv("DEBUG", raising=False)
    import importlib

    import app.core.config.settings as settings_module

    importlib.reload(settings_module)
    assert settings_module.settings.debug is False
