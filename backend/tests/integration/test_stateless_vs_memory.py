"""Covers quickstart.md steps 4 and 6 (spec.md Story 3, SC-003): the stateless
response has no historical citations, and the memory-enabled response on the same
request has >=3 additional specific historical details."""


def _seed_two_meetings(client, fake_llm):
    m1 = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Kickoff call", "occurred_at": "2026-01-10T10:00:00Z"},
    ).json()
    client.post("/api/transcripts/upload", json={"meeting_id": m1["id"], "transcript_text": "notes"})
    fake_llm.responses.append(
        {
            "items": [
                {"category": "requirement", "text": "Budget is strict, under $50k.", "speaker": "Priya", "owner": None, "deadline": None},
                {"category": "requirement", "text": "Deployment must happen before October.", "speaker": "Priya", "owner": None, "deadline": None},
                {"category": "commitment", "text": "Send an architecture document.", "speaker": "the user", "owner": "user", "deadline": "next Friday"},
            ],
            "commitment_resolutions": [],
            "had_durable_content": True,
        }
    )
    client.post("/api/transcripts/process", json={"meeting_id": m1["id"]})
    return m1


def test_stateless_vs_memory_enabled_comparison(client, fake_llm):
    m1 = _seed_two_meetings(client, fake_llm)
    target = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Second call", "occurred_at": "2026-01-20T10:00:00Z"},
    ).json()

    # Stateless: generic response, no historical citations.
    fake_llm.responses.append(
        {
            "relationship_summary": None,
            "confirmed": {
                "what_matters": [], "previous_concerns": [], "prior_decisions": [],
                "user_commitments": [], "participant_commitments": [], "unresolved_issues": [], "recent_changes": [],
            },
            "suggested": {"talking_points": ["Ask what matters most to them."], "follow_up_questions": []},
            "conflicts": [],
        }
    )
    stateless = client.post(f"/api/meetings/{target['id']}/prepare", json={"mode": "stateless"}).json()

    # Memory-enabled: same request, now grounded in the 3 items from meeting 1.
    fake_llm.responses.append(
        {
            "relationship_summary": "Ongoing engagement with Priya at Acme Corp.",
            "confirmed": {
                "what_matters": [],
                "previous_concerns": [
                    {"text": "Budget is strict, under $50k.", "source_meeting_id": m1["id"], "source_meeting_title": "Kickoff call", "source_date": "2026-01-10", "category": "requirement"}
                ],
                "prior_decisions": [],
                "user_commitments": [
                    {"text": "Send an architecture document.", "source_meeting_id": m1["id"], "source_meeting_title": "Kickoff call", "source_date": "2026-01-10", "category": "commitment", "owner": "user", "deadline": "next Friday", "status": "outstanding"}
                ],
                "participant_commitments": [],
                "unresolved_issues": [
                    {"text": "Deployment must happen before October.", "source_meeting_id": m1["id"], "source_meeting_title": "Kickoff call", "source_date": "2026-01-10", "category": "requirement"}
                ],
                "recent_changes": [],
            },
            "suggested": {"talking_points": [], "follow_up_questions": []},
            "conflicts": [],
        }
    )
    memory_enabled = client.post(
        f"/api/meetings/{target['id']}/prepare", json={"mode": "memory_enabled"}
    ).json()

    def all_confirmed_texts(brief):
        c = brief["confirmed"]
        texts = []
        for key in (
            "what_matters", "previous_concerns", "prior_decisions",
            "user_commitments", "participant_commitments", "unresolved_issues", "recent_changes",
        ):
            texts.extend(item["text"] for item in c[key])
        return texts

    stateless_texts = set(all_confirmed_texts(stateless))
    memory_texts = set(all_confirmed_texts(memory_enabled))

    assert stateless_texts == set()
    assert len(memory_texts - stateless_texts) >= 3
    assert stateless["mode"] == "stateless"
    assert memory_enabled["mode"] == "memory_enabled"
