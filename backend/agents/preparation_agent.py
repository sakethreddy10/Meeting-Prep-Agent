"""Preparation Agent (spec.md Story 2/5; research.md §8-9, §11).

Turns recalled Hindsight facts into a Preparation Brief, keeping historical fact
(`confirmed`, cited) strictly separate from agent-generated suggestion
(`suggested`, never cited) — FR-017. A code-level grounding filter (not just a
prompt instruction) enforces FR-015/SC-006: no `confirmed` claim survives unless
its `source_meeting_id` matches a fact Hindsight actually returned for this request.
"""

from agents.base import StructuredAgent
from integrations.llm.provider import LLMProvider
from models.preparation import (
    ANSWER_RESPONSE_SCHEMA,
    PREPARATION_RESPONSE_SCHEMA,
    Answer,
    CitedClaim,
    CitedCommitment,
    CommitmentStatus,
    ConfirmedSection,
    Mode,
    PreparationBrief,
)

PREPARATION_SYSTEM_PROMPT = """You are the Preparation Agent for a Meeting Continuity Agent.

You will be given recalled facts about a professional relationship (each with a
meeting_id, a date, and a category) plus the current meeting's own context. Produce
a Preparation Brief.

Rules:
1. Everything in `confirmed` MUST be grounded in a specific recalled fact. Every
   confirmed claim MUST set `source_meeting_id` to the exact meeting_id of the fact
   it came from. Never invent a meeting, commitment, decision, concern, or deadline
   that is not present in the recalled facts.
2. If no recalled facts support a section (e.g., no prior concerns), leave that list
   empty rather than inventing content.
3. `suggested.talking_points` and `suggested.follow_up_questions` are YOUR inferred
   suggestions — never cite a source_meeting_id for these; they are not historical
   claims.
4. If two recalled facts about the same topic disagree (e.g., a changed timeline or
   budget), list BOTH sides in `conflicts` instead of silently picking one.
5. If there is no supporting memory at all, set `relationship_summary` to an
   explicit statement that no historical information is available — never fabricate
   one."""

ANSWER_SYSTEM_PROMPT = """You are the Preparation Agent answering a free-form relationship-
continuity question, grounded only in the recalled facts you are given.

Rules:
1. If the recalled facts answer the question, answer it and set `grounded: true`,
   citing every fact you used (with its exact meeting_id) in `citations`.
2. If the recalled facts do NOT contain enough information to answer the question,
   say so explicitly and set `grounded: false` with empty `citations`. Never guess."""


def build_preparation_agent(llm: LLMProvider) -> StructuredAgent:
    return StructuredAgent(llm, PREPARATION_SYSTEM_PROMPT, PREPARATION_RESPONSE_SCHEMA)


def build_answer_agent(llm: LLMProvider) -> StructuredAgent:
    return StructuredAgent(llm, ANSWER_SYSTEM_PROMPT, ANSWER_RESPONSE_SCHEMA)


def _meeting_id_of(fact: dict) -> str:
    for tag in fact.get("tags") or []:
        if tag.startswith("meeting:"):
            return tag.split(":", 1)[1]
    return "unknown"


def _fact_meeting_ids(facts: list[dict]) -> set[str]:
    """The meeting_ids actually present in a list of recalled facts — the ground
    truth a confirmed claim's citation is checked against."""
    ids: set[str] = set()
    for fact in facts:
        for tag in fact.get("tags") or []:
            if tag.startswith("meeting:"):
                ids.add(tag.split(":", 1)[1])
    return ids


def _filter_grounded_claims(
    claims: list[CitedClaim], allowed_meeting_ids: set[str]
) -> list[CitedClaim]:
    """FR-015/SC-006 safeguard: drop any 'confirmed' claim whose cited meeting was
    not actually part of what was recalled for this request."""
    return [c for c in claims if c.source_meeting_id in allowed_meeting_ids]


def _apply_grounding_safeguard(
    brief: PreparationBrief, allowed_meeting_ids: set[str]
) -> PreparationBrief:
    if not allowed_meeting_ids:
        # Nothing was recalled (e.g., stateless mode, or a relationship with no
        # history) -> no confirmed claim can possibly be grounded.
        brief.confirmed = ConfirmedSection()
        return brief

    c = brief.confirmed
    brief.confirmed = ConfirmedSection(
        what_matters=_filter_grounded_claims(c.what_matters, allowed_meeting_ids),
        previous_concerns=_filter_grounded_claims(c.previous_concerns, allowed_meeting_ids),
        prior_decisions=_filter_grounded_claims(c.prior_decisions, allowed_meeting_ids),
        user_commitments=[
            x for x in c.user_commitments if x.source_meeting_id in allowed_meeting_ids
        ],
        participant_commitments=[
            x for x in c.participant_commitments if x.source_meeting_id in allowed_meeting_ids
        ],
        unresolved_issues=_filter_grounded_claims(c.unresolved_issues, allowed_meeting_ids),
        recent_changes=_filter_grounded_claims(c.recent_changes, allowed_meeting_ids),
    )
    return brief


def _resolve_commitment_statuses(
    brief: PreparationBrief, resolution_facts: list[dict]
) -> PreparationBrief:
    """Pair each commitment against any commitment_resolution fact naming it
    (research.md §6, corrected design — no tag is ever patched in place)."""
    resolution_texts = [f["text"] for f in resolution_facts]

    def resolve(commitment: CitedCommitment) -> CitedCommitment:
        # The Preparation Agent's CitedCommitment.text is the bare description (no
        # "[commitment] owner committed:" wrapper), unlike the raw Hindsight fact
        # text api/memory.py matches against — compare directly rather than via
        # commitment_matching's wrapper-stripping regex.
        if any(commitment.text[:20] in t for t in resolution_texts):
            commitment.status = CommitmentStatus.RESOLVED
        return commitment

    brief.confirmed.user_commitments = [resolve(c) for c in brief.confirmed.user_commitments]
    brief.confirmed.participant_commitments = [
        resolve(c) for c in brief.confirmed.participant_commitments
    ]
    return brief


def generate_brief(
    agent: StructuredAgent,
    mode: Mode,
    recalled: dict[str, list[dict]],
    current_meeting_context: str,
) -> PreparationBrief:
    all_facts = [
        f for key, facts in recalled.items() if key != "commitment_resolutions" for f in facts
    ]
    facts_text = "\n".join(
        f"- meeting_id={_meeting_id_of(f)} "
        f"date={f.get('occurred_start') or f.get('mentioned_at')} :: {f['text']}"
        for f in all_facts
    )
    user_prompt = (
        f"Mode: {mode.value}\n\nCurrent meeting context:\n{current_meeting_context}\n\n"
        f"Recalled facts (only these may be cited in `confirmed`):\n{facts_text or '(none)'}"
    )

    raw = agent.run(user_prompt)
    brief = PreparationBrief(mode=mode, **raw)

    allowed_meeting_ids = _fact_meeting_ids(all_facts)
    brief = _apply_grounding_safeguard(brief, allowed_meeting_ids)
    brief = _resolve_commitment_statuses(brief, recalled.get("commitment_resolutions", []))
    return brief


def answer_question(
    agent: StructuredAgent,
    recalled: dict[str, list[dict]],
    question: str,
) -> Answer:
    all_facts = [f for facts in recalled.values() for f in facts]
    facts_text = "\n".join(
        f"- meeting_id={_meeting_id_of(f)} :: {f['text']}"
        for f in all_facts
    )
    user_prompt = f"Question: {question}\n\nRecalled facts:\n{facts_text or '(none)'}"

    raw = agent.run(user_prompt)
    answer = Answer(**raw)

    allowed_meeting_ids = _fact_meeting_ids(all_facts)
    if not allowed_meeting_ids:
        return Answer(text=answer.text, grounded=False, citations=[])
    answer.citations = [c for c in answer.citations if c.source_meeting_id in allowed_meeting_ids]
    if not answer.citations:
        answer.grounded = False
    return answer
