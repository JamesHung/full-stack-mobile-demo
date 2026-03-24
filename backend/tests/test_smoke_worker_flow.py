from backend.src.workers.notes import process_next_job


def login(client):
    response = client.post("/auth/demo-login", json={"email": "demo@example.com"})
    assert response.status_code == 200
    token = response.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def upload_note(client, headers, title: str, file_name: str = "@e2e.m4a"):
    note_id = client.post("/notes", headers=headers, json={"title": title}).json()["id"]
    upload_response = client.post(
        f"/notes/{note_id}/audio",
        headers=headers,
        json={
            "fileName": file_name,
            "mimeType": "audio/mp4",
            "fileSizeBytes": 1024_000,
            "durationSeconds": 68,
        },
    )
    assert upload_response.status_code == 202
    return note_id


def test_worker_returns_false_when_no_jobs_are_queued():
    assert process_next_job() is False


def test_worker_processes_run_scoped_failure_notes(client):
    headers = login(client)
    note_id = upload_note(client, headers, "fail weekly sync smoke-run-123")

    assert process_next_job() is True

    detail_response = client.get(f"/notes/{note_id}", headers=headers)
    assert detail_response.status_code == 200
    payload = detail_response.json()
    assert payload["status"] == "failed"
    assert payload["errorMessage"] == "Processing failed. Try a clearer or longer recording."
    assert payload["latestJob"]["failureReason"] == "synthetic_failure"
