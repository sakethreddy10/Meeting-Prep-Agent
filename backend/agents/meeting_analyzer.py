"""Meeting Analyzer Agent (spec.md FR-002; research.md §2, §4).

Turns a normalized transcript into structured durable-memory candidates, matching
the bank's `retain_mission` categories, plus any commitment-resolution signals
(spec.md Story 4 / FR-010).
"""

from agents.base import StructuredAgent
from integrations.llm.provider import LLMProvider
from models.analysis import ANALYSIS_RESPONSE_SCHEMA, AnalysisResult
from models.meeting import Transcript

SYSTEM_PROMPT = """You are the Meeting Analyzer for a Meeting Continuity Agent.

Read the transcript of a single meeting and extract every piece of DURABLE
information that will still matter in a future meeting with the same relationship:
decisions, commitments (who promised what, to whom, and any explicit deadline),
concerns/objections, requirements, preferences, unresolved questions, follow-up
items, important context, changes in priorities, and outcomes.

Ignore greetings, small talk, and pure scheduling logistics — do not extract them.

For each commitment, set `owner` to who made it (the user, or the other
participant's name) only when the transcript makes it clear; otherwise leave it
null. Set `deadline` only when a deadline is explicitly stated; otherwise leave it
null. Never invent an owner or deadline that is not stated (spec.md Edge Cases).

Separately, identify any statement in this meeting indicating that a commitment
made in an EARLIER meeting has now been fulfilled or is no longer relevant, and
describe it as a `commitment_resolutions` entry with a short `matched_commitment_hint`
describing the original promise well enough to find it later.

Set `had_durable_content` to false only if the transcript contains no durable items
at all (e.g., pure small talk) — never fabricate items to avoid an empty result."""


def build_meeting_analyzer(llm: LLMProvider) -> StructuredAgent:
    return StructuredAgent(llm, SYSTEM_PROMPT, ANALYSIS_RESPONSE_SCHEMA)


def analyze_transcript(
    agent: StructuredAgent, meeting_id: str, transcript: Transcript
) -> AnalysisResult:
    transcript_text = "\n".join(
        f"{seg.speaker_name or seg.speaker_id}: {seg.text}" for seg in transcript.segments
    )
    raw = agent.run(
        f"Meeting transcript (meeting_id={meeting_id}):\n\n{transcript_text}"
    )
    return AnalysisResult(meeting_id=meeting_id, **raw)
