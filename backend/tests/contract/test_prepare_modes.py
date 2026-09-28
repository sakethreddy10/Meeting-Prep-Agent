def _seed_history(client, fake_llm):
    meeting = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Kickoff call", "occurred_at": "2026-01-10T10:00:00Z"},
    ).json()
    client.post("/api/transcripts/upload", json={"meeting_id": meeting["id"], "transcript_text": "notes"})
    fake_llm.responses.append(
        {
            "items": [{"category": "requirement", "text": "Budget is strict, under $50k.", "speaker": "Priya", "owner": None, "deadline": None}],
            "commitment_resolutions": [],
            "had_durable_content": True,
        }
    )
    client.post("/api/transcripts/process", json={"meeting_id": meeting["id"]})
    return meeting


def test_stateless_mode_never_calls_hindsight_recall(client, fake_llm, fake_hindsight, monkeypatch):
    seed = _seed_history(client, fake_llm)
    target = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Second call", "occurred_at": "2026-01-20T10:00:00Z"},
    ).json()
    assert target["relationship_id"] == seed["relationship_id"]

    recall_calls = []
    original = fake_hindsight.recall_for_preparation
    monkeypatch.setattr(
        fake_hindsight, "recall_for_preparation", lambda *a, **k: recall_calls.append(1) or original(*a, **k)
    )

    fake_llm.responses.append(
        {
            "relationship_summary": None,
            "confirmed": {
                "what_matters": [], "previous_concerns": [], "prior_decisions": [],
                "user_commitments": [], "participant_commitments": [], "unresolved_issues": [], "recent_changes": [],
            },
            "suggested": {"talking_points": ["Ask about their priorities."], "follow_up_questions": []},
            "conflicts": [],
        }
    )

    resp = client.post(f"/api/meetings/{target['id']}/prepare", json={"mode": "stateless"})

    assert resp.status_code == 200
    assert recall_calls == []  # stateless must skip recall entirely (research.md §9)
    body = resp.json()
    assert body["mode"] == "stateless"
    assert body["confirmed"]["what_matters"] == []


def test_memory_enabled_mode_calls_hindsight_recall(client, fake_llm):
    seed = _seed_history(client, fake_llm)
    target = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Second call", "occurred_at": "2026-01-20T10:00:00Z"},
    ).json()

    fake_llm.responses.append(
        {
            "relationship_summary": "Ongoing engagement.",
            "confirmed": {
                "what_matters": [
                    {"text": "Budget is strict, under $50k.", "source_meeting_id": seed["id"], "source_meeting_title": "Kickoff call", "source_date": "2026-01-10", "category": "requirement"}
                ],
                "previous_concerns": [], "prior_decisions": [], "user_commitments": [],
                "participant_commitments": [], "unresolved_issues": [], "recent_changes": [],
            },
            "suggested": {"talking_points": [], "follow_up_questions": []},
            "conflicts": [],
        }
    )

    resp = client.post(f"/api/meetings/{target['id']}/prepare", json={"mode": "memory_enabled"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "memory_enabled"
    assert len(body["confirmed"]["what_matters"]) == 1
