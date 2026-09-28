from enum import StrEnum

from pydantic import BaseModel

MEMORY_CATEGORIES = [
    "decision",
    "commitment",
    "concern",
    "requirement",
    "preference",
    "unresolved_question",
    "follow_up",
    "context",
    "priority_change",
    "outcome",
]


class MemoryCandidate(BaseModel):
    category: str
    text: str
    speaker: str = "Unknown"
    owner: str | None = None
    deadline: str | None = None


class ResolutionKind(StrEnum):
    RESOLVED = "resolved"
    NO_LONGER_RELEVANT = "no_longer_relevant"


class CommitmentResolutionSignal(BaseModel):
    matched_commitment_hint: str
    resolution: ResolutionKind
    evidence_text: str


class AnalysisResult(BaseModel):
    meeting_id: str
    items: list[MemoryCandidate] = []
    commitment_resolutions: list[CommitmentResolutionSignal] = []
    had_durable_content: bool = False


# JSON-schema shape passed to LLMProvider.generate_structured() for the Meeting Analyzer.
ANALYSIS_RESPONSE_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": MEMORY_CATEGORIES},
                    "text": {"type": "string"},
                    "speaker": {"type": "string"},
                    "owner": {"type": ["string", "null"]},
                    "deadline": {"type": ["string", "null"]},
                },
                "required": ["category", "text", "speaker"],
            },
        },
        "commitment_resolutions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "matched_commitment_hint": {"type": "string"},
                    "resolution": {"type": "string", "enum": ["resolved", "no_longer_relevant"]},
                    "evidence_text": {"type": "string"},
                },
                "required": ["matched_commitment_hint", "resolution", "evidence_text"],
            },
        },
        "had_durable_content": {"type": "boolean"},
    },
    "required": ["items", "commitment_resolutions", "had_durable_content"],
}
