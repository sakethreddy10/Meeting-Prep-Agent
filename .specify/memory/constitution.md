<!--
Sync Impact Report
==================
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: none (initial adoption; all 15 principles newly defined)
Added sections:
  - Core Principles I–XV (Memory-First Product Design; Clear Before/After Memory
    Demonstration; Real Professional Workflow; Relationship Memory; Actionable Memory;
    Trust and Traceability; Privacy and Data Minimization; Simple, Demoable User
    Experience; Technical Quality; Hackathon Demonstrability; Realistic Data; Content
    and Documentation Requirements; Scope Control; Judging Alignment; Engineering
    Decision Rule)
  - Success Metrics & Judging Alignment (used in place of template's generic
    [SECTION_2_NAME])
  - Development Workflow & Quality Gates (used in place of template's generic
    [SECTION_3_NAME])
  - Governance (amendment procedure, versioning policy, compliance review)
Removed sections: none
Templates requiring updates:
  - .specify/templates/plan-template.md — ⚠ pending manual review for a Constitution
    Check gate referencing these 15 principles
  - .specify/templates/spec-template.md — ⚠ pending manual review to ensure memory
    before/after demonstration and traceability requirements are reflected in spec
    acceptance criteria
  - .specify/templates/tasks-template.md — ⚠ pending manual review to ensure task
    breakdown separates ingestion/extraction/Hindsight/retrieval/reasoning/presentation
    per Principle IX
  - .specify/templates/checklist-template.md — no update required (generic)
Follow-up TODOs: none (all placeholders resolved from user-supplied input)
-->

# Meeting Continuity Agent Constitution

## Core Principles

### I. Memory-First Product Design
Hindsight memory MUST be central to the agent's functionality, not an optional add-on.
The application MUST demonstrate that the agent becomes more useful because of
information retained from previous interactions. The product MUST NOT merely store
meeting transcripts. Memory MUST influence future outputs such as meeting
preparation, reminders, relationship context, unresolved commitments, and talking
points.

**Rationale**: The hackathon's central requirement is AI agents that learn using
Hindsight. If memory does not visibly change agent behavior, the product fails its
core premise regardless of how polished the surrounding features are.

### II. Clear Before/After Memory Demonstration
The product MUST make it possible to demonstrate behavior without accumulated memory
versus behavior with accumulated memory. The demo MUST clearly show that a stateless
agent produces generic context while the memory-enabled agent produces personalized,
historically grounded responses. The project MUST demonstrate a learning progression
across multiple meetings/interactions.

**Rationale**: Judges and viewers need an unambiguous, side-by-side signal that
memory — not general LLM capability — is producing the improved output.

### III. Real Professional Workflow
The product MUST solve a realistic professional problem. The primary workflow is
maintaining continuity across repeated meetings with the same person, client,
stakeholder, or team. The product MUST NOT be a generic chatbot or generic meeting
summarizer. The product MUST focus on one persona, one workflow, and one clear value
proposition.

**Rationale**: Scope discipline around a single realistic workflow produces a more
convincing and more buildable demo than a broad, generic tool.

### IV. Relationship Memory
The agent MUST prioritize retaining information that remains useful across meetings,
including: decisions; commitments made by the user; commitments made by other
participants; concerns and objections; requirements; preferences; unresolved
questions; important context; changes in priorities; follow-up items; and historical
outcomes where relevant.

**Rationale**: These categories are the substance of professional relationship
continuity; without them the agent has nothing meaningful to recall or act on.

### V. Actionable Memory
Retrieved memories MUST be converted into useful actions or context, not surfaced as
raw data dumps. The agent MUST distinguish between historical facts, current
information, open commitments, and inferred suggestions. The system MUST NOT present
uncertain or inferred information as confirmed fact.

**Rationale**: Memory only has value if it changes what the user does next; conflating
inference with fact would erode trust in the agent's output.

### VI. Trust and Traceability
Meeting-derived information MUST be traceable to its source meeting where practical.
The UI MUST make it clear when information comes from previous meetings. The agent
MUST NOT invent commitments, decisions, concerns, or historical events. When
historical information is unavailable or uncertain, the agent MUST explicitly say so.

**Rationale**: Professional users will only rely on a memory agent if its claims are
verifiable and it is honest about the limits of what it knows.

### VII. Privacy and Data Minimization
Meeting information MUST be treated as potentially sensitive professional
information. The system MUST store only information required for the product's
purpose. One person's meeting information MUST NOT be exposed to another user without
an explicit product-level authorization model. Retained memory MUST NOT include
secrets, API keys, credentials, or unnecessary personal information.

**Rationale**: Professional relationship data is sensitive by nature; minimizing
retention and enforcing access boundaries limits harm from mistakes or misuse.

### VIII. Simple, Demoable User Experience
The primary workflow MUST be understandable within approximately 60 seconds of seeing
the application. The product MUST present a clear flow: meeting information → memory
extraction → Hindsight retention → later recall → meeting preparation. Features that
do not strengthen this workflow MUST be avoided.

**Rationale**: Hackathon judges and viewers form their impression quickly; a workflow
that requires explanation undermines the demo regardless of underlying quality.

### IX. Technical Quality
The architecture MUST remain modular and maintainable. Meeting ingestion, memory
extraction, Hindsight integration, retrieval, reasoning, and presentation concerns
MUST be kept separate. Implementations MUST prefer simplicity over unnecessary
infrastructure. The system MUST handle API failures, malformed meeting input, empty
transcripts, missing memories, and LLM/function-calling failures gracefully.

**Rationale**: Separation of concerns keeps the memory pipeline debuggable and
extensible under hackathon time pressure, and graceful failure handling prevents a
single bad input from derailing a live demo.

### X. Hackathon Demonstrability
The project MUST support a compelling demo showing: an initial meeting; information
being remembered; a later meeting; the agent recalling earlier context; accumulated
commitments and concerns; a personalized meeting preparation brief; and a clear
before/after comparison between stateless and memory-enabled behavior.

**Rationale**: This is the minimum narrative arc required to prove the memory-first
value proposition to an audience in a short demo window.

### XI. Realistic Data
Demonstrations MUST use realistic but synthetic meeting data unless the user
explicitly provides data suitable for use. Demo scenarios MUST resemble genuine
professional interactions and MUST avoid obviously artificial toy examples.

**Rationale**: Unrealistic data undermines credibility with judges evaluating
real-world impact and makes the memory extraction pipeline look untested.

### XII. Content and Documentation Requirements
The finished project MUST make it possible to produce the hackathon-required public
technical article, social media post, 2–5 minute team demo video, GitHub repository,
live project demonstration, and explanation of how Hindsight is used. The article
MUST focus on the engineering story and project/result rather than presenting the
project merely as a hackathon submission.

**Rationale**: These deliverables are hackathon requirements; the product and its
documentation must be built in a way that supports producing them without rework.

### XIII. Scope Control
The team MUST build a polished core workflow rather than a broad platform. Calendar,
Zoom/Meet integrations, CRM integrations, email integrations, authentication systems,
enterprise deployment, and advanced analytics are out of scope for the initial MVP
unless they become directly necessary. The core memory demonstration MUST NOT be
sacrificed for additional integrations.

**Rationale**: Hackathon time is limited; integrations expand surface area for
failure without strengthening the central memory narrative.

### XIV. Judging Alignment
Implementation choices MUST be optimized around the documented judging dimensions:
Innovation (30%), Hindsight Memory (25%), Technical Implementation (20%), User
Experience (15%), and Real-world Impact (10%). Superficial features MUST NOT be added
to game these dimensions; improvements MUST come through a coherent product.

**Rationale**: Effort should be spent where it measurably improves judged outcomes,
and only through genuine product improvements that reinforce the memory story.

### XV. Engineering Decision Rule
Whenever a choice exists between a simpler implementation that clearly demonstrates
persistent memory and a more complex implementation that adds infrastructure without
improving the memory story, the team MUST choose the simpler implementation.

**Rationale**: Complexity that does not strengthen the memory demonstration is pure
risk under hackathon constraints and dilutes the product's central value proposition.

## Success Metrics & Judging Alignment

Every specification, plan, and task MUST be traceable to at least one of the judging
dimensions in Principle XIV. Before implementation work is considered complete for a
feature, the team MUST be able to answer: which judging dimension(s) does this
feature strengthen, and how does it advance the memory-first narrative (Principles I
and II)? Features that cannot answer this MUST be deferred or dropped per Principle
XIII (Scope Control).

## Development Workflow & Quality Gates

Specifications MUST explicitly state which parts of the before/after memory
demonstration (Principle II) and which relationship-memory categories (Principle IV)
they cover. Plans MUST preserve the modular separation required by Principle IX
(ingestion, extraction, Hindsight integration, retrieval, reasoning, presentation) and
MUST NOT introduce integrations excluded by Principle XIII without explicit
justification. Tasks MUST include handling for the failure modes listed in Principle
IX (API failures, malformed input, empty transcripts, missing memories,
function-calling failures) as part of "done," not as a follow-up. Any deviation from
these principles MUST be called out explicitly in the relevant spec or plan with a
stated reason, per the Governance amendment/exception process below.

## Governance

This constitution supersedes all other project practices, templates, and informal
conventions for this hackathon project. All specifications, plans, tasks, and
implementation decisions MUST comply with the principles above; a plan or task that
conflicts with a principle MUST either be revised to comply or explicitly document
the conflict and rationale for review before proceeding.

**Amendment procedure**: Amendments are proposed by editing this file, recording the
change and rationale in a prepended Sync Impact Report (as in this document's header
comment), and securing agreement from the team members active on the project before
the change is merged. Amendments MUST update the version number and `Last Amended`
date below.

**Versioning policy**: This constitution uses semantic versioning:
- MAJOR: Backward-incompatible governance changes or removal/redefinition of an
  existing principle.
- MINOR: Addition of a new principle or materially expanded guidance.
- PATCH: Clarifications, wording fixes, or non-semantic refinements.

**Compliance review**: Every spec, plan, and task-generation pass MUST be checked
against this constitution before implementation begins, and again before a feature is
marked complete. Reviewers MUST reject or send back for revision any artifact that
weakens the memory-first demonstration (Principles I–II), introduces out-of-scope
integrations (Principle XIII), or presents inferred information as fact (Principles V
and VI).

**Version**: 1.0.0 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-09-28
