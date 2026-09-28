# Research: Meeting Continuity Agent

**Feature**: [spec.md](./spec.md) | **Constitution**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md)

This document resolves every open technical decision implied by the feature spec and the
user-supplied stack constraints, so Phase 1 design can proceed without `NEEDS CLARIFICATION`
markers in the Technical Context.

## 1. LLM Provider Abstraction

**Decision**: Define a single `LLMProvider` protocol (`generate_structured(prompt, response_schema,
...) -> dict`) in `backend/integrations/llm/provider.py`. Implement a `GroqProvider` as the primary,
default implementation (Groq's OpenAI-compatible structured output / tool-calling API, chosen for
low latency in a live demo). Implement a `FoundryProvider` behind the same interface for
Microsoft Foundry-hosted models, selected via an environment variable
(`LLM_PROVIDER=groq|foundry`). All agent/analyzer code depends only on the protocol, never on a
concrete provider.

**Rationale**: The stack instructions require "a configurable LLM with structured output/function
calling" and explicitly require the provider to sit "behind an abstraction." Groq is named as a
concrete option and offers fast structured/tool-calling output suitable for a live demo; Foundry is
offered as the enterprise/configurable alternative. A protocol with two thin adapters satisfies both
without coupling business logic to either vendor's SDK (Constitution Principle IX: Technical
Quality — separation of concerns; Principle XV: Engineering Decision Rule — the simpler
two-adapter abstraction beats a generic multi-provider plugin system nobody asked for).

**Alternatives considered**: A full plugin registry supporting arbitrary providers was rejected as
unnecessary infrastructure for a hackathon MVP (Principle XIII, XV). Calling Groq directly with no
abstraction was rejected because it would violate the explicit "keep the LLM provider behind an
abstraction" instruction and make swapping to Foundry for a demo variant harder.

## 2. Agent Orchestration Framework

**Decision**: Use the Microsoft Agent Framework to implement exactly two agents:
- **Meeting Analyzer Agent** — turns a normalized transcript into structured durable-memory
  candidates (decisions, commitments, concerns, requirements, preferences, unresolved questions,
  follow-ups, priority changes, outcomes) plus commitment-resolution signals, using structured
  output (a Pydantic schema passed as the agent's response schema).
- **Preparation Agent** — turns recalled Hindsight facts + the current meeting's context into a
  Relationship Brief, again via structured output, explicitly separating `confirmed` (cited) items
  from `suggested` items.

Do **not** use the framework's `HindsightProvider` auto context-provider integration (recall
before every run / retain after every run). Instead, call the Hindsight Python SDK directly from a
dedicated adapter (`backend/integrations/hindsight/client.py`) at the specific points the workflow
requires (see §4–5).

**Rationale**: The stack instructions say "prefer Microsoft Agent Framework where appropriate" and
"do not introduce multiple agent frameworks" — a single framework hosting both agents satisfies
this with minimal surface area. However, the framework's built-in Hindsight context provider
recalls/retains automatically around every agent turn with no control over *what* is retained,
*which* facts are prioritized, or *how* stateless vs. memory-enabled comparison is produced — all
of which are explicit, testable functional requirements (FR-006a, FR-012/013/014, FR-017). Explicit
adapter calls are required to meet those requirements and to keep retain/recall auditable and
demoable, per Constitution Principle IX (modular architecture; provider-specific code isolated from
business logic) and Principle VI (Trust and Traceability).

**Alternatives considered**: Using `HindsightProvider` directly was rejected for the reasons above.
Introducing a second agent framework (e.g., LangGraph) alongside Agent Framework was rejected per
the explicit "do not introduce multiple agent frameworks unnecessarily" instruction.

## 3. Memory Bank Topology

**Decision**: One Hindsight memory bank per Relationship, with a deterministic `bank_id` derived
from the relationship's unique name/label (e.g., `rel-<slugified-name>`), created automatically the
first time that relationship is referenced (mirrors the auto-create decision already recorded in
spec.md's Clarifications). Every retain/recall call for that relationship targets only its bank.

**Rationale**: Hindsight's best-practice guidance is "one bank per user is the most common pattern
... banks do not share data" — a Relationship is this product's unit of isolation (the spec's
"never expose one person's meeting information to another user" boundary, and more specifically
here, one relationship's memory must never leak into another relationship's brief). Bank-level
isolation gives that guarantee structurally, with no risk of a tag-filtering bug leaking memories
across relationships (Constitution Principle VII: Privacy and Data Minimization). It also keeps the
per-relationship "delete everything for this relationship" story trivial (delete the bank).

**Alternatives considered**: A single shared bank with a `relationship:<slug>` tag on every memory,
filtered with `tags_match="all_strict"` at recall time, was considered (this is Hindsight's
documented multi-tenant pattern). Rejected as the *primary* isolation mechanism because a single
missed tag on one retain call would leak memory across relationships with no structural backstop —
too risky for a demo whose core claim is "we don't invent or leak history." A `relationship:<slug>`
tag is still applied on every retained item as defense-in-depth and to keep the design extensible if
a future multi-user version moves to a shared-bank-per-user model with per-relationship tags.

**Deferred (out of MVP scope)**: If the product ever supports multiple professionals (multiple end
users), each user's relationship banks would additionally be namespaced by user
(`bank_id = f"{user_id}-rel-{slug}"`), per Constitution Principle XIII (Scope Control) — full
multi-user auth is explicitly out of scope for this feature.

## 4. What Gets Retained (and What Doesn't)

**Decision**: The Meeting Analyzer Agent's structured output — not the raw transcript — is what
gets retained. Retain is called once per meeting with:
- `content`: a normalized, attributed pseudo-transcript containing only the durable items the
  analyzer identified (each line formatted as `[category] Speaker (timestamp): statement`), omitting
  greetings, small talk, and scheduling logistics.
- `context`: a specific, descriptive label, e.g. `"Meeting with {relationship_name} on {date}:
  {meeting_title}"`.
- `document_id`: `f"meeting-{meeting_id}"` (stable, one document per meeting — never a random UUID).
- `timestamp`: the meeting's start date/time (ISO 8601), or `"unset"` only if genuinely unknown.
- `tags`: `["relationship:<slug>", "meeting:<meeting_id>"]`.
- `entities`: explicit entries for every resolved participant (`type="PERSON"`) and the
  relationship's organization if known (`type="ORG"`), so speaker attribution survives into the
  knowledge graph even when the LLM's own extraction is ambiguous.

**Rationale**: This is a deliberate middle ground between two conflicting constraints. Hindsight's
own best practice says "never pre-summarize before retain — it loses entity relationships, temporal
markers, and structural context." The stack instructions say "do not blindly store raw transcripts"
and enumerate Person/Relationship/Commitment/Decision/Concern/Open-Issue as the things to store, not
raw audio or every sentence. Retaining the *analyzer's structured, attributed extraction* (not a
flattened summary sentence, and not the full raw transcript) preserves per-statement attribution and
timestamps — the structure Hindsight's extractor needs — while still filtering out everything that
isn't durable, satisfying both constraints and Constitution Principle VII (data minimization) and
Principle IX (never blindly store raw transcripts).

**Alternatives considered**: Retaining the full raw transcript verbatim was rejected (explicitly
disallowed by the stack instructions, and higher privacy/data-minimization risk). Retaining a single
flattened prose summary per meeting was rejected because it collapses per-speaker attribution and
timestamps that later speaker resolution, commitment ownership, and traceability requirements
(FR-004, FR-009, FR-018) depend on.

## 5. Bank Configuration (Missions, Entity Labels)

**Decision**: Configure every relationship bank once, at first creation, with:
- `retain_mission`: "Always extract decisions, commitments (who promised what, to whom, and any
  explicit deadline), concerns/objections, requirements, preferences, unresolved questions,
  follow-up items, important relationship context, and changes in priorities. Ignore greetings,
  small talk, and pure scheduling logistics."
- `observations_mission`: "Identify evolving preferences, recurring concerns, and changes in
  priorities across meetings. Explicitly flag when new information contradicts an earlier decision,
  estimate, or preference (e.g., a changed timeline or budget) rather than silently replacing it."
- `entity_labels`: two label groups —
  - `memory_type` (`type: "value"`, `tag: true`): `decision | commitment | concern | requirement |
    preference | unresolved_question | follow_up | context | priority_change | outcome`.
  - `commitment_status` (`type: "value"`, `tag: true`): `outstanding | resolved | unknown` —
    applied only to `memory_type:commitment` facts.

**Rationale**: Per Hindsight's own guidance, "misconfigured missions are the single biggest cause of
low-quality memories," and the categories above are a direct restatement of spec.md's Relationship
Memory requirement (FR-002) and constitution Principle IV. Tagging `memory_type` at retain time is
what makes FR-006a (always include unresolved commitments/issues regardless of age) and the
Relationship Memory / Preparation Brief structure possible via cheap tag filters instead of
re-classifying facts on every recall. `commitment_status` gives the Promise Tracker (Story 4 /
FR-009–011) a queryable, curatable state.

**Alternatives considered**: Skipping entity labels and classifying facts client-side after a
generic recall was rejected — it would require pulling the entire bank on every prep request to
re-classify, defeating the "don't dump all memories into the LLM" instruction (§10) and FR-006a's
bounded-context requirement.

## 6. Commitment Status Transitions

**Decision (revised during implementation — see note below)**: Hindsight's documented memory-curation
endpoint (`client.memory.update_memory(bank_id, memory_id, UpdateMemoryRequest(...))`) can edit a
fact's `text`, dates, `fact_type`, `entities`, or `state` — it does **not** edit `tags`. The original
design in this section (patching the `commitment_status` tag in place) is not achievable with the
real API and has been replaced with: when the Meeting Analyzer detects that a new meeting indicates
a prior commitment was fulfilled or is no longer relevant, the backend retains a **new** fact — tagged
`memory_type:commitment_resolution` — whose text names the original commitment and states it is now
resolved (e.g., "Commitment resolution: the architecture document promised in the meeting on
2026-01-10 was sent, per the meeting on 2026-01-24"), with `document_id`/`tags`/`timestamp` pointing
at the *new* meeting. The original commitment fact is never edited or invalidated — it remains the
historical record of what was promised and when. At brief-generation time, the Preparation Agent
(research.md §8) is given both `memory_type:commitment` and `memory_type:commitment_resolution`
facts for the relationship and is responsible for pairing each commitment with any resolution fact
that names it, reporting `status: resolved` only when a clear pairing exists and `status: outstanding`
otherwise.

**Rationale**: This satisfies FR-010 using only documented, verified Hindsight operations (retain +
recall), with no dependency on an unconfirmed tag-editing capability. Keeping the original commitment
fact untouched is also a better fit for Constitution Principle VI (traceability) than editing it in
place would have been — the full history (promise → later resolution) stays visible as two distinct,
separately-cited facts rather than one fact whose past state is only visible through an edit log.

**Alternatives considered**: The original "PATCH the tag" design was rejected once shown to be
unsupported by the real API (see above). Relying purely on Hindsight's automatic observation
consolidation (letting the `observations_mission` synthesize "this commitment is now resolved" on its
own) was rejected for the demo path because it is autonomous and not guaranteed to resolve on the
same turn as the query — the explicit commitment/commitment_resolution pairing in the Preparation
Agent's own structured-output prompt keeps this deterministic and testable.

**Note**: This correction was made during `/speckit-implement` (tasks T008, T046/T047) after
directly re-verifying the Hindsight memories API documentation, which does not expose a tags-editing
field on `update_memory`. data-model.md's `commitment_status` entity-label description and
tasks.md's T008/T045/T047 task text describing a "PATCH" flow are superseded by this section; the
actual implementation retains a `commitment_resolution` fact instead of patching tags.

## 7. Recall / Retrieval Strategy for Meeting Preparation

**Decision**: Preparing a brief issues two recall calls against the relationship's bank, per the
FR-006a ranking rule (relevance first, recency as tiebreaker, unresolved items always included):

1. **Relevance-ranked context recall**: `recall(bank_id, query=<derived from meeting title/agenda +
   "what should I know before this meeting?">, types=["world","experience","observation"],
   prefer_observations=true, budget="mid", max_tokens=3000, include={"entities": true})`. This is the
   bounded, relevance/recency-ranked pool that becomes the bulk of the brief.
2. **Unresolved-items recall**: `recall(bank_id, query="open commitments and unresolved issues",
   tags=["memory_type:commitment"], tags_match="any_strict"` (combined via `tag_groups` OR with
   `memory_type:unresolved_question`), `budget="low", max_tokens=1000)`, additionally filtered
   client-side to `commitment_status != resolved` for commitments. These are always merged into the
   brief regardless of how they scored in call 1, satisfying the "always include unresolved
   commitments/issues regardless of age" clarification.

Both calls set `query_timestamp` to the current time so recency scoring and any relative temporal
language ("last time," "recently") resolve correctly.

**Rationale**: This directly implements the clarified FR-006a rule using Hindsight's documented
`budget`/`max_tokens`/`tags`/`prefer_observations` parameters rather than pulling the whole bank and
ranking client-side, keeping context bounded per §10 of the stack instructions ("do not dump all
memories into the LLM. Prioritize relevant, recent, unresolved and participant-specific
information").

**Alternatives considered**: A single recall call with a very high `max_tokens` was rejected — it
cannot guarantee old-but-unresolved items survive relevance ranking, which is exactly the gap
FR-006a was written to close.

## 8. Recall vs. Reflect for Brief Generation

**Decision**: Use `recall` (raw ranked facts) feeding a locally controlled, structured-output
Preparation Agent call — not Hindsight's `reflect` endpoint — to produce the brief.

**Rationale**: `reflect` performs its own autonomous synthesis and returns a narrative answer, which
would blur the CONFIRMED-FROM-MEMORY vs. SUGGESTED-BY-AGENT distinction the spec requires (FR-017)
and make per-claim source citation (FR-018, meeting/date/participant/category) harder to guarantee.
Recall returns individually citable facts (each with `document_id`, `occurred_start`,
`mentioned_at`, `tags`); the Preparation Agent's own structured-output prompt is instructed to
attribute every historical claim to the recalled fact(s) it came from and to keep inferred talking
points in a clearly separate field. This gives full control over grounding and hallucination
safeguards (Constitution Principle V, VI).

**Alternatives considered**: Using `reflect` with a `response_schema` was considered (it does
support structured output) but rejected because reflect's internal reasoning loop is not required to
preserve a 1:1 mapping between output claims and source facts, which is exactly the guarantee the
constitution and spec demand.

## 9. Stateless vs. Memory-Enabled Comparison

**Decision**: The same Preparation Agent entry point takes a `mode: "stateless" | "memory_enabled"`
parameter. In `stateless` mode, both Hindsight recall calls (§7) are skipped entirely and the agent
is given only the current request's own input (the relationship name/title, and — if the request is
itself attached to a just-submitted meeting — that meeting's own extracted items, since those come
from "the current interaction" per spec.md's definition of stateless). In `memory_enabled` mode, the
recalled facts from §7 are injected as additional structured context before the same prompt runs.

**Rationale**: This directly implements FR-012/013/014 with a single code path (no duplicated
prompt/logic), which lowers the risk of the two modes drifting apart and undermining the
demo's core comparison (Constitution Principle II, XV — simplest implementation that still proves
the point).

## 10. Speaker Resolution

**Decision**: Transcript segments carry a `speaker_id` from the transcript source (Google Meet
participant ID, or an unlabeled index for pasted text/uploaded audio). A lightweight resolution
step maps `speaker_id → calendar/Meet participant → Person entity` using calendar attendee data when
available; when a transcript segment cannot be confidently mapped (no calendar participant match,
or pasted/plain notes with no participant list at all), the speaker is stored as
`speaker_name: "Unknown"` and never silently attributed to a specific person.

**Rationale**: Directly satisfies §7 of the stack instructions ("never invent speaker identity...
mark the speaker as unknown") and Constitution Principle VI (must not invent facts).

## 11. Conflicting Information Across Meetings

**Decision**: Conflicts are surfaced, not silently resolved, at brief-generation time: the
Preparation Agent's prompt is given all relevant recalled facts (not just the most recent) for a
given topic/entity, and instructed — per its `observations_mission`-tagged contradiction signal
(§5) and its own structured-output schema — to emit a `conflicts[]` array (each with the earlier
claim, the later claim, their respective source meetings, and a recommendation to confirm) whenever
two recalled facts about the same topic disagree, rather than picking one. The most-recent-value
default recorded in spec.md's Assumptions ("most recent wins") applies only when *no* conflict is
detected by the agent — i.e., recency is the tiebreak for ranking/selection, not a license to discard
the earlier fact from the graph or hide it from the user.

**Rationale**: Matches §12 of the stack instructions exactly ("if memories conflict, show both
instead of silently choosing one") and Constitution Principle VI (traceability) — reconciles the
spec's "most recent wins" assumption (which governs what counts as *current state* for planning
purposes) with the stricter UX requirement to flag rather than hide the conflict.

## 12. Google Calendar / Meet / Sarvam STT — Provider Isolation

**Decision**: All three integrations are implemented as thin adapters under
`backend/integrations/{google,sarvam}/`, each exposing a narrow, provider-agnostic interface to the
rest of the backend (`CalendarProvider.list_upcoming()`, `MeetProvider.get_transcript(conference_id)`,
`SttProvider.transcribe(audio) -> Transcript`). Business logic (meeting ingestion, analysis, memory
extraction) never imports a Google or Sarvam SDK directly.

**Rationale**: Directly satisfies §14 of the stack instructions ("keep provider-specific code
isolated from business logic") and Constitution Principle IX. It also means the core Hindsight
memory demonstration (Phases 1–2 of the implementation phases) can be built and demoed before any
of these integrations exist, since ingestion can be satisfied by the manual transcript/notes path
alone — consistent with §20's phase ordering and Principle XV.

## Summary of Resolved Unknowns (Technical Context)

| Unknown | Resolution |
|---|---|
| LLM provider | Groq (primary) + Microsoft Foundry (secondary), behind one `LLMProvider` protocol |
| Agent framework | Microsoft Agent Framework, two agents (Meeting Analyzer, Preparation Agent) |
| Memory storage | Hindsight only; one bank per Relationship; no additional vector DB |
| What is retained | Analyzer's structured, attributed extraction — not raw transcript, not a flat summary |
| Retrieval strategy | Two-call recall: relevance/recency-ranked bulk + always-included unresolved items |
| Commitment status updates | Hindsight `PATCH .../memories/{id}` tag edit, not duplicate facts |
| Stateless/memory-enabled | One Preparation Agent entry point, one `mode` parameter |
| Speaker identity | Resolved via calendar/Meet participant match; unresolved → "Unknown", never invented |
| Conflicting facts | Surfaced explicitly in the brief as a `conflicts[]` list, not silently overwritten |
| Google/Sarvam integration boundary | Thin adapters behind narrow interfaces; core demo works without them |
