def _seed_meeting_with_memory(client, fake_llm, relationship_name="Priya (Acme Corp)"):
    meeting = client.post(
        "/api/meetings",
        json={"relationship_name": relationship_name, "title": "Kickoff call", "occurred_at": "2026-01-10T10:00:00Z"},
    ).json()
    client.post(
        "/api/transcripts/upload",
        json={"meeting_id": meeting["id"], "transcript_text": "Client budget is strict, under $50k."},
    )
    fake_llm.responses.append(
        {
            "items": [
                {"category": "requirement", "text": "Budget is strict, under $50k.", "speaker": "Priya", "owner": None, "deadline": None}
            ],
            "commitment_resolutions": [],
            "had_durable_content": True,
        }
    )
    client.post("/api/transcripts/process", json={"meeting_id": meeting["id"]})
    return meeting


def test_prepare_memory_enabled_with_populated_history(client, fake_llm):
    seed_meeting = _seed_meeting_with_memory(client, fake_llm)

    # Second meeting for the same relationship, requesting a brief for it.
    second_meeting = client.post(
        "/api/meetings",
        json={
            "relationship_name": "Priya (Acme Corp)",
            "title": "Follow-up call",
            "occurred_at": "2026-01-20T10:00:00Z",
        },
    ).json()
    assert second_meeting["relationship_id"] == seed_meeting["relationship_id"]

    fake_llm.responses.append(
        {
            "relationship_summary": "Priya's budget is tight; keep proposals concise.",
            "confirmed": {
                "what_matters": [
                    {
                        "text": "Budget is strict, under $50k.",
                        "source_meeting_id": seed_meeting["id"],
                        "source_meeting_title": "Kickoff call",
                        "source_date": "2026-01-10",
                        "category": "requirement",
                    }
                ],
                "previous_concerns": [],
                "prior_decisions": [],
                "user_commitments": [],
                "participant_commitments": [],
                "unresolved_issues": [],
                "recent_changes": [],
            },
            "suggested": {"talking_points": ["Confirm the budget ceiling still holds."], "follow_up_questions": []},
            "conflicts": [],
        }
    )

    resp = client.post(f"/api/meetings/{second_meeting['id']}/prepare", json={"mode": "memory_enabled"})

    assert resp.status_code == 200
    body = resp.json()
    assert body["mode"] == "memory_enabled"
    assert len(body["confirmed"]["what_matters"]) == 1
    assert body["confirmed"]["what_matters"][0]["source_meeting_id"] == seed_meeting["id"]


def test_prepare_memory_enabled_with_no_history(client, fake_llm):
    meeting = client.post(
        "/api/meetings",
        json={"relationship_name": "Brand New Contact", "title": "First call", "occurred_at": "2026-02-01T10:00:00Z"},
    ).json()

    resp = client.post(f"/api/meetings/{meeting['id']}/prepare", json={"mode": "memory_enabled"})

    assert resp.status_code == 200
    body = resp.json()
    assert "no historical information" in body["relationship_summary"].lower()
    assert body["confirmed"]["what_matters"] == []
    # No LLM call should have been needed for the deterministic no-history path.
    assert fake_llm.calls == []
