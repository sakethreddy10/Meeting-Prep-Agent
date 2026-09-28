from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class ParticipantRole(StrEnum):
    USER = "user"
    OTHER = "other"


class ResolutionConfidence(StrEnum):
    CONFIRMED = "confirmed"
    UNRESOLVED = "unresolved"


class Participant(BaseModel):
    speaker_id: str
    display_name: str = "Unknown"
    role: ParticipantRole = ParticipantRole.OTHER
    resolution_confidence: ResolutionConfidence = ResolutionConfidence.UNRESOLVED


class TranscriptStatus(StrEnum):
    PENDING = "pending"
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    PROCESSING = "processing"
    FAILED = "failed"


class AnalysisStatus(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class InputMode(StrEnum):
    MEET_TRANSCRIPT = "meet_transcript"
    RECORDING_UPLOAD = "recording_upload"
    TRANSCRIPT_PASTE = "transcript_paste"
    LIVE_TRANSCRIPTION = "live_transcription"


class MeetingCreate(BaseModel):
    relationship_name: str
    title: str
    occurred_at: datetime
    calendar_event_id: str | None = None
    meet_conference_id: str | None = None
    participants: list[Participant] = []


class Meeting(BaseModel):
    id: str
    relationship_id: str
    calendar_event_id: str | None = None
    meet_conference_id: str | None = None
    title: str
    occurred_at: datetime
    participants: list[Participant] = []
    input_mode: InputMode
    transcript_status: TranscriptStatus = TranscriptStatus.PENDING
    analysis_status: AnalysisStatus = AnalysisStatus.NOT_STARTED
    raw_input_ref: str | None = None


class TranscriptSegment(BaseModel):
    speaker_id: str
    speaker_name: str | None = None
    start_time: float | None = None
    end_time: float | None = None
    text: str
    confidence: float | None = None


class Transcript(BaseModel):
    meeting_id: str
    source: str
    language: str | None = None
    segments: list[TranscriptSegment] = []
