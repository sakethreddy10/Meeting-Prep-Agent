"""Normalizes paste/notes input into Transcript/TranscriptSegment (FR-021)."""

from core.errors import InvalidMeetingInputError
from models.meeting import Transcript, TranscriptSegment


def normalize_pasted_text(meeting_id: str, raw_text: str) -> Transcript:
    if not raw_text or not raw_text.strip():
        raise InvalidMeetingInputError("No usable meeting content was found in the submitted text.")

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    if not lines:
        raise InvalidMeetingInputError("No usable meeting content was found in the submitted text.")

    segments = [
        TranscriptSegment(speaker_id="notes", speaker_name=None, text=line)
        for line in lines
    ]
    return Transcript(meeting_id=meeting_id, source="paste", segments=segments)
