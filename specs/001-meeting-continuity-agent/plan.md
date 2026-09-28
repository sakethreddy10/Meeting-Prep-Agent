# Implementation Plan: Meeting Continuity Agent

**Branch**: `001-meeting-continuity-agent` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-meeting-continuity-agent/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build a Meeting Continuity Agent: a modular web application (React frontend, FastAPI backend) that
turns meeting transcripts/notes into durable Hindsight memories scoped one bank per professional
relationship, then uses that memory to generate a relationship-aware meeting preparation brief. Two
Microsoft Agent Framework agents — a Meeting Analyzer and a Preparation Agent, both behind an
LLM-provider abstraction (Groq primary, Microsoft Foundry alternate) — handle extraction and
brief generation respectively. Hindsight's retain/recall/curation APIs are the sole long-term
memory layer (no additional vector database); recall is deliberately bounded and ranked
(relevance-first, recency-tiebreak, unresolved-items-always-included) rather than dumped wholesale
into the LLM. Google Calendar/Meet and Sarvam STT are optional ingestion sources layered on top of
a manual transcript/notes path that alone is sufficient to demonstrate the core memory story, per
the phased rollout in §20 of the technical brief and Constitution Principle XV.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.x (frontend, via Vite)

**Primary Dependencies**: FastAPI, Pydantic v2, Microsoft Agent Framework, `hindsight-client`
(Python SDK), Groq SDK (OpenAI-compatible client) and Microsoft Foundry SDK behind a shared
`LLMProvider` protocol, React 18, Tailwind CSS, Vite

**Storage**: Hindsight (durable relationship/meeting memory — the only long-term memory store, one
bank per Relationship); a lightweight relational store (SQLite for the hackathon prototype,
swappable for Postgres) for application bookkeeping only (Relationship/Meeting/Transcript rows,
status fields) — never a duplicate copy of memory content

**Testing**: pytest (backend unit/integration/API), Vitest + React Testing Library (frontend)

**Target Platform**: Linux server (backend) + modern evergreen browsers (frontend); local/dev-only
deployment target for the hackathon (no enterprise deployment infra, per Scope Control)

**Project Type**: Web application (frontend + backend)

**Performance Goals**: Interactive prototype targets only — meeting analysis and brief generation
each complete within a few seconds for a typical meeting (SC-001, SC-007); recall calls stay within
Hindsight's documented `mid` budget latency envelope (100–300ms) plus one LLM round trip

**Constraints**: Recall context per preparation request bounded to ≤ 3000 tokens for the
relevance-ranked pool + ≤ 1000 tokens for always-included unresolved items (research.md §7); no
raw transcript is ever sent to Hindsight (research.md §4); no third-party API key is ever exposed
to the React client (stack instructions §3, §16)

**Scale/Scope**: Single-user hackathon prototype; an arbitrary but demo-realistic number of
relationships (a handful) and meetings per relationship (single digits to low tens) — no
multi-tenant or high-concurrency scale target (Constitution Principle XIII)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Check | Status |
|---|---|---|---|
| I | Memory-First Product Design | Hindsight retain/recall is the only long-term memory path; every prep brief is built from recalled facts, not just stored transcripts (research.md §4, §7) | PASS |
| II | Clear Before/After Memory Demonstration | Single `mode: stateless\|memory_enabled` parameter on one Preparation Agent entry point, exercised explicitly in quickstart.md steps 4–6 | PASS |
| III | Real Professional Workflow | Single persona (a professional with recurring meetings), single workflow (capture → prepare), no generic chatbot scope creep | PASS |
| IV | Relationship Memory | All 11 memory categories mapped 1:1 to `memory_type` tag values (data-model.md) | PASS |
| V | Actionable Memory | `PreparationBrief.confirmed` vs `.suggested` split; `conflicts[]` for uncertain/contradictory info, never presented as settled fact | PASS |
| VI | Trust and Traceability | Every `CitedClaim` carries `source_meeting_id/title/date`; speaker resolution never invents identity (research.md §10); recall/reflect choice (research.md §8) preserves 1:1 fact→claim traceability | PASS |
| VII | Privacy and Data Minimization | Bank-per-relationship isolation (research.md §3); raw transcripts never retained verbatim (research.md §4); no secrets in Hindsight content by construction (analyzer output only, never raw API keys/credentials) | PASS |
| VIII | Simple, Demoable UX | Four views only (§13 of stack instructions); manual-notes path alone satisfies the full flow before any external integration is built | PASS |
| IX | Technical Quality | Provider isolation for Google/Sarvam/LLM (research.md §1, §12); explicit failure handling contracted per endpoint (contracts/api-contracts.md Errors sections) | PASS |
| X | Hackathon Demonstrability | quickstart.md's 9-step minimum-viable validation is exactly the demo arc (initial meeting → remembered → later meeting → recall → brief → before/after) | PASS |
| XI | Realistic Data | quickstart.md uses a realistic synthetic Acme Corp/Priya scenario, not toy data | PASS |
| XII | Content and Documentation Requirements | Not a code/architecture concern; no conflict — plan does not block producing the article/video/repo | N/A (satisfied by having a working, demoable product) |
| XIII | Scope Control | Calendar/Meet/Sarvam are explicitly optional layers (Phases 3, 4, 5, 7) on top of a complete Phase 1–2 core; no CRM/email/auth/enterprise infra introduced. This is a named exception to the principle's default exclusion — see Complexity Tracking below | PASS (justified exception) |
| XIV | Judging Alignment | Memory design (research.md §3–9) and traceability (VI above) directly target the 25%-weighted Hindsight Memory dimension without superficial features | PASS |
| XV | Engineering Decision Rule | Every research.md decision explicitly rejects a more complex alternative in favor of the simplest option that still proves the memory story (see each section's "Alternatives considered") | PASS |

One named exception (Principle XIII, Calendar/Meet/Sarvam integrations) is justified in the
Complexity Tracking table below; all other principles pass with no exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/001-meeting-continuity-agent/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── api/
│   ├── calendar.py        # GET /api/calendar/upcoming, POST /api/calendar/sync
│   ├── meetings.py         # POST /api/meetings, GET /api/meetings/{id}
│   ├── transcripts.py      # POST /api/transcripts/upload, /process, GET .../transcript
│   ├── memory.py           # POST /api/memory/preview, /retain, GET /api/relationships/{id}/memory
│   ├── preparation.py      # POST /api/meetings/{id}/prepare
│   └── webhooks.py         # POST /api/webhooks/google/meet
├── integrations/
│   ├── google/
│   │   ├── auth.py         # OAuth flow, token storage
│   │   ├── calendar.py     # CalendarProvider adapter
│   │   └── meet.py         # MeetProvider adapter (transcript/recording retrieval)
│   ├── sarvam/
│   │   ├── stt.py          # SttProvider adapter (Batch STT)
│   │   └── realtime.py     # Optional realtime STT (Phase 7)
│   ├── hindsight/
│   │   └── client.py       # Retain/recall/curation adapter (research.md §3-7)
│   └── llm/
│       └── provider.py     # LLMProvider protocol + GroqProvider/FoundryProvider (research.md §1)
├── agents/
│   ├── meeting_analyzer.py # Meeting Analyzer Agent (Agent Framework)
│   └── preparation_agent.py# Preparation Agent (Agent Framework)
├── services/
│   ├── ingestion.py        # Normalizes all input modes into Transcript/TranscriptSegment
│   ├── speaker_resolution.py
│   └── memory_pipeline.py  # Orchestrates analyze → retain → (commitment PATCH) per meeting
├── models/                  # Pydantic schemas matching data-model.md and contracts/api-contracts.md
└── tests/
    ├── unit/
    ├── integration/
    └── contract/

frontend/
├── src/
│   ├── components/
│   ├── pages/               # UpcomingMeetings, MeetingCapture, RelationshipMemory, MeetingPreparation
│   └── services/            # Typed API client for backend/api/*
└── tests/
```

**Structure Decision**: Web application (Option 2) — `backend/` (FastAPI) + `frontend/` (React/Vite)
at the repository root, matching the explicit module layout given in the stack instructions (§14).
No `ios/`/`android/` or CLI/library layout applies.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| Google Calendar + Google Meet + Sarvam Batch/Realtime STT integrations (Constitution Principle XIII names these as out-of-scope-unless-necessary; spec.md's original Assumptions listed them as out of scope) | The project stakeholder explicitly directed these integrations in the technical brief that produced this plan (stack instructions §4–6), specifying them as the primary real-world ingestion path (Calendar → Meet → transcript) around which the product is framed | Omitting them entirely would have contradicted an explicit, direct stakeholder instruction rather than a default assumption; the simpler alternative — paste-only ingestion — is preserved as the mandatory, higher-priority core (tasks.md Phases 3–7) and these integrations are structured as strictly optional, cut-first layers (tasks.md Phases 8–11) so the memory demonstration never depends on them, per Principle XV |
