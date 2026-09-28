"""SC-006 / FR-015: no `confirmed` claim survives unless it cites a meeting_id that
was actually part of what Hindsight recalled for this request — a code-level filter,
not merely a prompt instruction (see agents/preparation_agent.py's grounding
safeguard, added during the /speckit-analyze remediation pass, G2)."""

from agents.preparation_agent import build_preparation_agent, generate_brief
from models.preparation import Mode


def test_fabricated_claim_citing_an_unrecalled_meeting_is_dropped(fake_llm):
    agent = build_preparation_agent(fake_llm)

    recalled = {
        "relevance_ranked": [
            {
                "text": "Budget is strict, under $50k.",
                "tags": ["relationship:rel-acme", "meeting:meeting-real-1", "memory_type:requirement"],
                "occurred_start": "2026-01-10T00:00:00Z",
            }
        ],
        "always_included_unresolved": [],
        "commitment_resolutions": [],
    }

    # The LLM hallucinates an extra claim citing a meeting that was never recalled.
    fake_llm.responses.append(
        {
            "relationship_summary": "Ongoing engagement.",
            "confirmed": {
                "what_matters": [],
                "previous_concerns": [
                    {
                        "text": "Budget is strict, under $50k.",
                        "source_meeting_id": "meeting-real-1",
                        "source_meeting_title": "Kickoff call",
                        "source_date": "2026-01-10",
                        "category": "requirement",
                    },
                    {
                        "text": "Client threatened to cancel the contract.",
                        "source_meeting_id": "meeting-fabricated-999",
                        "source_meeting_title": "Some meeting that never happened",
                        "source_date": "2026-03-01",
                        "category": "concern",
                    },
                ],
                "prior_decisions": [],
                "user_commitments": [],
                "participant_commitments": [],
                "unresolved_issues": [],
                "recent_changes": [],
            },
            "suggested": {"talking_points": [], "follow_up_questions": []},
            "conflicts": [],
        }
    )

    brief = generate_brief(agent, Mode.MEMORY_ENABLED, recalled, "Preparing for a follow-up meeting")

    texts = [c.text for c in brief.confirmed.previous_concerns]
    assert "Budget is strict, under $50k." in texts
    assert "Client threatened to cancel the contract." not in texts
    assert len(brief.confirmed.previous_concerns) == 1


def test_no_confirmed_claim_survives_against_an_empty_recall(fake_llm):
    """Even if recall returns nothing, a hallucinating LLM's confirmed claims must
    still be stripped entirely — grounding is enforced by recalled facts, not by
    trusting the model to follow instructions."""
    agent = build_preparation_agent(fake_llm)

    recalled = {"relevance_ranked": [], "always_included_unresolved": [], "commitment_resolutions": []}

    fake_llm.responses.append(
        {
            "relationship_summary": "Some fabricated relationship history.",
            "confirmed": {
                "what_matters": [
                    {
                        "text": "This relationship has been ongoing for 5 years.",
                        "source_meeting_id": "meeting-fabricated-1",
                        "source_meeting_title": "Invented meeting",
                        "source_date": "2020-01-01",
                        "category": "context",
                    }
                ],
                "previous_concerns": [], "prior_decisions": [], "user_commitments": [],
                "participant_commitments": [], "unresolved_issues": [], "recent_changes": [],
            },
            "suggested": {"talking_points": [], "follow_up_questions": []},
            "conflicts": [],
        }
    )

    brief = generate_brief(agent, Mode.MEMORY_ENABLED, recalled, "Preparing for a first meeting")

    assert brief.confirmed.what_matters == []
