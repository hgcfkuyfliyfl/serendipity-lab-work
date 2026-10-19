import json
from pathlib import Path

import pytest

from app.core.llm_gateway import LLMFailure, LLMGateway


class FakeProvider:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = 0

    def generate(self, *, task, prompt, schema, inputs):
        self.calls += 1
        if not self.responses:
            raise AssertionError("No fake response left")
        response = self.responses.pop(0)
        if callable(response):
            return response(task=task, prompt=prompt, schema=schema, inputs=inputs)
        return response


def _valid_abstraction_payload():
    return {
        "functional_problem": "A mechanism that adapts to irregular shapes with minimal sensing.",
        "constraints": ["low complexity", "reversible attachment"],
        "mechanism": "Local compliance changes a flexible surface into a stable holding state.",
        "domain_tags": ["robotics", "mechanical design"],
    }


def test_gateway_uses_cache_on_second_identical_call(tmp_path, monkeypatch):
    monkeypatch.setenv("LLM_CACHE_ONLY", "")
    payload = _valid_abstraction_payload()
    provider = FakeProvider([payload])
    gateway = LLMGateway(
        models_cfg=str(Path(__file__).resolve().parents[2] / "config" / "models.yaml"),
        cache_path=str(tmp_path / "llm_cache.sqlite"),
        provider=provider,
    )

    first = gateway.run("abstractor", {"text": "We need a passive mechanism that conforms to any shape."})
    second = gateway.run("abstractor", {"text": "We need a passive mechanism that conforms to any shape."})

    assert first.cached is False
    assert second.cached is True
    assert provider.calls == 1
    assert second.data == payload


def test_gateway_retries_validation_failures_then_succeeds(tmp_path):
    provider = FakeProvider([
        {"functional_problem": "bad", "constraints": [], "mechanism": "bad", "domain_tags": []},
        _valid_abstraction_payload(),
    ])
    gateway = LLMGateway(
        models_cfg=str(Path(__file__).resolve().parents[2] / "config" / "models.yaml"),
        cache_path=str(tmp_path / "llm_cache.sqlite"),
        provider=provider,
    )

    result = gateway.run("abstractor", {"text": "Need an adaptive grasping mechanism."})

    assert result.cached is False
    assert result.attempts == 2
    assert provider.calls == 2
    assert result.data["functional_problem"] == _valid_abstraction_payload()["functional_problem"]


def test_cache_only_mode_raises_without_provider_call(tmp_path, monkeypatch):
    monkeypatch.setenv("LLM_CACHE_ONLY", "1")
    provider = FakeProvider([_valid_abstraction_payload()])
    gateway = LLMGateway(
        models_cfg=str(Path(__file__).resolve().parents[2] / "config" / "models.yaml"),
        cache_path=str(tmp_path / "llm_cache.sqlite"),
        provider=provider,
    )

    with pytest.raises(LLMFailure, match="cache_only_miss"):
        gateway.run("abstractor", {"text": "Need a passive conformal grip."})

    assert provider.calls == 0


def test_missing_api_key_falls_back_to_dry_run(monkeypatch, tmp_path):
    monkeypatch.delenv("LLM_DRY_RUN", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    gateway = LLMGateway(
        models_cfg=str(Path(__file__).resolve().parents[2] / "config" / "models.yaml"),
        cache_path=str(tmp_path / "llm_cache.sqlite"),
    )

    result = gateway.run("abstractor", {"text": "Need a passive conformal grip."})

    assert result.cached is False
    assert result.usage == {"dry_run": True}
    assert result.data["functional_problem"]
