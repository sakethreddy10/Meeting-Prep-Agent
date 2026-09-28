from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from agents.meeting_analyzer import build_meeting_analyzer
from core.deps import get_hindsight_adapter, get_llm
from core.errors import InvalidMeetingInputError, UpstreamServiceError
from integrations.hindsight.client import HindsightAdapter
from integrations.llm.provider import LLMProvider
from models import db
from models.analysis import AnalysisResult
from models.meeting import Transcript
from services import memory_pipeline
from services.commitment_matching import is_resolved as commitment_is_resolved
from services.relationship_service import get_by_id

router = APIRouter(tags=["memory"])


class MeetingIdBody(BaseModel):
    meeting_id: str


@router.post("/memory/preview", response_model=AnalysisResult)
def preview_memory(
    body: MeetingIdBody,
    llm: LLMProvider = Depends(get_llm),
) -> AnalysisResult:
    """FR-025: show what would be extracted and retained, without committing it yet."""
    meeting = db.get_meeting(body.meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    transcript_row = db.get_transcript(body.meeting_id)
    if transcript_row is None:
        raise InvalidMeetingInputError("No transcript found for this meeting.")
    transcript = Transcript(**transcript_row)

    analyzer = build_meeting_analyzer(llm)
    try:
        result = memory_pipeline.analyze(analyzer, body.meeting_id, transcript)
    except InvalidMeetingInputError:
        raise
    except Exception as exc:
        raise UpstreamServiceError(
            "llm_unavailable", "The meeting analyzer could not complete extraction."
        ) from exc

    db.save_last_analysis(body.meeting_id, result.model_dump_json())
    return result


@router.post("/memory/retain")
def retain_memory(
    body: MeetingIdBody,
    hindsight: HindsightAdapter = Depends(get_hindsight_adapter),
) -> dict:
    meeting = db.get_meeting(body.meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    cached = db.load_last_analysis(body.meeting_id)
    if cached is None:
        raise HTTPException(
            status_code=409,
            detail="No previewed/analyzed result found for this meeting; call "
            "/api/memory/preview or /api/transcripts/process first.",
        )
    result = AnalysisResult.model_validate_json(cached)

    try:
        summary = memory_pipeline.retain(
            hindsight,
            meeting_id=body.meeting_id,
            relationship_id=meeting["relationship_id"],
            meeting_title=meeting["title"],
            occurred_at=datetime.fromisoformat(meeting["occurred_at"]),
            result=result,
        )
    except Exception as exc:
        raise UpstreamServiceError(
            "hindsight_unavailable", "Memory could not be stored for this meeting."
        ) from exc

    return summary


@router.get("/relationships/{relationship_id}/memory")
def get_relationship_memory(
    relationship_id: str,
    category: str | None = Query(default=None),
    status: str | None = Query(default=None),
    hindsight: HindsightAdapter = Depends(get_hindsight_adapter),
) -> list[dict]:
    relationship = get_by_id(relationship_id)
    if relationship is None:
        raise HTTPException(status_code=404, detail="Relationship not found")

    try:
        facts = hindsight.recall_bounded(
            relationship.bank_id,
            query="everything remembered about this relationship",
            max_tokens=4000,
        )
        resolutions = hindsight.recall_commitment_resolutions(relationship.bank_id)
    except Exception as exc:
        raise UpstreamServiceError(
            "hindsight_unavailable", "Could not retrieve this relationship's memory."
        ) from exc

    resolution_texts = [r["text"] for r in resolutions]

    items = []
    for fact in facts:
        tags = fact.get("tags") or []
        fact_category = next(
            (t.split(":", 1)[1] for t in tags if t.startswith("memory_type:")), "context"
        )
        if fact_category == "commitment_resolution":
            continue
        if category and fact_category != category:
            continue

        item_status = None
        if fact_category == "commitment":
            resolved = commitment_is_resolved(fact["text"], resolution_texts)
            item_status = "resolved" if resolved else "outstanding"
            if status and item_status != status:
                continue

        meeting_tag = next((t for t in tags if t.startswith("meeting:")), None)
        source_meeting_id = meeting_tag.split(":", 1)[1] if meeting_tag else None
        source_meeting = db.get_meeting(source_meeting_id) if source_meeting_id else None

        items.append(
            {
                "id": fact["id"],
                "category": fact_category,
                "text": fact["text"],
                "source_meeting_id": source_meeting_id,
                "source_meeting_title": source_meeting["title"] if source_meeting else None,
                "occurred_at": fact.get("occurred_start") or fact.get("mentioned_at"),
                "status": item_status,
            }
        )
    return items
