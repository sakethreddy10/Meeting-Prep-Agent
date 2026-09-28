from enum import StrEnum

from pydantic import BaseModel


class CommitmentStatus(StrEnum):
    OUTSTANDING = "outstanding"
    RESOLVED = "resolved"
    UNKNOWN = "unknown"


class Mode(StrEnum):
    STATELESS = "stateless"
    MEMORY_ENABLED = "memory_enabled"


class CitedClaim(BaseModel):
    text: str
    source_meeting_id: str | None = None
    source_meeting_title: str | None = None
    source_date: str | None = None
    category: str


class CitedCommitment(CitedClaim):
    owner: str
    deadline: str | None = None
    status: CommitmentStatus = CommitmentStatus.UNKNOWN


class ConfirmedSection(BaseModel):
    what_matters: list[CitedClaim] = []
    previous_concerns: list[CitedClaim] = []
    prior_decisions: list[CitedClaim] = []
    user_commitments: list[CitedCommitment] = []
    participant_commitments: list[CitedCommitment] = []
    unresolved_issues: list[CitedClaim] = []
    recent_changes: list[CitedClaim] = []


class SuggestedSection(BaseModel):
    talking_points: list[str] = []
    follow_up_questions: list[str] = []


class Conflict(BaseModel):
    topic: str
    earlier_claim: CitedClaim
    later_claim: CitedClaim
    recommendation: str


class PreparationBrief(BaseModel):
    mode: Mode
    relationship_summary: str | None = None
    confirmed: ConfirmedSection = ConfirmedSection()
    suggested: SuggestedSection = SuggestedSection()
    conflicts: list[Conflict] = []


class Answer(BaseModel):
    text: str
    grounded: bool
    citations: list[CitedClaim] = []


# JSON-schema shape passed to LLMProvider.generate_structured() for the Preparation Agent.
_CITED_CLAIM_SCHEMA = {
    "type": "object",
    "properties": {
        "text": {"type": "string"},
        "source_meeting_id": {"type": ["string", "null"]},
        "source_meeting_title": {"type": ["string", "null"]},
        "source_date": {"type": ["string", "null"]},
        "category": {"type": "string"},
    },
    "required": ["text", "category"],
}

_CITED_COMMITMENT_SCHEMA = {
    **_CITED_CLAIM_SCHEMA,
    "properties": {
        **_CITED_CLAIM_SCHEMA["properties"],
        "owner": {"type": "string"},
        "deadline": {"type": ["string", "null"]},
        "status": {"type": "string", "enum": ["outstanding", "resolved", "unknown"]},
    },
    "required": [*_CITED_CLAIM_SCHEMA["required"], "owner", "status"],
}

PREPARATION_RESPONSE_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "relationship_summary": {"type": ["string", "null"]},
        "confirmed": {
            "type": "object",
            "properties": {
                "what_matters": {"type": "array", "items": _CITED_CLAIM_SCHEMA},
                "previous_concerns": {"type": "array", "items": _CITED_CLAIM_SCHEMA},
                "prior_decisions": {"type": "array", "items": _CITED_CLAIM_SCHEMA},
                "user_commitments": {"type": "array", "items": _CITED_COMMITMENT_SCHEMA},
                "participant_commitments": {"type": "array", "items": _CITED_COMMITMENT_SCHEMA},
                "unresolved_issues": {"type": "array", "items": _CITED_CLAIM_SCHEMA},
                "recent_changes": {"type": "array", "items": _CITED_CLAIM_SCHEMA},
            },
            "required": [
                "what_matters",
                "previous_concerns",
                "prior_decisions",
                "user_commitments",
                "participant_commitments",
                "unresolved_issues",
                "recent_changes",
            ],
        },
        "suggested": {
            "type": "object",
            "properties": {
                "talking_points": {"type": "array", "items": {"type": "string"}},
                "follow_up_questions": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["talking_points", "follow_up_questions"],
        },
        "conflicts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string"},
                    "earlier_claim": _CITED_CLAIM_SCHEMA,
                    "later_claim": _CITED_CLAIM_SCHEMA,
                    "recommendation": {"type": "string"},
                },
                "required": ["topic", "earlier_claim", "later_claim", "recommendation"],
            },
        },
    },
    "required": ["relationship_summary", "confirmed", "suggested", "conflicts"],
}

ANSWER_RESPONSE_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "text": {"type": "string"},
        "grounded": {"type": "boolean"},
        "citations": {"type": "array", "items": _CITED_CLAIM_SCHEMA},
    },
    "required": ["text", "grounded", "citations"],
}
