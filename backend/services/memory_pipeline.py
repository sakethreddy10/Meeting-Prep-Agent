"""Orchestrates meeting analysis, Hindsight retention, and preparation (US1, US2, US4).

analyze(): ingestion -> Meeting Analyzer -> AnalysisResult
retain(): AnalysisResult -> redaction -> hindsight.retain_meeting(...) (+ any
          commitment-resolution facts, per the corrected research.md §6 design)
prepare(): recall -> Preparation Agent -> PreparationBrief
"""

from agents.base import StructuredAgent
from agents.meeting_analyzer import analyze_transcript
from agents.preparation_agent import answer_question, generate_brief
from integrations.hindsight.client import HindsightAdapter
from models import db
from models.analysis import AnalysisResult
from models.meeting import Transcript
from models.preparation import Answer, Mode, PreparationBrief
from services.redaction import redact_text
from services.relationship_service import get_by_id


def analyze(
    meeting_analyzer: StructuredAgent, meeting_id: str, transcript: Transcript
) -> AnalysisResult:
    db.update_meeting_status(meeting_id, analysis_status="in_progress")
    try:
        result = analyze_transcript(meeting_analyzer, meeting_id, transcript)
    except Exception:
        db.update_meeting_status(meeting_id, analysis_status="failed")
        raise
    db.update_meeting_status(meeting_id, analysis_status="completed")
    return result


def _build_retain_content(result: AnalysisResult) -> str:
    """Build the normalized, attributed content string for retain (research.md §4) —
    the analyzer's structured output, not the raw transcript, and never a flattened
    single-sentence summary."""
    lines = []
    for item in result.items:
        prefix = f"[{item.category}]"
        if item.category == "commitment":
            owner = item.owner or "an unspecified participant"
            deadline = f" (deadline: {item.deadline})" if item.deadline else ""
            lines.append(f"{prefix} {owner} committed: {item.text}{deadline}")
        else:
            lines.append(f"{prefix} {item.speaker}: {item.text}")
    return redact_text("\n".join(lines))


def retain(
    hindsight: HindsightAdapter,
    meeting_id: str,
    relationship_id: str,
    meeting_title: str,
    occurred_at,
    result: AnalysisResult,
) -> dict:
    relationship = get_by_id(relationship_id)
    if relationship is None:
        raise ValueError(f"Unknown relationship: {relationship_id}")

    retained_item_count = 0
    if result.had_durable_content and result.items:
        content = _build_retain_content(result)
        entities = [{"text": relationship.name, "type": "PERSON"}]
        if relationship.organization:
            entities.append({"text": relationship.organization, "type": "ORG"})
        hindsight.retain_meeting(
            bank_id=relationship.bank_id,
            meeting_id=meeting_id,
            relationship_name=relationship.name,
            title=meeting_title,
            occurred_at=occurred_at,
            content=content,
            entities=entities,
        )
        retained_item_count = len(result.items)

    resolved_commitment_count = 0
    for signal in result.commitment_resolutions:
        resolution_text = (
            f"Commitment resolution: the commitment described as "
            f"'{signal.matched_commitment_hint}' is now {signal.resolution.value}. "
            f"Evidence: {signal.evidence_text}"
        )
        hindsight.retain_commitment_resolution(
            bank_id=relationship.bank_id,
            meeting_id=meeting_id,
            relationship_name=relationship.name,
            occurred_at=occurred_at,
            resolution_text=redact_text(resolution_text),
        )
        resolved_commitment_count += 1

    return {
        "retained_item_count": retained_item_count,
        "resolved_commitment_count": resolved_commitment_count,
    }


_EMPTY_RECALL: dict[str, list[dict]] = {
    "relevance_ranked": [],
    "always_included_unresolved": [],
    "commitment_resolutions": [],
}


def _recall_for_mode(
    hindsight: HindsightAdapter, bank_id: str, mode: Mode, query: str
) -> dict[str, list[dict]]:
    if mode == Mode.STATELESS:
        return dict(_EMPTY_RECALL)
    return hindsight.recall_for_preparation(bank_id, query=query)


def prepare(
    hindsight: HindsightAdapter,
    preparation_agent: StructuredAgent,
    relationship_id: str,
    meeting_title: str,
    mode: Mode,
    current_meeting_context: str = "",
) -> PreparationBrief:
    """FR-005/006/006a/007: recall bounded, relevance-ranked memory (skipped
    entirely in stateless mode, per research.md §9) and generate the brief."""
    relationship = get_by_id(relationship_id)
    if relationship is None:
        raise ValueError(f"Unknown relationship: {relationship_id}")

    recalled = _recall_for_mode(
        hindsight, relationship.bank_id, mode, f"Prepare me for a meeting titled '{meeting_title}'"
    )

    # FR-016: when there is genuinely no history for this relationship, say so
    # deterministically — skip the LLM call entirely rather than relying on the
    # prompt alone, since there is nothing for it to reason over anyway.
    if mode == Mode.MEMORY_ENABLED and not any(recalled.values()):
        return PreparationBrief(
            mode=mode,
            relationship_summary=(
                "No historical information is available for this relationship yet — "
                "this will be the first recorded meeting."
            ),
        )

    context = current_meeting_context or f"Preparing for an upcoming meeting: {meeting_title}"
    return generate_brief(preparation_agent, mode, recalled, context)


def answer(
    hindsight: HindsightAdapter,
    answer_agent: StructuredAgent,
    relationship_id: str,
    mode: Mode,
    question: str,
) -> Answer:
    """FR-019: answer a free-form relationship-continuity question, grounded in
    recalled memory. Deterministically ungrounded when there is no history at all,
    for the same reason as `prepare()`'s no-history shortcut."""
    relationship = get_by_id(relationship_id)
    if relationship is None:
        raise ValueError(f"Unknown relationship: {relationship_id}")

    recalled = _recall_for_mode(hindsight, relationship.bank_id, mode, question)

    if mode == Mode.MEMORY_ENABLED and not any(recalled.values()):
        return Answer(
            text="I don't have enough information to answer that yet — no meetings are on "
            "record for this relationship.",
            grounded=False,
            citations=[],
        )

    return answer_question(answer_agent, recalled, question)
