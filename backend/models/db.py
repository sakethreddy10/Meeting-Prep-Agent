"""Application-bookkeeping SQLite schema and connection helper.

This stores only Relationship/Meeting/Transcript bookkeeping rows (data-model.md
"Application-State Entities"). Durable memory content itself lives in Hindsight,
never here (see integrations/hindsight/client.py).
"""

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from core.config import get_settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    organization TEXT,
    bank_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    meeting_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    relationship_id TEXT NOT NULL REFERENCES relationships(id),
    calendar_event_id TEXT,
    meet_conference_id TEXT,
    title TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    participants_json TEXT NOT NULL DEFAULT '[]',
    input_mode TEXT NOT NULL,
    transcript_status TEXT NOT NULL DEFAULT 'pending',
    analysis_status TEXT NOT NULL DEFAULT 'not_started',
    raw_input_ref TEXT,
    last_analysis_json TEXT
);

CREATE TABLE IF NOT EXISTS transcripts (
    meeting_id TEXT PRIMARY KEY REFERENCES meetings(id),
    source TEXT NOT NULL,
    language TEXT,
    segments_json TEXT NOT NULL DEFAULT '[]'
);
"""


@contextmanager
def get_connection():
    settings = get_settings()
    db_path = Path(settings.database_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript(SCHEMA)


def row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    for key in ("participants_json", "segments_json"):
        if key in d and d[key] is not None:
            d[key.removesuffix("_json")] = json.loads(d.pop(key))
    return d


# --- Meeting repository helpers -------------------------------------------------


def insert_meeting(meeting: dict) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO meetings (id, relationship_id, calendar_event_id, meet_conference_id, "
            "title, occurred_at, participants_json, input_mode, transcript_status, "
            "analysis_status, raw_input_ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                meeting["id"],
                meeting["relationship_id"],
                meeting.get("calendar_event_id"),
                meeting.get("meet_conference_id"),
                meeting["title"],
                meeting["occurred_at"],
                json.dumps(meeting.get("participants", [])),
                meeting["input_mode"],
                meeting.get("transcript_status", "pending"),
                meeting.get("analysis_status", "not_started"),
                meeting.get("raw_input_ref"),
            ),
        )


def get_meeting(meeting_id: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
    if row is None:
        return None
    meeting = row_to_dict(row)
    meeting.pop("last_analysis_json", None)
    return meeting


def save_last_analysis(meeting_id: str, analysis_json: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE meetings SET last_analysis_json = ? WHERE id = ?", (analysis_json, meeting_id)
        )


def load_last_analysis(meeting_id: str) -> str | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT last_analysis_json FROM meetings WHERE id = ?", (meeting_id,)
        ).fetchone()
    return row["last_analysis_json"] if row else None


def update_meeting_status(
    meeting_id: str,
    transcript_status: str | None = None,
    analysis_status: str | None = None,
) -> None:
    fields, values = [], []
    if transcript_status is not None:
        fields.append("transcript_status = ?")
        values.append(transcript_status)
    if analysis_status is not None:
        fields.append("analysis_status = ?")
        values.append(analysis_status)
    if not fields:
        return
    values.append(meeting_id)
    with get_connection() as conn:
        conn.execute(f"UPDATE meetings SET {', '.join(fields)} WHERE id = ?", values)


def upsert_transcript(transcript: dict) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO transcripts (meeting_id, source, language, segments_json) "
            "VALUES (?, ?, ?, ?) "
            "ON CONFLICT(meeting_id) DO UPDATE SET source=excluded.source, "
            "language=excluded.language, segments_json=excluded.segments_json",
            (
                transcript["meeting_id"],
                transcript["source"],
                transcript.get("language"),
                json.dumps(transcript.get("segments", [])),
            ),
        )


def get_transcript(meeting_id: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM transcripts WHERE meeting_id = ?", (meeting_id,)
        ).fetchone()
    return row_to_dict(row) if row else None
