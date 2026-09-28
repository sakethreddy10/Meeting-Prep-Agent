def _create_and_preview(client, fake_llm, text="Client wants deployment before October."):
    meeting = client.post(
        "/api/meetings",
        json={
            "relationship_name": "Priya (Acme Corp)",
            "title": "Kickoff call",
            "occurred_at": "2026-01-10T10:00:00Z",
        },
    ).json()
    client.post("/api/transcripts/upload", json={"meeting_id": meeting["id"], "transcript_text": text})
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
    client.post("/api/memory/preview", json={"meeting_id": meeting["id"]})
    return meeting


def test_retain_memory_success(client, fake_llm):
    meeting = _create_and_preview(client, fake_llm)

    resp = client.post("/api/memory/retain", json={"meeting_id": meeting["id"]})

    assert resp.status_code == 200
    body = resp.json()
    assert body["retained_item_count"] == 1
    assert body["resolved_commitment_count"] == 0


def test_retain_memory_without_preview_returns_409(client):
    meeting = client.post(
        "/api/meetings",
        json={
            "relationship_name": "Priya (Acme Corp)",
            "title": "Kickoff call",
            "occurred_at": "2026-01-10T10:00:00Z",
        },
    ).json()

    resp = client.post("/api/memory/retain", json={"meeting_id": meeting["id"]})

    assert resp.status_code == 409


def test_retain_memory_hindsight_failure_returns_502(client, fake_llm, fake_hindsight, monkeypatch):
    meeting = _create_and_preview(client, fake_llm)

    def boom(*args, **kwargs):
        raise RuntimeError("simulated Hindsight outage")

    monkeypatch.setattr(fake_hindsight, "retain_meeting", boom)

    resp = client.post("/api/memory/retain", json={"meeting_id": meeting["id"]})

    assert resp.status_code == 502
    assert resp.json()["error"] == "hindsight_unavailable"
