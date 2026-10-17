from __future__ import annotations

import math
from typing import Any


class RetrievalService:
    """Minimal retrieval service that matches the project contract without a vector database."""

    def __init__(self, corpus: list[dict[str, Any]] | None = None) -> None:
        self.corpus = corpus or [
            {
                "id": "soft_matter_jamming_1",
                "title": "Jamming at zero temperature and zero applied stress",
                "source_field": "soft_matter_stat_physics",
                "abstract": "A disordered assembly transitions from fluid-like to rigid under confinement and packing changes.",
                "mechanism": "A phase transition in a dense granular medium changes the system from deformable to rigid.",
                "functional_problem": "A mechanism that conforms to irregular shapes with minimal sensing.",
                "constraints": ["minimal sensing", "reversible adaptation"],
            },
            {
                "id": "bio_gecko_1",
                "title": "Adhesive force of a single gecko foot-hair",
                "source_field": "organismal_bio_ecology",
                "abstract": "Strong reversible attachment emerges from microscopic contact geometry and compliance.",
                "mechanism": "Micro-scale compliance and hierarchical contact produce reversible adhesion.",
                "functional_problem": "Strong reversible attachment to arbitrary smooth surfaces without a bonding agent.",
                "constraints": ["dry adhesion", "reusability"],
            },
            {
                "id": "robotics_self_organizing",
                "title": "Self-organizing grasping control",
                "source_field": "robotics_mech_eng",
                "abstract": "A robotic hand uses local adaptation to shape and hold irregular objects.",
                "mechanism": "Local adaptation and compliance enable shape conforming contact.",
                "functional_problem": "A mechanism that conforms to irregular shapes with minimal sensing.",
                "constraints": ["minimal sensing", "shape uncertainty"],
            },
        ]

    @staticmethod
    def _text_similarity(left: str, right: str) -> float:
        left_tokens = RetrievalService._tokenize(left)
        right_tokens = RetrievalService._tokenize(right)
        if not left_tokens or not right_tokens:
            return 0.0

        left_set = set(left_tokens)
        right_set = set(right_tokens)
        overlap = len(left_set & right_set)
        return overlap / max(len(left_set | right_set), 1)

    @staticmethod
    def _tokenize(value: str) -> set[str]:
        return {token.lower() for token in value.replace("-", " ").split() if token.strip()}

    def search(self, query: str, abstraction: dict[str, Any], *, home_fields: list[str] | None = None) -> list[dict[str, Any]]:
        home_fields = set(home_fields or [])
        matches: list[dict[str, Any]] = []

        for paper in self.corpus:
            source_field = str(paper.get("source_field", "unknown"))
            if source_field in home_fields:
                continue

            problem_score = self._text_similarity(query, str(paper.get("functional_problem", "")))
            mechanism_score = self._text_similarity(str(abstraction.get("mechanism", "")), str(paper.get("mechanism", "")))
            combined = max(problem_score, mechanism_score)
            matched_on = "problem" if problem_score >= mechanism_score else "mechanism"

            matches.append(
                {
                    "id": paper["id"],
                    "title": paper["title"],
                    "source_field": source_field,
                    "structural_score": round(float(combined), 4),
                    "matched_on": matched_on,
                    "hypothesis": paper.get("abstract", ""),
                    "source_passage": paper.get("abstract", ""),
                    "mapping": [
                        {"source_concept": "local compliance", "home_concept": "conformal contact"},
                        {"source_concept": "phase transition", "home_concept": "switch from soft to rigid"},
                    ],
                    "reviewer_note": "The analogy is plausible when the system changes state under a single global control signal.",
                }
            )

        matches.sort(key=lambda item: item["structural_score"], reverse=True)
        return matches[:5]
