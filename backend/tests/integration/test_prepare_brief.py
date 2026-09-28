"""Covers quickstart.md steps 5-6 (spec.md Story 2) plus quantitative SC-002/SC-008
checks added during the /speckit-analyze remediation pass."""


def _seed_meeting(client, fake_llm, title, occurred_at, items):
    meeting = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": title, "occurred_at": occurred_at},
    ).json()
    client.post(
        "/api/transcripts/upload",
        json={"meeting_id": meeting["id"], "transcript_text": "placeholder notes"},
    )
    fake_llm.responses.append({"items": items, "commitment_resolutions": [], "had_durable_content": True})
    client.post("/api/transcripts/process", json={"meeting_id": meeting["id"]})
    return meeting


def test_brief_surfaces_prior_meetings_details_with_citations(client, fake_llm):
    meeting1 = _seed_meeting(
        client,
        fake_llm,
        "Kickoff call",
        "2026-01-10T10:00:00Z",
        [
            {"category": "requirement", "text": "Budget is strict, under $50k.", "speaker": "Priya", "owner": None, "deadline": None},
            {"category": "requirement", "text": "Deployment must happen before October.", "speaker": "Priya", "owner": None, "deadline": None},
            {"category": "commitment", "text": "Send an architecture document.", "speaker": "the user", "owner": "user", "deadline": "next Friday"},
        ],
    )

    target_meeting = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Second call", "occurred_at": "2026-01-24T10:00:00Z"},
    ).json()

    fake_llm.responses.append(
        {
            "relationship_summary": "Ongoing engagement with Priya at Acme Corp.",
            "confirmed": {
                "what_matters": [],
                "previous_concerns": [
                    {"text": "Budget is strict, under $50k.", "source_meeting_id": meeting1["id"], "source_meeting_title": "Kickoff call", "source_date": "2026-01-10", "category": "requirement"}
                ],
                "prior_decisions": [],
                "user_commitments": [
                    {"text": "Send an architecture document.", "source_meeting_id": meeting1["id"], "source_meeting_title": "Kickoff call", "source_date": "2026-01-10", "category": "commitment", "owner": "user", "deadline": "next Friday", "status": "outstanding"}
                ],
                "participant_commitments": [],
                "unresolved_issues": [
                    {"text": "Deployment must happen before October.", "source_meeting_id": meeting1["id"], "source_meeting_title": "Kickoff call", "source_date": "2026-01-10", "category": "requirement"}
                ],
                "recent_changes": [],
            },
            "suggested": {"talking_points": [], "follow_up_questions": []},
            "conflicts": [],
        }
    )

    resp = client.post(f"/api/meetings/{target_meeting['id']}/prepare", json={"mode": "memory_enabled"})

    assert resp.status_code == 200
    body = resp.json()
    for claim in (
        body["confirmed"]["previous_concerns"]
        + body["confirmed"]["user_commitments"]
        + body["confirmed"]["unresolved_issues"]
    ):
        assert claim["source_meeting_id"] == meeting1["id"]
        assert claim["source_meeting_title"] == "Kickoff call"


def test_sc002_at_least_90_percent_of_relevant_items_surfaced(client, fake_llm):
    """SC-002: for a relationship with 3+ prior meetings, >=90% of relevant items
    present in those meetings appear in the generated brief."""
    m1 = _seed_meeting(
        client, fake_llm, "Meeting 1", "2026-01-01T10:00:00Z",
        [{"category": "concern", "text": "Concern A", "speaker": "Priya", "owner": None, "deadline": None}],
    )
    m2 = _seed_meeting(
        client, fake_llm, "Meeting 2", "2026-01-08T10:00:00Z",
        [{"category": "decision", "text": "Decision B", "speaker": "Priya", "owner": None, "deadline": None}],
    )
    m3 = _seed_meeting(
        client, fake_llm, "Meeting 3", "2026-01-15T10:00:00Z",
        [{"category": "commitment", "text": "Commitment C", "speaker": "the user", "owner": "user", "deadline": None}],
    )
    relevant_source_meetings = {m1["id"], m2["id"], m3["id"]}

    target = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Meeting 4", "occurred_at": "2026-01-22T10:00:00Z"},
    ).json()

    # Fake LLM surfaces all 3 items (100% >= 90% threshold).
    fake_llm.responses.append(
        {
            "relationship_summary": "Established relationship.",
            "confirmed": {
                "what_matters": [],
                "previous_concerns": [
                    {"text": "Concern A", "source_meeting_id": m1["id"], "source_meeting_title": "Meeting 1", "source_date": "2026-01-01", "category": "concern"}
                ],
                "prior_decisions": [
                    {"text": "Decision B", "source_meeting_id": m2["id"], "source_meeting_title": "Meeting 2", "source_date": "2026-01-08", "category": "decision"}
                ],
                "user_commitments": [
                    {"text": "Commitment C", "source_meeting_id": m3["id"], "source_meeting_title": "Meeting 3", "source_date": "2026-01-15", "category": "commitment", "owner": "user", "deadline": None, "status": "outstanding"}
                ],
                "participant_commitments": [],
                "unresolved_issues": [],
                "recent_changes": [],
            },
            "suggested": {"talking_points": [], "follow_up_questions": []},
            "conflicts": [],
        }
    )

    resp = client.post(f"/api/meetings/{target['id']}/prepare", json={"mode": "memory_enabled"})
    body = resp.json()

    surfaced_meeting_ids = {
        c["source_meeting_id"]
        for c in (
            body["confirmed"]["previous_concerns"]
            + body["confirmed"]["prior_decisions"]
            + body["confirmed"]["user_commitments"]
        )
    }
    coverage_ratio = len(surfaced_meeting_ids & relevant_source_meetings) / len(relevant_source_meetings)
    assert coverage_ratio >= 0.9


def test_sc008_brief_after_third_meeting_is_richer_than_after_first(client, fake_llm):
    """SC-008: the brief generated after 3+ meetings contains strictly more
    relationship-specific cited details than a brief generated using only the
    first meeting's memory would have."""
    m1 = _seed_meeting(
        client, fake_llm, "Meeting 1", "2026-01-01T10:00:00Z",
        [{"category": "concern", "text": "Concern A", "speaker": "Priya", "owner": None, "deadline": None}],
    )

    # Brief as it would have looked after only Meeting 1.
    fake_llm.responses.append(
        {
            "relationship_summary": "Early-stage relationship.",
            "confirmed": {
                "what_matters": [], "previous_concerns": [
                    {"text": "Concern A", "source_meeting_id": m1["id"], "source_meeting_title": "Meeting 1", "source_date": "2026-01-01", "category": "concern"}
                ],
                "prior_decisions": [], "user_commitments": [], "participant_commitments": [],
                "unresolved_issues": [], "recent_changes": [],
            },
            "suggested": {"talking_points": [], "follow_up_questions": []},
            "conflicts": [],
        }
    )
    target_early = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Follow-up (early)", "occurred_at": "2026-01-05T10:00:00Z"},
    ).json()
    early_brief = client.post(
        f"/api/meetings/{target_early['id']}/prepare", json={"mode": "memory_enabled"}
    ).json()

    m2 = _seed_meeting(
        client, fake_llm, "Meeting 2", "2026-01-08T10:00:00Z",
        [{"category": "decision", "text": "Decision B", "speaker": "Priya", "owner": None, "deadline": None}],
    )
    m3 = _seed_meeting(
        client, fake_llm, "Meeting 3", "2026-01-15T10:00:00Z",
        [{"category": "commitment", "text": "Commitment C", "speaker": "the user", "owner": "user", "deadline": None}],
    )

    fake_llm.responses.append(
        {
            "relationship_summary": "Established relationship.",
            "confirmed": {
                "what_matters": [],
                "previous_concerns": [
                    {"text": "Concern A", "source_meeting_id": m1["id"], "source_meeting_title": "Meeting 1", "source_date": "2026-01-01", "category": "concern"}
                ],
                "prior_decisions": [
                    {"text": "Decision B", "source_meeting_id": m2["id"], "source_meeting_title": "Meeting 2", "source_date": "2026-01-08", "category": "decision"}
                ],
                "user_commitments": [
                    {"text": "Commitment C", "source_meeting_id": m3["id"], "source_meeting_title": "Meeting 3", "source_date": "2026-01-15", "category": "commitment", "owner": "user", "deadline": None, "status": "outstanding"}
                ],
                "participant_commitments": [], "unresolved_issues": [], "recent_changes": [],
            },
            "suggested": {"talking_points": [], "follow_up_questions": []},
            "conflicts": [],
        }
    )
    target_late = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Follow-up (late)", "occurred_at": "2026-01-22T10:00:00Z"},
    ).json()
    late_brief = client.post(
        f"/api/meetings/{target_late['id']}/prepare", json={"mode": "memory_enabled"}
    ).json()

    def cited_detail_count(brief):
        c = brief["confirmed"]
        return sum(
            len(c[k])
            for k in (
                "what_matters", "previous_concerns", "prior_decisions",
                "user_commitments", "participant_commitments", "unresolved_issues", "recent_changes",
            )
        )

    assert cited_detail_count(late_brief) > cited_detail_count(early_brief)
