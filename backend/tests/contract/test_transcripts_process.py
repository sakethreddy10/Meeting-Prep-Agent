def _create_meeting_with_transcript(client, text="Client wants deployment before October."):
    meeting = client.post(
        "/api/meetings",
        json={
            "relationship_name": "Priya (Acme Corp)",
            "title": "Kickoff call",
            "occurred_at": "2026-01-10T10:00:00Z",
        },
    ).json()
    client.post("/api/transcripts/upload", json={"meeting_id": meeting["id"], "transcript_text": text})
    return meeting


def test_process_transcript_success(client, fake_llm):
    meeting = _create_meeting_with_transcript(client)
    fake_llm.responses.append(
        {
            "items": [
                {
                    "category": "requirement",
                    "text": "Deployment must happen before October.",
                    "speaker": "Priya",
                    "owner": None,
                    "deadline": None,
                }
            ],
            "commitment_resolutions": [],
            "had_durable_content": True,
        }
    )

    resp = client.post("/api/transcripts/process", json={"meeting_id": meeting["id"]})

    assert resp.status_code == 200
    body = resp.json()
    assert body["retain_status"] == "success"
    assert body["retained_item_count"] == 1
    assert body["items"][0]["category"] == "requirement"


def test_process_transcript_with_no_durable_content_is_not_an_error(client, fake_llm):
    meeting = _create_meeting_with_transcript(client, text="hey, how are you doing today")
    fake_llm.responses.append({"items": [], "commitment_resolutions": [], "had_durable_content": False})

    resp = client.post("/api/transcripts/process", json={"meeting_id": meeting["id"]})

    assert resp.status_code == 200
    body = resp.json()
    assert body["had_durable_content"] is False
    assert body["retain_status"] == "skipped_no_durable_content"
    assert body["retained_item_count"] == 0


def test_process_transcript_llm_failure_returns_502(client, fake_llm):
    meeting = _create_meeting_with_transcript(client)
    # No queued response -> FakeLLMProvider raises, simulating an LLM outage (FR-022)

    resp = client.post("/api/transcripts/process", json={"meeting_id": meeting["id"]})

    assert resp.status_code == 502
    assert resp.json()["error"] == "llm_unavailable"


def test_process_transcript_without_transcript_returns_409(client):
    meeting = client.post(
        "/api/meetings",
        json={
            "relationship_name": "Priya (Acme Corp)",
            "title": "Kickoff call",
            "occurred_at": "2026-01-10T10:00:00Z",
        },
    ).json()

    resp = client.post("/api/transcripts/process", json={"meeting_id": meeting["id"]})

    assert resp.status_code == 409
