from backend.src.workers.notes import process_next_job


def login(client):
    response = client.post("/auth/demo-login", json={"email": "demo@example.com"})
    assert response.status_code == 200
    token = response.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def test_create_upload_and_process_flow(client):
    headers = login(client)
    create_response = client.post("/notes", headers=headers, json={"title": "Sprint Review"})
    assert create_response.status_code == 201
    note_id = create_response.json()["id"]

    upload_response = client.post(
        f"/notes/{note_id}/audio",
        headers=headers,
        json={
            "fileName": "review.mp3",
            "mimeType": "audio/mpeg",
            "fileSizeBytes": 1024,
            "durationSeconds": 30,
        },
    )
    assert upload_response.status_code == 202
    assert upload_response.json()["note"]["status"] == "uploaded"

    assert process_next_job() is True

    detail_response = client.get(f"/notes/{note_id}", headers=headers)
    assert detail_response.status_code == 200
    payload = detail_response.json()
    assert payload["status"] == "completed"
    assert payload["summary"]
    assert payload["transcript"]


def test_e2e_audio_sample_flow(client):
    headers = login(client)
    create_response = client.post("/notes", headers=headers, json={"title": "E2E Test"})
    note_id = create_response.json()["id"]

    client.post(
        f"/notes/{note_id}/audio",
        headers=headers,
        json={
            "fileName": "@e2e.m4a",
            "mimeType": "audio/mp4",
            "fileSizeBytes": 1024_000,
            "durationSeconds": 68,
        },
    )

    process_next_job()

    detail_response = client.get(f"/notes/{note_id}", headers=headers)
    payload = detail_response.json()
    assert payload["status"] == "completed"
    assert "伊朗" in payload["transcript"]
    assert "川普" in payload["transcript"]
    assert "霍爾木茲海峽" in payload["summary"]
    assert payload["tags"] == ["iran", "usa", "oil"]


def test_upload_rejects_invalid_audio(client):
    headers = login(client)
    note_id = client.post("/notes", headers=headers, json={"title": "Invalid"}).json()["id"]
    response = client.post(
        f"/notes/{note_id}/audio",
        headers=headers,
        json={"fileName": "bad.txt", "mimeType": "text/plain", "fileSizeBytes": 12},
    )
    assert response.status_code == 400


def test_failed_processing_surfaces_worker_diagnostics(client):
    headers = login(client)
    note_id = client.post("/notes", headers=headers, json={"title": "fail smoke fixture"}).json()["id"]

    upload_response = client.post(
        f"/notes/{note_id}/audio",
        headers=headers,
        json={
            "fileName": "fail.mp3",
            "mimeType": "audio/mpeg",
            "fileSizeBytes": 2048,
            "durationSeconds": 10,
        },
    )
    assert upload_response.status_code == 202

    assert process_next_job() is True

    detail_response = client.get(f"/notes/{note_id}", headers=headers)
    assert detail_response.status_code == 200
    payload = detail_response.json()
    assert payload["status"] == "failed"
    assert payload["errorMessage"] == "Processing failed. Try a clearer or longer recording."
    assert payload["latestJob"]["failureReason"] == "synthetic_failure"
