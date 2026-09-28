"""Hindsight adapter — the sole long-term memory layer (research.md §3-8).

Wraps the `hindsight-client` Python SDK. Business logic never imports
`hindsight_client` directly; it goes through the methods on `HindsightAdapter`.
"""

from datetime import UTC, datetime
from typing import Any

from hindsight_client import Hindsight

RETAIN_MISSION = (
    "Always extract decisions, commitments (who promised what, to whom, and any "
    "explicit deadline), concerns/objections, requirements, preferences, unresolved "
    "questions, follow-up items, important relationship context, and changes in "
    "priorities. Ignore greetings, small talk, and pure scheduling logistics."
)

OBSERVATIONS_MISSION = (
    "Identify evolving preferences, recurring concerns, and changes in priorities "
    "across meetings. Explicitly flag when new information contradicts an earlier "
    "decision, estimate, or preference (e.g., a changed timeline or budget) rather "
    "than silently replacing it."
)

MEMORY_TYPE_VALUES = [
    "decision",
    "commitment",
    "commitment_resolution",
    "concern",
    "requirement",
    "preference",
    "unresolved_question",
    "follow_up",
    "context",
    "priority_change",
    "outcome",
]

ENTITY_LABELS = [
    {
        "key": "memory_type",
        "description": "The category of durable information this fact represents.",
        "type": "value",
        "tag": True,
        "values": [{"value": v, "description": v.replace("_", " ")} for v in MEMORY_TYPE_VALUES],
    }
]


class HindsightAdapter:
    def __init__(self, base_url: str, api_key: str | None = None):
        self._client = Hindsight(base_url=base_url, api_key=api_key or None)

    def ensure_bank(self, bank_id: str) -> None:
        """Auto-create and configure a relationship's bank on first use (research.md §3, §5)."""
        self._client.create_bank(bank_id=bank_id)
        self._client.update_bank_config(
            bank_id=bank_id,
            retain_mission=RETAIN_MISSION,
            observations_mission=OBSERVATIONS_MISSION,
            entity_labels=ENTITY_LABELS,
        )

    def retain_meeting(
        self,
        bank_id: str,
        meeting_id: str,
        relationship_name: str,
        title: str,
        occurred_at: datetime,
        content: str,
        entities: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """Retain a meeting's analyzer-extracted content (research.md §4). Never raw transcript."""
        return self._client.retain(
            bank_id=bank_id,
            content=content,
            context=f"Meeting with {relationship_name} on {occurred_at.date()}: {title}",
            timestamp=occurred_at.astimezone(UTC).isoformat(),
            document_id=f"meeting-{meeting_id}",
            tags=[f"relationship:{bank_id}", f"meeting:{meeting_id}"],
            entities=entities or [],
        )

    def retain_commitment_resolution(
        self,
        bank_id: str,
        meeting_id: str,
        relationship_name: str,
        occurred_at: datetime,
        resolution_text: str,
    ) -> dict[str, Any]:
        """Retain a `memory_type:commitment_resolution` fact (research.md §6, corrected design)."""
        return self._client.retain(
            bank_id=bank_id,
            content=resolution_text,
            context=f"Commitment resolution noted in a meeting with {relationship_name} on "
            f"{occurred_at.date()}",
            timestamp=occurred_at.astimezone(UTC).isoformat(),
            document_id=f"meeting-{meeting_id}-resolutions",
            update_mode="append",
            tags=[f"relationship:{bank_id}", f"meeting:{meeting_id}"],
        )

    def recall_bounded(
        self,
        bank_id: str,
        query: str,
        max_tokens: int = 3000,
        budget: str = "mid",
    ) -> list[dict[str, Any]]:
        """Relevance/recency-ranked recall pool (research.md §7, call 1)."""
        response = self._client.recall(
            bank_id=bank_id,
            query=query,
            types=["world", "experience", "observation"],
            prefer_observations=True,
            budget=budget,
            max_tokens=max_tokens,
            query_timestamp=datetime.now(UTC).isoformat(),
        )
        return [r.model_dump() if hasattr(r, "model_dump") else dict(r) for r in response.results]

    def recall_unresolved(self, bank_id: str, max_tokens: int = 1000) -> list[dict[str, Any]]:
        """Always-included unresolved items — commitments and unresolved questions
        (research.md §7, call 2)."""
        response = self._client.recall(
            bank_id=bank_id,
            query="open commitments and unresolved issues",
            tags=["memory_type:commitment", "memory_type:unresolved_question"],
            tags_match="any_strict",
            budget="low",
            max_tokens=max_tokens,
            query_timestamp=datetime.now(UTC).isoformat(),
        )
        return [r.model_dump() if hasattr(r, "model_dump") else dict(r) for r in response.results]

    def recall_for_preparation(self, bank_id: str, query: str) -> dict[str, list[dict[str, Any]]]:
        """The two-call bounded recall from research.md §7: a relevance/recency-ranked
        pool, plus unresolved commitments/issues that are always included regardless of
        age (FR-006a). Returns a dict a Preparation Agent prompt can be built from."""
        return {
            "relevance_ranked": self.recall_bounded(bank_id, query, max_tokens=3000, budget="mid"),
            "always_included_unresolved": self.recall_unresolved(bank_id, max_tokens=1000),
            "commitment_resolutions": self.recall_commitment_resolutions(bank_id, max_tokens=2000),
        }

    def recall_commitment_resolutions(
        self, bank_id: str, max_tokens: int = 2000
    ) -> list[dict[str, Any]]:
        """All `memory_type:commitment_resolution` facts, used to pair against commitments
        (research.md §6)."""
        response = self._client.recall(
            bank_id=bank_id,
            query="commitments that have been resolved or fulfilled",
            tags=["memory_type:commitment_resolution"],
            tags_match="any_strict",
            budget="low",
            max_tokens=max_tokens,
        )
        return [r.model_dump() if hasattr(r, "model_dump") else dict(r) for r in response.results]
