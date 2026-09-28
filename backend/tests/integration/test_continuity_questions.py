"""Covers quickstart.md steps 8-9 (spec.md Story 5): a grounded question returns a
cited Answer; an ungrounded question returns grounded: false rather than a guess."""


def _seed_meeting(client, fake_llm):
    meeting = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Kickoff call", "occurred_at": "2026-01-10T10:00:00Z"},
    ).json()
    client.post("/api/transcripts/upload", json={"meeting_id": meeting["id"], "transcript_text": "notes"})
    fake_llm.responses.append(
        {
            "items": [
                {"category": "preference", "text": "Priya prefers concise technical proposals.", "speaker": "Priya", "owner": None, "deadline": None}
            ],
            "commitment_resolutions": [],
            "had_durable_content": True,
        }
    )
    client.post("/api/transcripts/process", json={"meeting_id": meeting["id"]})
    return meeting


def test_grounded_question_returns_cited_answer(client, fake_llm):
    seed = _seed_meeting(client, fake_llm)

    fake_llm.responses.append(
        {
            "text": "Priya cares about concise, no-frills technical proposals.",
            "grounded": True,
            "citations": [
                {
                    "text": "Priya prefers concise technical proposals.",
                    "source_meeting_id": seed["id"],
                    "source_meeting_title": "Kickoff call",
                    "source_date": "2026-01-10",
                    "category": "preference",
                }
            ],
        }
    )

    resp = client.post(
        f"/api/meetings/{seed['id']}/prepare",
        json={"mode": "memory_enabled", "question": "What did Priya care about in our previous meetings?"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["grounded"] is True
    assert body["citations"][0]["source_meeting_id"] == seed["id"]


def test_ungrounded_question_returns_not_enough_information(client, fake_llm):
    meeting = client.post(
        "/api/meetings",
        json={"relationship_name": "Brand New Contact", "title": "First call", "occurred_at": "2026-02-01T10:00:00Z"},
    ).json()

    resp = client.post(
        f"/api/meetings/{meeting['id']}/prepare",
        json={"mode": "memory_enabled", "question": "What did they say about our competitor?"},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["grounded"] is False
    assert body["citations"] == []
    # No history at all -> deterministically ungrounded, no LLM call needed.
    assert fake_llm.calls == []
