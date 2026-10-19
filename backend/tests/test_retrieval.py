from app.services.retrieval import RetrievalService


def test_retrieval_service_returns_home_field_filtered_candidates():
    service = RetrievalService()
    candidates = service.search(
        "A mechanism that conforms to irregular shapes with minimal sensing.",
        {
            "functional_problem": "A mechanism that conforms to irregular shapes with minimal sensing.",
            "constraints": ["minimal sensing", "low complexity"],
            "mechanism": "Local compliance changes a flexible surface into a stable holding state.",
            "domain_tags": ["robotics"],
        },
        home_fields=["robotics"],
    )

    assert len(candidates) >= 1
    assert all(item["source_field"] not in {"robotics"} for item in candidates)
    assert all("structural_score" in item for item in candidates)
    assert all(item["matched_on"] in {"problem", "mechanism"} for item in candidates)
