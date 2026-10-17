from fastapi.testclient import TestClient

from app.core.run_store import create_run_record, get_run_record, transition_run_status
from app.main import app


client = TestClient(app)


def test_create_run_returns_202_and_run_id() -> None:
    payload = {
        "text": "Optimizing traffic routing through a city grid during accidents",
        "home_fields": ["civil engineering"],
        "chaos": 0.6,
    }

    response = client.post("/api/collide", json=payload)

    assert response.status_code == 202
    data = response.json()
    assert "run_id" in data
    assert isinstance(data["run_id"], str)
    assert data["run_id"]


def test_run_stream_returns_sse_events() -> None:
    payload = {
        "text": "Decentralized rerouting of flow through a network when nodes fail",
        "home_fields": ["computer science"],
        "chaos": 0.4,
    }

    create_response = client.post("/api/collide", json=payload)
    run_id = create_response.json()["run_id"]

    stream_response = client.get(f"/api/runs/{run_id}/stream")

    assert stream_response.status_code == 200
    assert "text/event-stream" in stream_response.headers.get("content-type", "")
    body = stream_response.text
    assert "trace" in body
    assert "abstracting" in body
    assert "meta" in body


def test_run_record_tracks_state_progression() -> None:
    payload = {
        "text": "Robust flow balancing in a network under disruption",
        "home_fields": ["operations research"],
        "chaos": 0.3,
    }

    create_response = client.post("/api/collide", json=payload)
    run_id = create_response.json()["run_id"]
    run = get_run_record(run_id)

    assert run is not None
    assert run["status"] == "queued"
    assert run["trace"][0]["step"] == "abstracting"
    assert "meta" in run["trace"][0]

    updated = transition_run_status(
        run_id,
        status="retrieving",
        step="retrieving",
        message="Searching related structural analogs...",
        meta={"task": "retriever", "cached": False, "attempt": 1},
    )

    assert updated is not None
    assert updated["status"] == "retrieving"
    assert updated["trace"][-1]["step"] == "retrieving"
    assert updated["trace"][-1]["meta"]["task"] == "retriever"
