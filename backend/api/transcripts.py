from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from agents.meeting_analyzer import build_meeting_analyzer
from core.deps import get_hindsight_adapter, get_llm
from core.errors import InvalidMeetingInputError, UpstreamServiceError
from integrations.hindsight.client import HindsightAdapter
from integrations.llm.provider import LLMProvider
from models import db
from models.meeting import Transcript
from services import ingestion, memory_pipeline

router = APIRouter(tags=["transcripts"])


class TranscriptUpload(BaseModel):
    meeting_id: str
    transcript_text: str | None = None


@router.post("/transcripts/upload", status_code=202)
def upload_transcript(body: TranscriptUpload) -> dict:
    meeting = db.get_meeting(body.meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if body.transcript_text is None:
        raise InvalidMeetingInputError(
            "No transcript_text provided (audio upload is an optional Phase 10 enhancement)."
        )

    transcript = ingestion.normalize_pasted_text(body.meeting_id, body.transcript_text)
    db.upsert_transcript(
        {
            "meeting_id": transcript.meeting_id,
            "source": transcript.source,
            "language": transcript.language,
            "segments": [s.model_dump() for s in transcript.segments],
        }
    )
    db.update_meeting_status(body.meeting_id, transcript_status="available")
    return {"meeting_id": body.meeting_id, "transcript_status": "available"}


class ProcessRequest(BaseModel):
    meeting_id: str


@router.post("/transcripts/process")
def process_transcript(
    body: ProcessRequest,
    llm: LLMProvider = Depends(get_llm),
    hindsight: HindsightAdapter = Depends(get_hindsight_adapter),
) -> dict:
    meeting = db.get_meeting(body.meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting["transcript_status"] != "available":
        raise HTTPException(status_code=409, detail="Transcript not yet available")

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

    try:
        retain_summary = memory_pipeline.retain(
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

    retain_status = "success" if result.had_durable_content else "skipped_no_durable_content"
    return {**result.model_dump(), "retain_status": retain_status, **retain_summary}


@router.get("/meetings/{meeting_id}/transcript", response_model=Transcript)
def get_meeting_transcript(meeting_id: str) -> Transcript:
    row = db.get_transcript(meeting_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return Transcript(**row)
