---
description: "Task list for feature implementation"
---

# Tasks: Meeting Continuity Agent

**Input**: Design documents from `/specs/001-meeting-continuity-agent/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/api-contracts.md](./contracts/api-contracts.md),
[quickstart.md](./quickstart.md)

**Tests**: Contract and integration tests are included — the stack brief behind plan.md explicitly
called for unit/integration/API/frontend tests per pipeline stage, and `quickstart.md`'s validation
steps are written to double as this feature's integration-test scenarios.

**Organization**: Phases 3–7 map 1:1 to spec.md's five user stories (P1–P5), each independently
testable per its spec.md "Independent Test" statement. Phases 8–11 add the Google
Calendar/Meet/Sarvam ingestion sources — an explicitly optional, stakeholder-directed expansion on
top of the paste-based core (see spec.md's Assumptions and plan.md's Complexity Tracking entry for
Principle XIII) — as enhancements to the ingestion path already built in Phase 3/US1, not new user
stories, so they carry no `[Story]` label. Phase 12 is cross-cutting polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- File paths are relative to the repository root, per plan.md's `backend/` / `frontend/` structure

## Path Conventions

Web app per plan.md: `backend/{api,integrations,agents,services,models,tests}` and
`frontend/src/{components,pages,services}` + `frontend/tests`.

---

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

- [X] T001 Create the `backend/` and `frontend/` directory skeletons exactly as laid out in
  [plan.md](./plan.md)'s Project Structure section (empty `__init__.py`/`index.ts` placeholders
  under `backend/api/`, `backend/integrations/{google,sarvam,hindsight,llm}/`, `backend/agents/`,
  `backend/services/`, `backend/models/`, `backend/tests/{unit,integration,contract}/`,
  `frontend/src/{components,pages,services}/`, `frontend/tests/`)
- [X] T002 Initialize the backend Python project (`backend/pyproject.toml` or
  `backend/requirements.txt`) with FastAPI, Pydantic v2, `hindsight-client`, the Groq SDK, the
  Microsoft Agent Framework package, and pytest, per plan.md's Technical Context
- [X] T003 [P] Initialize the frontend project in `frontend/` with Vite + React + TypeScript +
  Tailwind CSS (`frontend/package.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.js`)
- [X] T004 [P] Configure backend linting/formatting (ruff + black configs in
  `backend/pyproject.toml`) and frontend linting/formatting (`frontend/.eslintrc`,
  `frontend/.prettierrc`)
- [X] T005 Create `backend/.env.example` and a Pydantic `Settings` loader in
  `backend/core/config.py` covering every variable listed in [quickstart.md](./quickstart.md)'s
  Environment section (`HINDSIGHT_API_URL`, `HINDSIGHT_API_KEY`, `LLM_PROVIDER`, `GROQ_API_KEY`,
  `FOUNDRY_ENDPOINT`, `FOUNDRY_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
  `SARVAM_API_KEY`)

**Checkpoint**: Empty-but-runnable backend and frontend projects exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Set up the application-bookkeeping relational schema (SQLite for the prototype) for
  Relationship, Meeting, and Transcript/TranscriptSegment tables in `backend/models/db.py`, matching
  [data-model.md](./data-model.md)'s "Application-State Entities" section field-for-field
- [X] T007 [P] Implement the `LLMProvider` protocol plus `GroqProvider` and `FoundryProvider`
  adapters, selected via `LLM_PROVIDER`, in `backend/integrations/llm/provider.py`
  ([research.md](./research.md) §1)
- [X] T008 [P] Implement the Hindsight adapter in `backend/integrations/hindsight/client.py`:
  bank auto-creation with `retain_mission`/`observations_mission`/`entity_labels`
  (`memory_type`, `commitment_status`) per research.md §3 and §5, a `retain_meeting(...)` method
  per research.md §4, and a `retain_commitment_resolution(...)` method (retains a
  `memory_type:commitment_resolution` fact naming the original commitment, per the corrected
  research.md §6 — Hindsight's `update_memory` cannot edit tags, so status is never patched in
  place)
- [X] T009 [P] Implement the `Relationship` Pydantic model in `backend/models/relationship.py` and
  a `relationship_service.get_or_create(name)` in `backend/services/relationship_service.py` that
  auto-creates a Relationship (and its Hindsight bank via T008) the first time a name is used,
  per spec.md FR-001/FR-008 and the 2026-09-28 Clarifications
- [X] T010 [P] Implement the `Meeting`, `Transcript`, and `TranscriptSegment` Pydantic models in
  `backend/models/meeting.py`, matching data-model.md
- [X] T011 Set up the FastAPI app in `backend/main.py`: router registration for all modules under
  `backend/api/`, and global exception handlers that turn Hindsight/LLM/integration failures into
  the documented `502` error-body shapes from
  [contracts/api-contracts.md](./contracts/api-contracts.md) instead of raw stack traces (FR-021,
  FR-022)
- [X] T012 [P] Set up the frontend routing shell and a typed API client stub in
  `frontend/src/services/apiClient.ts`, plus empty page components for the four views
  (`frontend/src/pages/UpcomingMeetings.tsx`, `MeetingCapture.tsx`, `RelationshipMemory.tsx`,
  `MeetingPreparation.tsx`)

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Capture and Retain Meeting Memory (Priority: P1) 🎯 MVP

**Goal**: Submit a meeting's notes/transcript, have the system extract durable information, retain
it in the relationship's Hindsight bank, and show the user what was remembered.

**Independent Test**: Submit one meeting's notes for a relationship and confirm the system displays
extracted, retained memory items — no later meeting or recall step required (spec.md Story 1).

### Tests for User Story 1

- [X] T013 [P] [US1] Contract test for `POST /api/transcripts/upload` (paste + empty-input cases)
  in `backend/tests/contract/test_transcripts_upload.py`
- [X] T014 [P] [US1] Contract test for `POST /api/transcripts/process` (success + malformed-input
  + LLM-failure cases) in `backend/tests/contract/test_transcripts_process.py`
- [X] T015 [P] [US1] Contract test for `POST /api/memory/retain` (success + Hindsight-failure
  cases) in `backend/tests/contract/test_memory_retain.py`
- [X] T016 [US1] Integration test covering quickstart.md steps 1–3 (submit notes → analyze → retain
  → memory timeline shows items with source citations) in
  `backend/tests/integration/test_capture_and_retain.py`

### Implementation for User Story 1

- [X] T017 [P] [US1] Implement the paste/notes ingestion normalization path (raw text →
  `Transcript`/`TranscriptSegment`, rejecting empty/whitespace-only input per FR-021) in
  `backend/services/ingestion.py`
- [X] T018 [P] [US1] Implement the `AnalysisResult`, `MemoryCandidate`, and
  `CommitmentResolutionSignal` Pydantic models in `backend/models/analysis.py`, matching
  data-model.md
- [X] T019 [US1] Implement the Meeting Analyzer Agent (Microsoft Agent Framework, structured
  output against the T018 schema, extraction categories per spec.md FR-002 and the bank's
  `retain_mission`) in `backend/agents/meeting_analyzer.py` (depends on T007, T018)
- [X] T020 [US1] Implement `memory_pipeline.analyze(meeting_id)` (ingestion → Meeting Analyzer →
  `AnalysisResult`, setting `analysis_status`) in `backend/services/memory_pipeline.py` (depends on
  T017, T019)
- [X] T021 [US1] Implement `memory_pipeline.retain(meeting_id)` (build the normalized, attributed
  content string excluding non-durable items, call `hindsight.retain_meeting(...)` with
  `document_id="meeting-<id>"`, `tags`, `timestamp`, `entities` per research.md §4) in
  `backend/services/memory_pipeline.py` (depends on T008, T020)
- [X] T022 [P] [US1] Implement a secret/credential redaction pass over the Meeting Analyzer's
  output — strip or mask patterns resembling API keys, tokens, and passwords — applied before
  content is handed to `memory_pipeline.retain(...)` (FR-023: "MUST NOT store secrets, credentials,
  or API keys as part of retained meeting memory") in `backend/services/redaction.py`, wired into
  `backend/services/memory_pipeline.py` (extends T021), plus a unit test in
  `backend/tests/unit/test_redaction.py`
- [X] T023 [US1] Implement `POST /api/meetings` and `GET /api/meetings/{id}` in
  `backend/api/meetings.py` (depends on T009, T010)
- [X] T024 [US1] Implement `POST /api/transcripts/upload`, `POST /api/transcripts/process`, and
  `GET /api/meetings/{id}/transcript` in `backend/api/transcripts.py` (depends on T017, T020)
- [X] T025 [US1] Implement `POST /api/memory/preview` and `POST /api/memory/retain` in
  `backend/api/memory.py` (depends on T020, T021, T022)
- [X] T026 [US1] Implement `GET /api/relationships/{id}/memory` (categorized timeline, `category`
  and `status` query filters) in `backend/api/memory.py` (depends on T008)
- [X] T027 [US1] Build the Meeting Capture page — paste notes, submit, and display the "what was
  extracted and remembered" summary (FR-025) — in `frontend/src/pages/MeetingCapture.tsx` (depends
  on T012, T024, T025)
- [X] T028 [US1] Build the Relationship Memory page — categorized timeline list with source
  meeting references — in `frontend/src/pages/RelationshipMemory.tsx` (depends on T012, T026)

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - Personalized Meeting Preparation Brief (Priority: P2)

**Goal**: Generate a Preparation Brief for an upcoming meeting, grounded in accumulated Hindsight
memory, with per-claim source citations.

**Independent Test**: Seed two or more prior meetings for a relationship, request a preparation
brief, and confirm it surfaces cited historical detail with no other steps required (spec.md
Story 2).

### Tests for User Story 2

- [X] T029 [P] [US2] Contract test for `POST /api/meetings/{id}/prepare` in `memory_enabled` mode
  (populated + no-history cases) in `backend/tests/contract/test_prepare.py`
- [X] T030 [US2] Integration test covering quickstart.md steps 5–6 (two seeded meetings → brief
  includes the budget concern, deadline, preference, outstanding commitment, and new topic, each
  cited). Assert quantitatively against SC-002 and SC-008: seed three prior meetings, confirm ≥90%
  of the concerns/decisions/commitments actually present in those meetings and relevant to the
  requested topic appear in the brief (SC-002), and confirm the brief generated after the third
  meeting contains strictly more relationship-specific cited details than the brief that would have
  been produced using only the first meeting's memory (SC-008). In
  `backend/tests/integration/test_prepare_brief.py`
- [X] T031 [P] [US2] Hallucination-safeguard test (SC-006): assert every item in a
  `PreparationBrief.confirmed` section carries a `source_meeting_id` that matches a fact actually
  recalled from Hindsight for that request, and that no `confirmed` item is ever emitted without a
  matching recalled fact — run against both a populated bank and an empty bank — in
  `backend/tests/integration/test_hallucination_safeguard.py`

### Implementation for User Story 2

- [X] T032 [P] [US2] Implement `PreparationBrief`, `ConfirmedSection`, `SuggestedSection`,
  `CitedClaim`, `CitedCommitment`, and `Conflict` Pydantic models in
  `backend/models/preparation.py`, matching data-model.md
- [X] T033 [US2] Implement `hindsight.recall_for_preparation(...)` — the two-call bounded recall
  (relevance/recency-ranked pool + always-included unresolved items) described in research.md §7 —
  in `backend/integrations/hindsight/client.py` (depends on T008)
- [X] T034 [US2] Implement the Preparation Agent (structured output producing `confirmed` vs.
  `suggested` sections with per-claim citations, per research.md §8; must satisfy the T031
  hallucination-safeguard test — never emit a `confirmed` claim without a citing fact) in
  `backend/agents/preparation_agent.py` (depends on T007, T032)
- [X] T035 [US2] Implement `memory_pipeline.prepare(meeting_id, mode="memory_enabled")`
  (recall via T033 → Preparation Agent via T034 → `PreparationBrief`) in
  `backend/services/memory_pipeline.py` (depends on T033, T034)
- [X] T036 [US2] Implement `POST /api/meetings/{id}/prepare` (memory-enabled path) in
  `backend/api/preparation.py` (depends on T035)
- [X] T037 [US2] Handle the "no prior memory for this relationship" case with an explicit
  not-enough-information response instead of a fabricated brief (FR-016) in
  `backend/agents/preparation_agent.py` / `backend/services/memory_pipeline.py`
- [X] T038 [US2] Build the Meeting Preparation page — brief display with confirmed/suggested
  sections and source references — in `frontend/src/pages/MeetingPreparation.tsx` (depends on T012,
  T036)
- [X] T039 [US2] Build the Upcoming Meetings page with manual relationship/meeting selection and a
  "Prepare" button (calendar data wired in Phase 8) in
  `frontend/src/pages/UpcomingMeetings.tsx` (depends on T012, T023)

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Stateless vs. Memory-Enabled Comparison (Priority: P3)

**Goal**: Let a user or demo viewer compare the same preparation request with and without
Hindsight memory.

**Independent Test**: Trigger the same "prepare me" request once stateless and once
memory-enabled for a relationship with existing history, and compare outputs directly (spec.md
Story 3).

### Tests for User Story 3

- [X] T040 [P] [US3] Contract test for `POST /api/meetings/{id}/prepare` with `mode=stateless`
  vs. `mode=memory_enabled` on the same relationship in
  `backend/tests/contract/test_prepare_modes.py`
- [X] T041 [US3] Integration test covering quickstart.md steps 4 and 6 (stateless brief has no
  historical citations; memory-enabled brief on the same request has ≥3 additional historical
  details) in `backend/tests/integration/test_stateless_vs_memory.py`

### Implementation for User Story 3

- [X] T042 [US3] Add `mode` branching to `memory_pipeline.prepare(...)` so `stateless` skips both
  T033 recall calls entirely and passes only the current request/meeting's own extracted items to
  the Preparation Agent (research.md §9) in `backend/services/memory_pipeline.py` (depends on
  T035)
- [X] T043 [US3] Add the `mode` field to the `PreparationBrief` response and ensure every
  historical field is `null` in `stateless` mode in `backend/models/preparation.py` (depends on
  T032, T042)
- [X] T044 [US3] Add a stateless/memory-enabled toggle (or side-by-side view) with a clear visual
  label to `frontend/src/pages/MeetingPreparation.tsx` (depends on T038, T043)

**Checkpoint**: The core before/after demo works end-to-end.

---

## Phase 6: User Story 4 - Commitment (Promise) Tracking Across Meetings (Priority: P4)

**Goal**: Track commitments across meetings — who promised what, when, and whether it's still
outstanding — and surface unresolved ones in the next brief.

**Independent Test**: Submit two meetings where the first contains a commitment and the second
does not mention it as resolved; confirm the next brief lists it as outstanding with owner and
source meeting (spec.md Story 4).

### Tests for User Story 4

- [X] T045 [US4] Integration test covering quickstart.md step 7 (commitment made in Meeting 1,
  fulfilled in Meeting 3 → `resolved_commitment_count == 1` on retain, and the next brief no
  longer lists it as outstanding) in `backend/tests/integration/test_commitment_tracking.py`

### Implementation for User Story 4

- [X] T046 [US4] Extend the Meeting Analyzer's structured output to detect
  `CommitmentResolutionSignal`s (a new meeting indicating a prior commitment was fulfilled or is no
  longer relevant) in `backend/agents/meeting_analyzer.py` (extends T019)
- [X] T047 [US4] Implement the commitment-resolution retain flow — for each
  `CommitmentResolutionSignal`, call `hindsight.retain_commitment_resolution(...)` to store a new
  `memory_type:commitment_resolution` fact naming the original commitment and citing the new
  meeting (research.md §6; no tag is ever patched on the original commitment fact) — in
  `backend/services/memory_pipeline.py` (depends on T008, T021, T046)
- [X] T048 [US4] Ensure `GET /api/relationships/{id}/memory` and the Preparation Agent both surface
  commitment `owner`, `deadline`, and `status` fields (data-model.md `CitedCommitment`), computing
  `status` by pairing each `memory_type:commitment` fact against any `memory_type:commitment_resolution`
  fact that names it — in `backend/api/memory.py` and `backend/agents/preparation_agent.py` (depends
  on T026, T034)
- [X] T049 [US4] Add a Promise Tracker section (owner, deadline, status) to
  `frontend/src/pages/RelationshipMemory.tsx` (depends on T028, T048)

**Checkpoint**: Commitments are correctly tracked and resolved across meetings.

---

## Phase 7: User Story 5 - Ad Hoc Relationship Continuity Questions (Priority: P5)

**Goal**: Answer free-form relationship-continuity questions through the same conversational
interface, grounded in stored memory.

**Independent Test**: Ask a specific historical question with supporting memory and confirm a
grounded answer; ask about a topic with no supporting memory and confirm an explicit
not-enough-information response (spec.md Story 5).

### Tests for User Story 5

- [X] T050 [US5] Integration test covering quickstart.md steps 8–9 (grounded question returns a
  cited `Answer`; ungrounded question returns `grounded: false`) in
  `backend/tests/integration/test_continuity_questions.py`

### Implementation for User Story 5

- [X] T051 [US5] Add the `question` branch to the Preparation Agent (returns the `Answer` schema
  from contracts/api-contracts.md instead of a full brief, reusing the same recall calls from T033)
  in `backend/agents/preparation_agent.py` (depends on T034)
- [X] T052 [US5] Wire the `question` field through `POST /api/meetings/{id}/prepare` in
  `backend/api/preparation.py` (depends on T036, T051)
- [X] T053 [US5] Add a conversational question input to
  `frontend/src/pages/MeetingPreparation.tsx` (depends on T038, T052)

**Checkpoint**: All five spec.md user stories are functional — the full hackathon-critical scope is
demoable without any Google/Sarvam integration (quickstart.md's Minimum Viable Validation, steps
1–9).

---

## Phase 8: Google Calendar Integration (enhances US1/US2 ingestion)

**Purpose**: Replace the manual relationship/meeting entry in Phase 3/4 with real upcoming events,
per plan.md's Phase 3. Optional, stakeholder-directed scope expansion — see spec.md's Assumptions
and plan.md's Complexity Tracking entry for Principle XIII.

- [ ] T054 [P] Implement the Google OAuth flow and secure token storage in
  `backend/integrations/google/auth.py`
- [ ] T055 [P] Implement the `CalendarProvider` adapter (`list_upcoming()`) in
  `backend/integrations/google/calendar.py` (depends on T054)
- [ ] T056 Implement `GET /api/calendar/upcoming` and `POST /api/calendar/sync` in
  `backend/api/calendar.py` (depends on T055)
- [ ] T057 Resolve calendar attendees to an existing or new Relationship in
  `backend/services/relationship_service.py` (extends T009)
- [ ] T058 [P] Contract test for `GET /api/calendar/upcoming` (mocked Google API, including a
  `502 calendar_unavailable` case) in `backend/tests/contract/test_calendar.py`
- [ ] T059 Wire real calendar events (with a "Meet indicator") into
  `frontend/src/pages/UpcomingMeetings.tsx` (extends T039)

---

## Phase 9: Google Meet Integration (enhances US1 ingestion)

**Purpose**: Retrieve Meet transcripts/recordings post-conference, per plan.md's Phase 4. Optional
— see Phase 8's scope note.

- [ ] T060 [P] Implement the `MeetProvider` adapter (participants, transcript, recording
  retrieval) in `backend/integrations/google/meet.py`
- [ ] T061 Implement `POST /api/webhooks/google/meet` (accepts immediately, triggers async
  processing) in `backend/api/webhooks.py` (depends on T060)
- [ ] T062 Implement the transcript-unavailable fallback chain (recording upload → transcript
  paste → manual notes) in `backend/services/ingestion.py` (extends T017)
- [ ] T063 [P] Integration test: no Meet transcript available → system falls back gracefully with
  no error surfaced to the user in `backend/tests/integration/test_meet_fallback.py`

---

## Phase 10: Sarvam Batch STT Integration (enhances US1 ingestion)

**Purpose**: Support recording uploads with transcription and speaker diarization, per plan.md's
Phase 5. Optional — see Phase 8's scope note.

- [ ] T064 [P] Implement the `SttProvider` adapter (Sarvam Batch STT, multilingual +
  diarization) in `backend/integrations/sarvam/stt.py`
- [ ] T065 Wire audio upload → Sarvam STT → `Transcript`/`TranscriptSegment` in
  `backend/services/ingestion.py` (extends T017, T062; depends on T064)
- [ ] T066 Implement speaker resolution (`speaker_id` → calendar/Meet participant → Person,
  "Unknown" when unresolved, per research.md §10) in `backend/services/speaker_resolution.py`
  (depends on T055, T060)
- [ ] T067 [P] Contract test for `POST /api/transcripts/upload` with `audio_file` (mocked Sarvam,
  including unsupported-format `415` case) in `backend/tests/contract/test_transcripts_audio.py`
- [ ] T068 Add recording upload to `frontend/src/pages/MeetingCapture.tsx` (extends T027)

---

## Phase 11: Sarvam Realtime STT (Optional)

**Purpose**: Live microphone transcription, per plan.md's optional Phase 7. Must not delay or
block any earlier phase (Constitution Principle XV). Optional within an already-optional Phase
8–10 expansion.

- [ ] T069 [P] Implement the realtime STT adapter in `backend/integrations/sarvam/realtime.py`
- [ ] T070 Implement `WebSocket /api/transcription/realtime` (streams partial transcript, never
  writes partials to Hindsight — buffers until the meeting ends, per research.md/stack §6) in
  `backend/api/transcripts.py` (depends on T069)
- [ ] T071 Add live microphone capture + partial transcript display to
  `frontend/src/pages/MeetingCapture.tsx` (extends T068; depends on T070)

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T072 [P] Implement the "Why does the agent know this?" source view component
  (`frontend/src/components/SourceReferences.tsx`), used by both MeetingPreparation.tsx and
  RelationshipMemory.tsx
- [ ] T073 [P] Implement conflict display (earlier vs. later claim, source meetings,
  recommendation) in `frontend/src/components/ConflictBanner.tsx`, wired into
  `frontend/src/pages/MeetingPreparation.tsx`
- [ ] T074 Security review: confirm no third-party API key/secret is reachable from the built
  frontend bundle, verify `POST /api/webhooks/google/meet` validates Google's signature/token,
  confirm `.env.example` covers every secret used (stack instructions §16), and confirm the T022
  redaction pass actually runs on every path that reaches `memory_pipeline.retain(...)` (FR-023)
- [ ] T075 Add unit tests for speaker resolution, commitment-signal matching, and
  `memory_type`/`commitment_status` tag mapping in `backend/tests/unit/`
- [ ] T076 [P] Audit every external call (Hindsight, LLM, Google, Sarvam) for a graceful,
  documented failure path per contracts/api-contracts.md's Errors sections (FR-021, FR-022)
- [ ] T077 Run the full [quickstart.md](./quickstart.md) validation (Minimum Viable Validation +
  Extended Validation) end-to-end, confirm the SC-002/SC-006/SC-008 assertions added to T030/T031
  hold, and fix any regressions found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS every later phase
- **User Stories (Phases 3–7)**: All depend on Phase 2. Phases 3 (US1) → 4 (US2) build on each
  other in practice (US2's recall needs US1's retained memory to be meaningful), but each phase's
  own contract/integration tests can be written and run against stubs before the prior phase's UI
  is finished. Phases 5 (US3), 6 (US4), and 7 (US5) each layer directly on US1+US2's
  `memory_pipeline`/`preparation_agent` and can proceed in any order relative to each other once
  Phase 4 is done.
- **Google/Sarvam phases (8–11)**: Each depends only on Phase 3 (US1's ingestion path) being in
  place; they do not block or gate Phases 4–7, and Phase 11 is explicitly optional per Constitution
  Principle XV. Phases 8–11 as a whole are themselves an optional, stakeholder-directed scope
  expansion beyond spec.md's original MVP boundary (see plan.md's Complexity Tracking entry) — cut
  them first if time is short.
- **Polish (Phase 12)**: Depends on all phases you choose to include being complete.

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories — the MVP.
- **US2 (P2)**: Functionally requires US1's retain path to have data worth recalling, but its own
  contract tests (T029) can run against a seeded/stubbed bank.
- **US3 (P3)**: Depends on US2's `memory_pipeline.prepare(...)` existing (adds the `mode` branch to
  it) — implement after US2.
- **US4 (P4)**: Depends on US1's retain path (T021) and benefits from US2's brief structure
  (T048), but is independently testable via T045 alone.
- **US5 (P5)**: Depends on US2's Preparation Agent and recall (T033, T034) — implement after US2.

### Parallel Opportunities

- All `[P]` tasks within Phase 1 and Phase 2 can run in parallel.
- Within each user-story phase, `[P]`-marked model/test tasks can run in parallel; sequential tasks
  in the same file (e.g., T020 → T021 → T022, all touching the retain path) cannot.
- Once Phase 4 (US2) is done, Phases 5, 6, and 7 can be staffed and built in parallel by different
  developers.
- Phases 8, 9, and 10 can be staffed in parallel once Phase 3 is done; Phase 11 can start once
  Phase 10 is done.

---

## Parallel Example: User Story 1

```bash
# Contract + integration tests for User Story 1 (different files):
Task: "Contract test for POST /api/transcripts/upload in backend/tests/contract/test_transcripts_upload.py"
Task: "Contract test for POST /api/transcripts/process in backend/tests/contract/test_transcripts_process.py"
Task: "Contract test for POST /api/memory/retain in backend/tests/contract/test_memory_retain.py"

# Models for User Story 1 (different files):
Task: "Implement ingestion normalization in backend/services/ingestion.py"
Task: "Implement AnalysisResult/MemoryCandidate models in backend/models/analysis.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: run quickstart.md steps 1–3 independently
5. Demo if ready — this alone already proves durable memory capture, per Constitution Principle X

### Incremental Delivery (Recommended for the Hackathon Timeline)

1. Setup + Foundational → foundation ready
2. US1 → validate (quickstart steps 1–3) → this is already a partial demo
3. US2 → validate (quickstart steps 5–6, including the SC-002/SC-008 quantitative checks in T030)
   → the core "remembers what matters" value is now provable
4. US3 → validate (quickstart steps 4 & 6) → the before/after comparison judges will look for
5. US4 → validate (quickstart step 7) → Promise Tracker story
6. US5 → validate (quickstart steps 8–9) → conversational continuity
7. **Stop here if time is short** — Phases 3–7 alone satisfy every Constitution gate and the full
   demo arc without any Google/Sarvam dependency (Constitution Principle XV)
8. Phases 8–10 (Calendar, Meet, Sarvam Batch STT) — add only if time remains, in that order
9. Phase 11 (Sarvam Realtime) — last, optional, and skippable entirely

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. One developer takes US1 → US2 (sequential, since US2 depends on US1's data)
3. Once US2 lands, separate developers can take US3, US4, and US5 in parallel
4. A separate developer/track can build Phases 8–10 in parallel with US3–US5, since they only
   depend on US1

---

## Notes

- `[P]` tasks touch different files with no unmet dependencies.
- `[Story]` labels trace every Phase 3–7 task back to its spec.md user story.
- Commit after each task or logical group.
- Stop at any phase checkpoint to validate that story independently before continuing.
- Per Constitution Principle XV: if a later phase's complexity ever threatens the core memory demo
  (Phases 3–7), cut the later phase (Google/Sarvam integrations) rather than the memory story.
