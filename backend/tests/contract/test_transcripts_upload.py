def _create_meeting(client):
    resp = client.post(
        "/api/meetings",
        json={
            "relationship_name": "Priya (Acme Corp)",
            "title": "Kickoff call",
            "occurred_at": "2026-01-10T10:00:00Z",
        },
    )
    assert resp.status_code == 201
    return resp.json()


def test_upload_paste_transcript_succeeds(client):
    meeting = _create_meeting(client)

    resp = client.post(
        "/api/transcripts/upload",
        json={"meeting_id": meeting["id"], "transcript_text": "Client wants deployment before October."},
    )

    assert resp.status_code == 202
    body = resp.json()
    assert body["meeting_id"] == meeting["id"]
    assert body["transcript_status"] == "available"


def test_upload_empty_transcript_is_rejected(client):
    meeting = _create_meeting(client)

    resp = client.post(
        "/api/transcripts/upload",
        json={"meeting_id": meeting["id"], "transcript_text": "   "},
    )

    assert resp.status_code == 422
    assert resp.json()["error"] == "invalid_meeting_input"


def test_upload_for_unknown_meeting_returns_404(client):
    resp = client.post(
        "/api/transcripts/upload",
        json={"meeting_id": "does-not-exist", "transcript_text": "some notes"},
    )

    assert resp.status_code == 404
