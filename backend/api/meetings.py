import uuid

from fastapi import APIRouter, Depends, HTTPException

from core.deps import get_hindsight_adapter
from core.errors import UpstreamServiceError
from integrations.hindsight.client import HindsightAdapter
from models import db
from models.meeting import InputMode, Meeting, MeetingCreate
from services import relationship_service

router = APIRouter(tags=["meetings"])


@router.post("/meetings", response_model=Meeting, status_code=201)
def create_meeting(
    body: MeetingCreate,
    hindsight: HindsightAdapter = Depends(get_hindsight_adapter),
) -> Meeting:
    try:
        relationship = relationship_service.get_or_create(body.relationship_name, hindsight)
    except Exception as exc:  # Hindsight bank auto-creation failed
        raise UpstreamServiceError(
            "hindsight_unavailable", "Could not create or reach the relationship's memory bank."
        ) from exc

    meeting_id = str(uuid.uuid4())
    meeting = Meeting(
        id=meeting_id,
        relationship_id=relationship.id,
        calendar_event_id=body.calendar_event_id,
        meet_conference_id=body.meet_conference_id,
        title=body.title,
        occurred_at=body.occurred_at,
        participants=body.participants,
        input_mode=InputMode.TRANSCRIPT_PASTE,
    )
    db.insert_meeting(
        {
            "id": meeting.id,
            "relationship_id": meeting.relationship_id,
            "calendar_event_id": meeting.calendar_event_id,
            "meet_conference_id": meeting.meet_conference_id,
            "title": meeting.title,
            "occurred_at": meeting.occurred_at.isoformat(),
            "participants": [p.model_dump() for p in meeting.participants],
            "input_mode": meeting.input_mode.value,
        }
    )
    relationship_service.increment_meeting_count(relationship.id)
    return meeting


@router.get("/meetings/{meeting_id}", response_model=Meeting)
def get_meeting(meeting_id: str) -> Meeting:
    row = db.get_meeting(meeting_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return Meeting(**row)
