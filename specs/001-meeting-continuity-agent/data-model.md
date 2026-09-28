# Data Model: Meeting Continuity Agent

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Two layers of state exist in this system:

1. **Application state** (Postgres/SQLite via the backend, exact engine chosen at implementation
   time — out of scope for this document): Relationships, Meetings, Transcripts, and the
   lightweight pointers needed to render the UI and drive ingestion/analysis. This is bookkeeping,
   not long-term memory.
2. **Hindsight memory** (the durable, queryable long-term store): Memory Units of type
   `decision` / `commitment` / `concern` / `requirement` / `preference` / `unresolved_question` /
   `follow_up` / `context` / `priority_change` / `outcome`, plus Hindsight's own derived
   `observation` facts — all scoped to a per-relationship bank (see research.md §3).

Application-state entities hold **pointers** into Hindsight (`bank_id`, `document_id`, memory unit
IDs surfaced in recall responses) rather than duplicating memory content.

## Application-State Entities

### Relationship

Represents an ongoing professional relationship (spec.md Key Entities; FR-001, FR-008, FR-024).

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Internal identifier |
| `name` | string | User-supplied name/label; **unique** — acts as the relationship's identity (per Clarifications 2026-09-28) |
| `slug` | string | Deterministic slug of `name`, used to derive `bank_id` (`rel-<slug>`) |
| `organization` | string \| null | Optional organization/client label |
| `bank_id` | string | The Hindsight bank backing this relationship's memory |
| `created_at` | datetime | Set on auto-creation (first meeting referencing this name) |
| `meeting_count` | integer | Denormalized count, for UI display only |

**Validation rules**:
- `name` MUST be non-empty and unique (case-insensitive) within the system (single-user scope).
- `slug` is derived, never user-supplied directly, and MUST be stable for the life of the
  relationship (bank_id must not change once created).

**Lifecycle**: Created automatically on first reference (FR-008). No explicit deletion flow is
required for the MVP; relationships accumulate for the life of the demo/prototype.

### Meeting

A single submitted meeting record (spec.md Key Entities; FR-001, FR-004, FR-020).

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Internal identifier; used as Hindsight `document_id` suffix (`meeting-<id>`) |
| `relationship_id` | string | FK → Relationship |
| `calendar_event_id` | string \| null | Set when sourced from Google Calendar |
| `meet_conference_id` | string \| null | Set when a Google Meet conference is associated |
| `title` | string | Meeting title/subject |
| `occurred_at` | datetime | Meeting date/time; used as Hindsight `timestamp` on retain |
| `participants` | list[Participant] | See below |
| `input_mode` | enum | `meet_transcript` \| `recording_upload` \| `transcript_paste` \| `live_transcription` |
| `transcript_status` | enum | `pending` \| `available` \| `unavailable` \| `processing` \| `failed` |
| `analysis_status` | enum | `not_started` \| `in_progress` \| `completed` \| `failed` |
| `raw_input_ref` | string \| null | Pointer to stored raw input (uploaded file, pasted text) — **not** the Hindsight document itself |

**Participant** (embedded, not a top-level entity):

| Field | Type | Notes |
|---|---|---|
| `speaker_id` | string | Source-provided speaker/participant identifier |
| `display_name` | string | Resolved name, or `"Unknown"` if unresolved (research.md §10) |
| `role` | enum | `user` \| `other` — distinguishes the professional using the product from everyone else |
| `resolution_confidence` | enum | `confirmed` (matched to a calendar/Meet participant) \| `unresolved` |

**State transitions** (`transcript_status`): `pending → available` (transcript/recording/paste
received) or `pending → unavailable` (Meet transcript never materializes; falls back per stack
instructions §5). (`analysis_status`): `not_started → in_progress → completed`, or `→ failed` on
analyzer/LLM error (handled per FR-021/FR-022).

**Validation rules**:
- A Meeting MUST belong to exactly one Relationship (auto-created if new, per research.md §3).
- `analysis_status` MUST reach `completed` before any of its extracted memory items are considered
  retained in Hindsight (retain happens only after successful analysis).

### Transcript / TranscriptSegment

Normalized representation of meeting content, regardless of source (stack instructions §3).

**Transcript**

| Field | Type | Notes |
|---|---|---|
| `meeting_id` | string | FK → Meeting |
| `source` | enum | `meet` \| `recording_stt` \| `paste` \| `live_stt` |
| `language` | string \| null | BCP-47 language tag, when known (Sarvam multilingual support) |
| `segments` | list[TranscriptSegment] | Ordered |

**TranscriptSegment**

| Field | Type | Notes |
|---|---|---|
| `speaker_id` | string | Raw source speaker id (see Participant.speaker_id) |
| `speaker_name` | string \| null | Resolved display name, or null until resolved |
| `start_time` | float (seconds) \| null | Null for pasted notes with no timing |
| `end_time` | float (seconds) \| null | |
| `text` | string | |
| `confidence` | float \| null | STT confidence, when provided by Sarvam |

**Validation rules**:
- `text` MUST NOT be empty for a stored segment (empty/whitespace-only input is rejected at
  ingestion per FR-021, before a Transcript is even created).

### Analysis Result (transient — not persisted beyond the Meeting it was computed for)

The Meeting Analyzer Agent's structured output. Not a stored entity in its own right; it is the
payload that (a) is shown to the user as "what was extracted" (FR-025) and (b) is transformed into
the Hindsight retain call (research.md §4).

| Field | Type | Notes |
|---|---|---|
| `meeting_id` | string | |
| `items` | list[MemoryCandidate] | |
| `commitment_resolutions` | list[CommitmentResolutionSignal] | See below |
| `had_durable_content` | boolean | False triggers the "little or nothing durable was found" message (Story 1, Scenario 2) |

**MemoryCandidate**

| Field | Type | Notes |
|---|---|---|
| `category` | enum | `decision` \| `commitment` \| `concern` \| `requirement` \| `preference` \| `unresolved_question` \| `follow_up` \| `context` \| `priority_change` \| `outcome` |
| `text` | string | The extracted statement, attributed and time-stamped |
| `speaker` | string | Display name or "Unknown" |
| `owner` | string \| null | For `commitment` only: who made the commitment (user or a named participant); null if genuinely unclear |
| `deadline` | string \| null | For `commitment` only: only set if explicitly stated in the meeting |

**CommitmentResolutionSignal**

| Field | Type | Notes |
|---|---|---|
| `matched_commitment_hint` | string | Text used to look up the prior commitment memory (research.md §6) |
| `resolution` | enum | `resolved` \| `no_longer_relevant` |
| `evidence_text` | string | The statement in this meeting indicating resolution |

## Hindsight Memory Model (per-relationship bank)

These are not application-database rows; they describe how application concepts map onto Hindsight
memory units, tags, and entity labels (research.md §5–7).

### Bank Configuration (set once, at relationship auto-creation)

| Setting | Value |
|---|---|
| `retain_mission` | See research.md §5 |
| `observations_mission` | See research.md §5 |
| `entity_labels` | `memory_type` (tag:true) — includes a `commitment_resolution` value used to record a later fact that resolves an earlier commitment; see research.md §5–6 |
| `observation_scopes` | `combined` (default; single-relationship bank, no sub-partitioning needed) |

### Memory Unit → Product Concept Mapping

| Product concept (spec.md Key Entities) | Hindsight representation |
|---|---|
| Decision | Fact tagged `memory_type:decision` |
| Commitment | Fact tagged `memory_type:commitment`; `owner`/`deadline` captured in the fact text (Hindsight facts are text + entities, not arbitrary structured fields). Resolution is a **separate** fact tagged `memory_type:commitment_resolution` naming the original commitment (research.md §6) — the Preparation Agent pairs the two at read time to compute `status` rather than any tag being mutated in place |
| Concern / Objection | Fact tagged `memory_type:concern` |
| Requirement | Fact tagged `memory_type:requirement` |
| Preference | Fact tagged `memory_type:preference` |
| Unresolved Question | Fact tagged `memory_type:unresolved_question` |
| Follow-up item | Fact tagged `memory_type:follow_up` |
| Important context | Fact tagged `memory_type:context` |
| Priority change | Fact tagged `memory_type:priority_change` |
| Outcome | Fact tagged `memory_type:outcome` |
| Relationship-level pattern (e.g., "consistently price-sensitive") | Hindsight `observation` type (auto-consolidated, not directly written) |

Every memory unit additionally carries:
- `tags`: `["relationship:<slug>", "meeting:<meeting_id>"]`
- `context`: `"Meeting with <relationship_name> on <date>: <title>"`
- `document_id`: `"meeting-<meeting_id>"`
- `timestamp`: the meeting's `occurred_at`

This satisfies FR-004 (every memory traceable to its source meeting): `document_id` and the
`meeting:<meeting_id>` tag both resolve back to the Meeting record, which holds the human-readable
title/date for display (FR-018).

### Preparation Brief (API response shape, not a persisted entity)

| Field | Type | Notes |
|---|---|---|
| `relationship_summary` | string \| null | Null + explicit "not enough information" message if no prior memory (Story 2, Scenario 3) |
| `confirmed` | ConfirmedSection | Grounded, cited content — FR-015, FR-016, FR-017 |
| `suggested` | SuggestedSection | Agent-generated talking points/questions — clearly separated (FR-017) |
| `conflicts` | list[Conflict] | research.md §11 |
| `mode` | enum | `stateless` \| `memory_enabled` (FR-014) |

**ConfirmedSection**

| Field | Type | Notes |
|---|---|---|
| `what_matters` | list[CitedClaim] | |
| `previous_concerns` | list[CitedClaim] | |
| `prior_decisions` | list[CitedClaim] | |
| `user_commitments` | list[CitedCommitment] | Outstanding only, unless explicitly asked for full history |
| `participant_commitments` | list[CitedCommitment] | |
| `unresolved_issues` | list[CitedClaim] | |
| `recent_changes` | list[CitedClaim] | |

**CitedClaim**

| Field | Type | Notes |
|---|---|---|
| `text` | string | |
| `source_meeting_id` | string \| null | Null only when `mode == stateless` |
| `source_meeting_title` | string \| null | |
| `source_date` | date \| null | |
| `category` | enum | Same as `memory_type` values |

**CitedCommitment** (extends CitedClaim): `owner: string`, `deadline: string | null`,
`status: enum(outstanding|resolved|unknown)`.

**SuggestedSection**: `talking_points: list[string]`, `follow_up_questions: list[string]` — never
carries a `source_meeting_id` (these are inferred, not historical claims; FR-017).

**Conflict**: `topic: string`, `earlier_claim: CitedClaim`, `later_claim: CitedClaim`,
`recommendation: string` (e.g., "confirm current estimate with the client").
