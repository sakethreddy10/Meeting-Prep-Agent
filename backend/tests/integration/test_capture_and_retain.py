"""Covers quickstart.md steps 1-3: submit notes -> analyze -> retain -> memory
timeline shows items with source citations (spec.md Story 1)."""


def test_submit_analyze_retain_and_view_timeline(client, fake_llm):
    meeting = client.post(
        "/api/meetings",
        json={
            "relationship_name": "Priya (Acme Corp)",
            "title": "Kickoff call",
            "occurred_at": "2026-01-10T10:00:00Z",
        },
    ).json()
    relationship_id = meeting["relationship_id"]

    notes = (
        "Client says the budget is strict, under $50k. "
        "Client wants deployment before October. "
        "I promise to send an architecture document by next Friday."
    )
    client.post("/api/transcripts/upload", json={"meeting_id": meeting["id"], "transcript_text": notes})

    fake_llm.responses.append(
        {
            "items": [
                {
                    "category": "requirement",
                    "text": "Budget is strict, under $50k.",
                    "speaker": "Priya",
                    "owner": None,
                    "deadline": None,
                },
                {
                    "category": "requirement",
                    "text": "Deployment must happen before October.",
                    "speaker": "Priya",
                    "owner": None,
                    "deadline": None,
                },
                {
                    "category": "commitment",
                    "text": "Send an architecture document.",
                    "speaker": "the user",
                    "owner": "user",
                    "deadline": "next Friday",
                },
            ],
            "commitment_resolutions": [],
            "had_durable_content": True,
        }
    )

    process_resp = client.post("/api/transcripts/process", json={"meeting_id": meeting["id"]})
    assert process_resp.status_code == 200
    process_body = process_resp.json()
    assert process_body["retain_status"] == "success"
    assert process_body["retained_item_count"] == 3

    timeline_resp = client.get(f"/api/relationships/{relationship_id}/memory")
    assert timeline_resp.status_code == 200
    timeline = timeline_resp.json()

    categories = {item["category"] for item in timeline}
    assert "requirement" in categories
    assert "commitment" in categories

    for item in timeline:
        assert item["source_meeting_id"] == meeting["id"]
        assert item["source_meeting_title"] == "Kickoff call"


def test_meeting_with_no_durable_content_reports_nothing_found(client, fake_llm):
    meeting = client.post(
        "/api/meetings",
        json={
            "relationship_name": "Rahul (Globex)",
            "title": "Quick hello",
            "occurred_at": "2026-01-11T10:00:00Z",
        },
    ).json()
    client.post(
        "/api/transcripts/upload",
        json={"meeting_id": meeting["id"], "transcript_text": "Hey! How's it going? Talk soon."},
    )
    fake_llm.responses.append({"items": [], "commitment_resolutions": [], "had_durable_content": False})

    resp = client.post("/api/transcripts/process", json={"meeting_id": meeting["id"]})

    assert resp.status_code == 200
    body = resp.json()
    assert body["had_durable_content"] is False
    assert body["items"] == []
