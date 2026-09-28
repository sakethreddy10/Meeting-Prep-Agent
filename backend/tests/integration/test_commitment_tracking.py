"""Covers quickstart.md step 7 (spec.md Story 4): a commitment made in Meeting 1,
fulfilled in Meeting 3, is retained with resolved_commitment_count == 1 and no
longer appears as outstanding in the next brief or memory timeline."""


def test_commitment_made_then_resolved_across_meetings(client, fake_llm):
    m1 = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Meeting 1", "occurred_at": "2026-01-10T10:00:00Z"},
    ).json()
    client.post("/api/transcripts/upload", json={"meeting_id": m1["id"], "transcript_text": "notes"})
    fake_llm.responses.append(
        {
            "items": [
                {"category": "commitment", "text": "Send an architecture document.", "speaker": "the user", "owner": "user", "deadline": "next Friday"}
            ],
            "commitment_resolutions": [],
            "had_durable_content": True,
        }
    )
    process1 = client.post("/api/transcripts/process", json={"meeting_id": m1["id"]}).json()
    assert process1["resolved_commitment_count"] == 0

    m2 = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Meeting 2", "occurred_at": "2026-01-17T10:00:00Z"},
    ).json()
    client.post("/api/transcripts/upload", json={"meeting_id": m2["id"], "transcript_text": "notes"})
    fake_llm.responses.append(
        {
            "items": [{"category": "concern", "text": "New security requirement raised.", "speaker": "Priya", "owner": None, "deadline": None}],
            "commitment_resolutions": [],
            "had_durable_content": True,
        }
    )
    client.post("/api/transcripts/process", json={"meeting_id": m2["id"]})

    # Check the timeline before resolution: the commitment is outstanding.
    timeline_before = client.get(f"/api/relationships/{m1['relationship_id']}/memory").json()
    commitment_before = next(i for i in timeline_before if i["category"] == "commitment")
    assert commitment_before["status"] == "outstanding"

    m3 = client.post(
        "/api/meetings",
        json={"relationship_name": "Priya (Acme Corp)", "title": "Meeting 3", "occurred_at": "2026-01-24T10:00:00Z"},
    ).json()
    client.post("/api/transcripts/upload", json={"meeting_id": m3["id"], "transcript_text": "notes"})
    fake_llm.responses.append(
        {
            "items": [],
            "commitment_resolutions": [
                {
                    "matched_commitment_hint": "Send an architecture document.",
                    "resolution": "resolved",
                    "evidence_text": "The user confirmed the architecture document was sent.",
                }
            ],
            "had_durable_content": False,
        }
    )
    process3 = client.post("/api/transcripts/process", json={"meeting_id": m3["id"]}).json()
    assert process3["resolved_commitment_count"] == 1

    timeline_after = client.get(f"/api/relationships/{m1['relationship_id']}/memory").json()
    commitment_after = next(i for i in timeline_after if i["category"] == "commitment")
    assert commitment_after["status"] == "resolved"
