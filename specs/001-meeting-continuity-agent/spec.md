# Feature Specification: Meeting Continuity Agent

**Feature Branch**: `001-meeting-continuity-agent`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Build a Meeting Continuity Agent for professionals who repeatedly meet with the same clients, stakeholders, customers, or colleagues. The agent should use persistent Hindsight memory to recall relevant information (decisions, commitments, concerns, preferences, unresolved questions, priority changes) from previous meetings and use it to prepare the user for future meetings, producing a relationship-aware meeting preparation brief. The product must clearly demonstrate the difference between stateless and memory-enabled behavior, track commitments across meetings, ground historical claims in retained meeting information without inventing facts, and remain simple and demoable for a hackathon audience."

## Clarifications

### Session 2026-09-28

- Q: When a user submits meeting notes naming a relationship that doesn't exist yet, should the system automatically create that relationship, or require the user to explicitly create/select it first? → A: Auto-create a new relationship automatically the first time its name/label is used in a submitted meeting
- Q: When a second, genuinely different relationship is given the same name/label as an existing one, how should the system handle it? → A: Treat the name/label as the unique identifier for a relationship; same name always means the same relationship (user must use distinguishing labels for same-named contacts)
- Q: As a relationship's meeting history grows, how should the system keep the preparation brief concise rather than dumping everything it has ever stored? → A: Rank by relevance to the current request, breaking ties by recency; always include unresolved commitments/issues regardless of age

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture and Retain Meeting Memory (Priority: P1)

A professional pastes in the notes or transcript from a meeting they just had with a
client, stakeholder, or colleague. The system reads the content, identifies the
durable information worth remembering (decisions, commitments, concerns,
preferences, requirements, unresolved questions, follow-ups, priority changes,
outcomes), and retains it as memory associated with that relationship. The user can
see what was extracted and stored.

**Why this priority**: Without reliable capture and retention, there is no memory to
recall later. This is the foundation every other story depends on, and it is the
first thing a demo viewer sees.

**Independent Test**: Can be fully tested by submitting a single meeting's notes for
a relationship and confirming that the system displays a list of extracted durable
items (decisions, commitments, concerns, etc.) that were saved to memory — without
needing any later meeting or recall step.

**Acceptance Scenarios**:

1. **Given** a new relationship with no prior meetings, **When** the user submits
   meeting notes containing a decision, a commitment made by the user, and a concern
   raised by the other participant, **Then** the system extracts and stores all three
   as distinct, labeled memory items associated with that relationship.
2. **Given** meeting notes that contain no clearly durable information (e.g., pure
   small talk), **When** the user submits them, **Then** the system indicates that
   little or nothing durable was found rather than fabricating memory items.
3. **Given** a submitted meeting, **When** extraction completes, **Then** the user
   can view the extracted items alongside a reference back to that specific meeting.

---

### User Story 2 - Personalized Meeting Preparation Brief (Priority: P2)

Before an upcoming meeting, the user asks the agent to prepare them for a meeting
with a specific person or organization. The agent retrieves relevant memories
accumulated from all prior meetings with that relationship and produces a concise
Preparation Brief: what matters to this person, prior concerns, prior decisions,
outstanding commitments (the user's and the other participant's), unresolved issues,
recent changes, suggested talking points, and follow-up questions.

**Why this priority**: This is the core value-delivering moment of the product — the
point where accumulated memory is converted into something immediately useful.

**Independent Test**: Can be fully tested by seeding two or more prior meetings for a
relationship, then requesting preparation for that relationship and confirming the
brief surfaces information drawn from those prior meetings with no other steps
required.

**Acceptance Scenarios**:

1. **Given** a relationship with two prior meetings containing a budget concern, a
   deployment deadline, and a commitment made by the user, **When** the user requests
   a preparation brief for that relationship, **Then** the brief includes the budget
   concern, the deadline, and the outstanding commitment.
2. **Given** a relationship with prior meetings, **When** the brief is generated,
   **Then** each historical claim in the brief indicates which prior meeting it came
   from, where practical.
3. **Given** a relationship with no prior meetings on record, **When** the user
   requests a preparation brief, **Then** the system explicitly states that no
   historical information is available rather than inventing content.

---

### User Story 3 - Stateless vs. Memory-Enabled Comparison (Priority: P3)

A user or demo viewer wants to see, side by side or in sequence, what the agent
produces when it has no access to accumulated memory versus what it produces when it
draws on Hindsight memory for the same relationship and request.

**Why this priority**: This comparison is the single clearest way to prove the
product's central claim — that persistent memory, not general AI capability, drives
the improved output. It is essential for judging and demo credibility but depends on
Stories 1 and 2 already working.

**Independent Test**: Can be fully tested by triggering the same "prepare me for this
meeting" request once in a stateless mode and once in a memory-enabled mode for a
relationship with existing history, and comparing the two outputs directly.

**Acceptance Scenarios**:

1. **Given** a relationship with accumulated meeting history, **When** the user
   triggers the stateless version of the request, **Then** the response is generic
   and does not reference any specific prior meeting content.
2. **Given** the same relationship and request, **When** the user triggers the
   memory-enabled version, **Then** the response includes specific historical details
   (concerns, commitments, decisions) not present in the stateless response.
3. **Given** both outputs, **When** displayed to a user, **Then** it is visually or
   textually clear which response is stateless and which is memory-enabled.

---

### User Story 4 - Commitment (Promise) Tracking Across Meetings (Priority: P4)

As meetings accumulate for a relationship, the system keeps a running record of
commitments made by the user and by other participants, including what was promised,
when, and (when known) whether it has since been resolved. The next preparation
brief surfaces commitments that are still unresolved.

**Why this priority**: Commitment tracking is a distinct, high-value capability
called out explicitly in the product requirements, but it builds on capture (Story 1)
and is surfaced through the brief (Story 2), making it a natural next increment.

**Independent Test**: Can be fully tested by submitting two meetings where the first
contains a commitment and the second contains no mention of it being resolved, then
requesting a preparation brief and confirming the commitment appears as unresolved
with who made it and when.

**Acceptance Scenarios**:

1. **Given** a meeting in which the user promises to send a document, **When** the
   meeting is processed, **Then** the system records a commitment with who made it,
   what was promised, and which meeting it came from.
2. **Given** a later meeting in which that commitment is mentioned as fulfilled,
   **When** that meeting is processed, **Then** the commitment's status updates to
   resolved and it no longer appears as outstanding in future briefs.
3. **Given** a commitment that has not been mentioned as resolved in any later
   meeting, **When** a preparation brief is generated, **Then** that commitment
   appears in the brief's outstanding commitments.

---

### User Story 5 - Ad Hoc Relationship Continuity Questions (Priority: P5)

The user asks the agent a free-form question about a relationship — such as what a
person cared about previously, what was promised last time, what changed since the
last meeting, or what remains unresolved — and receives an answer grounded in stored
memory, through a single conversational interface rather than separate screens.

**Why this priority**: This extends the value of accumulated memory beyond the fixed
brief format, but it is an enhancement on top of the retrieval and grounding
capability already required for Story 2, so it can be delivered last without blocking
the core demo.

**Independent Test**: Can be fully tested by asking a specific historical question
about a relationship with existing memory and confirming the answer is grounded in
stored content, and separately asking about a relationship or topic with no stored
memory and confirming the system says it doesn't have enough information.

**Acceptance Scenarios**:

1. **Given** a relationship with stored preferences, **When** the user asks what that
   person cares about, **Then** the answer reflects preferences and concerns actually
   captured from prior meetings.
2. **Given** a topic with no supporting stored memory, **When** the user asks about
   it, **Then** the system states it does not have enough information rather than
   guessing.

---

### Edge Cases

- What happens when the user submits an empty or whitespace-only meeting input?
- What happens when meeting input is malformed or unintelligible (e.g., corrupted
  text, non-meeting content)?
- How does the system behave when a preparation brief is requested for a relationship
  that does not exist yet (i.e., its name/label has never been used in a submitted
  meeting)? It should state that no such relationship is on record rather than
  inventing one.
- What happens when the underlying Hindsight memory service is unavailable or returns
  an error during retention or recall?
- How does the system handle contradictory information across meetings (e.g., a
  priority or preference that changed)? It should treat later information as the
  current state while still preserving the earlier information as history.
- What happens when a meeting mentions a commitment with no clear owner or no clear
  deadline?
- What happens when a relationship has a very large number of accumulated meetings?
  The brief ranks retained memory by relevance to the current request (recency as a
  tiebreaker) and always includes unresolved commitments/issues regardless of age,
  rather than dumping all raw history.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a user to submit meeting information (notes or
  transcript text) as free-form text associated with a specific relationship (person,
  client, stakeholder, or team), identified by a name or label the user supplies with
  the submission.
- **FR-002**: The system MUST parse submitted meeting content and identify candidate
  durable information items, including decisions, commitments made by the user,
  commitments made by other participants, concerns, objections, requirements,
  preferences, unresolved questions, follow-up items, important context, priority
  changes, and outcomes.
- **FR-003**: The system MUST persist identified durable information as memory
  associated with the relationship it came from, using the Hindsight memory service,
  such that it can be retrieved in later interactions.
- **FR-004**: The system MUST associate every retained memory item with a reference
  to the specific meeting it originated from.
- **FR-005**: The system MUST allow a user to request a meeting preparation brief for
  a named relationship.
- **FR-006**: When a preparation brief is requested, the system MUST retrieve
  relevant historical memory for that relationship from Hindsight before composing
  the brief.
- **FR-006a**: When a relationship's accumulated memory exceeds what can be
  concisely presented, the system MUST select what to include by ranking memory
  items by relevance to the current request, using recency as a tiebreaker, and MUST
  always include unresolved commitments and unresolved issues regardless of age.
- **FR-007**: The preparation brief MUST include, where supporting memory exists: a
  relationship/context summary, what matters to the person or organization, previous
  concerns or objections, important prior decisions, the user's outstanding
  commitments, other participants' outstanding commitments, unresolved issues,
  relevant recent changes, suggested talking points, and follow-up questions.
- **FR-008**: The system MUST allow the user to identify or select which relationship
  a meeting or preparation request applies to, and MUST automatically create a new
  relationship record the first time a given name/label is used in a submitted
  meeting, without requiring a separate setup step.
- **FR-009**: The system MUST track commitments as discrete records capturing, at
  minimum, who made the commitment, what was promised, and which meeting it came
  from; it MUST also capture an expected deadline and a status when that information
  is explicitly present in the meeting content.
- **FR-010**: The system MUST update a commitment's status when a later meeting for
  the same relationship indicates that commitment has been fulfilled or is no longer
  relevant.
- **FR-011**: The system MUST identify unresolved issues and outstanding commitments
  for a relationship and surface them in the preparation brief.
- **FR-012**: The system MUST provide a mode of operation that produces a response
  using only information available in the current interaction, without drawing on
  stored historical memory (the "stateless" mode).
- **FR-013**: The system MUST provide a mode of operation that draws on retained
  Hindsight memory for the relationship (the "memory-enabled" mode), and MUST make it
  possible to invoke both modes for the same relationship and request so their
  outputs can be compared.
- **FR-014**: The system MUST clearly label or distinguish stateless output from
  memory-enabled output wherever both are shown to the user.
- **FR-015**: The system MUST NOT present a historical claim (a commitment, decision,
  concern, preference, or deadline) that is not grounded in previously retained
  meeting memory.
- **FR-016**: The system MUST indicate, in the preparation brief and in conversational
  answers, when requested historical information is unavailable or when confidence in
  a piece of information is uncertain, rather than presenting it as a confirmed fact.
- **FR-017**: The system MUST distinguish, in its output, between historical facts
  drawn from prior meetings, current information from the meeting or request just
  submitted, and any inferred suggestions the agent generates (such as talking
  points).
- **FR-018**: Where practical, the system MUST allow the user to see which prior
  meeting a piece of historical information in the brief came from.
- **FR-019**: The system MUST support a conversational interface through which a user
  can ask relationship-continuity questions (e.g., what a person cared about
  previously, what was promised last time, what is unresolved, what changed since the
  last meeting) and receive answers grounded in retained memory.
- **FR-020**: The system MUST allow a user to add multiple meetings over time for the
  same relationship, with each new meeting's extracted memory added to that
  relationship's accumulated history.
- **FR-021**: The system MUST handle empty or malformed meeting input by informing
  the user that no usable meeting content was found, without failing silently or
  fabricating extracted items.
- **FR-022**: The system MUST handle failures from the Hindsight memory service (or
  equivalent retention/recall failures) by informing the user that memory could not
  be stored or retrieved, without crashing or silently returning fabricated results.
- **FR-023**: The system MUST NOT store secrets, credentials, or API keys as part of
  retained meeting memory.
- **FR-024**: The system MUST NOT expose one user's relationship memory to a
  different user of the system.
- **FR-025**: The system MUST display, after a meeting is submitted, a visible summary
  of what was extracted and retained from that meeting, so the user can confirm what
  the system now remembers.

### Key Entities *(include if feature involves data)*

- **Relationship**: Represents an ongoing professional relationship with a specific
  person, client, stakeholder, or team. Identified uniquely by its name/label (one
  name always maps to one relationship); created automatically the first time its
  name/label appears in a submitted meeting. Accumulates meetings and memory over
  time.
- **Meeting**: A single submitted meeting record (notes or transcript) tied to one
  Relationship, with a date/sequence and the raw input it was derived from.
- **Memory Item**: A discrete piece of durable information (decision, concern,
  preference, requirement, unresolved question, context, priority change, or
  outcome) extracted from a Meeting, tied to the Relationship and traceable to its
  source Meeting.
- **Commitment**: A specific type of memory item representing a promise, capturing
  who made it (the user or another participant), what was promised, the source
  meeting, an optional deadline, and a status (outstanding, resolved, or unknown).
- **Preparation Brief**: The generated output for an upcoming meeting with a
  Relationship, composed of summarized and cited Memory Items and Commitments,
  distinguishing historical fact from inferred suggestion.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can submit a typical meeting's worth of notes and see the
  system's extracted, retained memory items within a few seconds.
- **SC-002**: For a relationship with three or more prior meetings, at least 90% of
  the concerns, decisions, and commitments actually present in those prior meetings
  and relevant to the requested topic appear in the generated preparation brief.
- **SC-003**: For the same relationship and request, the memory-enabled response
  contains at least three specific historical details (a concern, commitment, or
  decision) that the stateless response does not contain, making the difference
  between the two immediately apparent.
- **SC-004**: 100% of historical claims presented in a preparation brief are either
  traceable to a specific prior meeting or explicitly flagged as uncertain or
  unavailable.
- **SC-005**: A first-time viewer can understand the product's core value
  proposition — that it remembers what matters between meetings — within
  approximately one minute of seeing a live demo.
- **SC-006**: Across the demo scenarios, the system produces zero fabricated
  commitments, decisions, concerns, or meetings not present in the submitted meeting
  history.
- **SC-007**: A user can go from submitting a new meeting to seeing what was
  remembered from it in under two minutes end to end.
- **SC-008**: A user preparing for a third or later meeting with an established
  relationship receives a preparation brief that is measurably more specific
  (containing more relationship-specific details) than the brief that would have been
  produced after only the first meeting.

## Assumptions

- The system is used by a single professional (single-user prototype); multi-tenant
  authentication, role-based access, and organization-level permissions are out of
  scope for this feature, consistent with the project constitution's scope control
  principle. A simple, explicit mechanism to keep one user's data separate from
  another's is still required (FR-024), but a full authentication system is not.
- Meeting information is provided as pasted text (notes or transcript) for the
  independently testable scope of Stories 1–5 above, and this text-paste path alone
  is sufficient to demonstrate every requirement in this specification end to end.
  Google Calendar/Meet integration, audio recording upload, and Sarvam
  batch/real-time speech-to-text are an explicitly optional ingestion-layer
  expansion, requested directly by the project stakeholder during planning (see
  plan.md's Complexity Tracking entry), layered on top of this same paste-based
  pipeline without changing any requirement above. They remain lower-priority than
  Stories 1–5 and MUST be cut first if time is short, per the project constitution's
  Engineering Decision Rule.
- A "relationship" is identified by a user-provided name or label (e.g., a person's
  name or an organization/client name), which acts as its unique identifier; the
  system does not need to integrate with an external contacts/CRM system to resolve
  identity. Users with two distinct contacts who share a first name are expected to
  use a distinguishing label (e.g., "Rahul – Acme Corp").
- When two meetings for the same relationship contain conflicting information (e.g.,
  a changed priority or preference), the most recent meeting's information is treated
  as the current state, while the earlier information is retained as prior history
  rather than discarded.
- Demo and test data will be realistic but synthetic, following the project
  constitution's requirement for realistic (not toy) scenarios, unless the user
  supplies real data suitable for use.
- "Hindsight" refers to the persistent memory service/platform required by the
  hackathon; this specification treats it as the system of record for retained
  memory without prescribing its internal API or implementation, per planning-phase
  separation of concerns.
- Reasonable interactive prototype performance (on the order of a few seconds per
  extraction or retrieval operation) is acceptable; formal production-scale
  performance targets are not required for the hackathon MVP.
