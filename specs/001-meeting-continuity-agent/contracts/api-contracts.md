# API Contracts: Meeting Continuity Agent

**Feature**: [spec.md](../spec.md) | **Data Model**: [data-model.md](../data-model.md)

All endpoints are served by the FastAPI backend, validated with Pydantic models. Types below are
described in Pydantic-equivalent shorthand (not code) per the planning-phase "no implementation"
rule. All third-party secrets (Google, Sarvam, Groq/Foundry, Hindsight API key) stay server-side;
none are ever sent to or readable by the React frontend (stack instructions §3, §16).

## Calendar

### `GET /api/calendar/upcoming`

Lists upcoming Google Calendar events for the connected account, annotated with any associated
Google Meet conference.

**Response 200** — `list[UpcomingEvent]`:
```
UpcomingEvent:
  calendar_event_id: str
  title: str
  start: datetime
  end: datetime
  organizer: str
  attendees: list[str]
  meet_conference_id: str | null
  relationship_id: str | null   # resolved if attendees match an existing Relationship name
```

**Errors**: `401` (OAuth not connected/expired — see Security), `502` (Calendar API failure; body
carries `{"error": "calendar_unavailable"}` so the UI can offer manual meeting entry instead, per
FR fallback requirements).

### `POST /api/calendar/sync`

Triggers a manual re-sync of upcoming events (in addition to any webhook-driven sync).

**Response 200**: `{"synced_count": int}`

**Errors**: `401`, `502` (same as above).

## Meetings

### `POST /api/meetings`

Creates a Meeting record — either linked to a calendar event or created ad hoc (manual notes flow).

**Request**: `MeetingCreate`:
```
MeetingCreate:
  relationship_name: str          # auto-creates the Relationship if new (FR-008)
  title: str
  occurred_at: datetime
  calendar_event_id: str | null
  meet_conference_id: str | null
  participants: list[{speaker_id: str, display_name: str | null, role: "user" | "other"}]
```

**Response 201**: `Meeting` (see data-model.md).

**Errors**: `422` (validation — e.g., empty `relationship_name`).

### `GET /api/meetings/{id}`

**Response 200**: `Meeting` with current `transcript_status` / `analysis_status`.

**Errors**: `404`.

## Transcripts

### `POST /api/transcripts/upload`

Accepts a recording (audio) or a transcript/notes file/paste for a Meeting. Exactly one of
`audio_file`, `transcript_text` MUST be provided.

**Request** (multipart or JSON): `TranscriptUpload`:
```
TranscriptUpload:
  meeting_id: str
  audio_file: file | null        # routed to Sarvam Batch STT
  transcript_text: str | null    # paste/notes path — used as-is
```

**Response 202**: `{"meeting_id": str, "transcript_status": "processing" | "available"}`
(`processing` when STT is required and runs asynchronously; `available` immediately for
paste/notes.)

**Errors**: `422` (empty/whitespace-only `transcript_text` — FR-021), `413` (audio too large),
`415` (unsupported audio format — falls back per stack instructions §5/§16).

### `POST /api/transcripts/process`

Explicitly (re)triggers normalization + Meeting Analyzer + Hindsight retain for a meeting whose
transcript is `available`. (Also triggered automatically once STT completes.)

**Response 200**: `AnalysisResult` (see data-model.md `Analysis Result`), plus
`retain_status: "success" | "skipped_no_durable_content" | "failed"`.

**Errors**: `409` (transcript not yet `available`), `422` (empty/malformed transcript —
FR-021), `502` (LLM or Hindsight failure — FR-022; response body includes which stage failed:
`"analysis" | "retain"` so the UI can show a precise message and allow retry).

### `GET /api/meetings/{id}/transcript`

**Response 200**: `Transcript` (see data-model.md). **404** if not yet available.

## Memory

### `POST /api/memory/preview`

Returns the Meeting Analyzer's structured output for a meeting **without** retaining it — used by
the "show what the system extracted" step (FR-025) before committing to Hindsight, and by the
stateless-mode current-meeting-only context.

**Request**: `{"meeting_id": str}`

**Response 200**: `AnalysisResult`.

**Errors**: `502` (LLM failure — FR-022).

### `POST /api/memory/retain`

Commits a previously previewed (or freshly analyzed) meeting's durable items into the
relationship's Hindsight bank (research.md §4), and applies any commitment-resolution `PATCH`
updates (research.md §6).

**Request**: `{"meeting_id": str}`

**Response 200**: `{"retained_item_count": int, "resolved_commitment_count": int}`

**Errors**: `502` (`{"error": "hindsight_unavailable"}` — FR-022), `409` (already retained for this
meeting — idempotent no-op, since `document_id` upserts safely, but reported distinctly for UI
clarity).

### `GET /api/relationships/{id}/memory`

Returns the relationship's memory timeline for the "Relationship Memory" view — a lightly
paginated, categorized list (not the bounded/ranked recall used for preparation).

**Query params**: `category: str | null` (one of the `memory_type` values), `status: str | null`
(for commitments).

**Response 200**: `list[MemoryTimelineItem]`:
```
MemoryTimelineItem:
  id: str                # Hindsight memory unit id
  category: str           # memory_type value
  text: str
  source_meeting_id: str
  source_meeting_title: str
  occurred_at: datetime
  status: "outstanding" | "resolved" | "unknown" | null   # commitments only
```

**Errors**: `404` (unknown relationship).

## Preparation

### `POST /api/meetings/{id}/prepare`

Generates a Preparation Brief for the Meeting's relationship.

**Request**: `PrepareRequest`:
```
PrepareRequest:
  mode: "stateless" | "memory_enabled"   # FR-012/013/014
  question: str | null                    # optional free-form continuity question (Story 5, FR-019); when set, returns a focused Answer instead of the full brief
```

**Response 200**: `PreparationBrief` (see data-model.md), or, when `question` was set:
```
Answer:
  text: str
  grounded: bool                # false → "not enough information" (FR-016)
  citations: list[CitedClaim]
```

**Errors**: `404` (unknown relationship/meeting), `502` (`{"error": "hindsight_unavailable"}` or
`{"error": "llm_unavailable"}` — FR-022; in `memory_enabled` mode a Hindsight failure degrades to a
clearly labeled stateless-equivalent response rather than failing the whole request, per
Constitution Principle IX graceful-failure requirement).

## Webhooks

### `POST /api/webhooks/google/meet`

Receives Google Meet post-conference notifications (transcript/recording ready) to drive
event-driven processing (stack instructions §5) instead of polling.

**Request**: Google's webhook payload (conference ID, event type).

**Response 200**: `{"accepted": true}` immediately; processing happens asynchronously.

**Errors**: `401` (invalid webhook signature/token — verified per Security section), always
returns `200` for well-formed-but-unprocessable payloads (per webhook best practice: never block
the sender on internal processing errors) while logging the failure for the `analysis_status`
timeline.

## Realtime Transcription (Optional — Phase 7)

### `WebSocket /api/transcription/realtime`

Streams microphone audio chunks from the React client to Sarvam Realtime STT via the backend and
streams back partial transcript segments. Partial segments are held in memory only
(`Meeting.transcript_status = "processing"`) and are **never** sent to Hindsight until the meeting
ends and the normal analyze → retain pipeline runs (research.md / stack instructions §6).

**Client → Server frames**: raw audio chunks (binary) + a final `{"type": "end"}` control frame.

**Server → Client frames**: `{"type": "partial", "text": str, "speaker_id": str | null}` and, on
`end`, `{"type": "final", "transcript_id": str}`.

**Errors**: connection closes with code `4001` on Sarvam failure/timeout, and the client falls back
to the upload/paste path (stack instructions §16).
