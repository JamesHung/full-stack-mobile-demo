from backend.src.workers.notes import process_next_job


def login(client):
    response = client.post("/auth/demo-login", json={"email": "demo@example.com"})
    assert response.status_code == 200
    token = response.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def create_note(client, headers, title: str, file_name: str) -> str:
    note_id = client.post("/notes", headers=headers, json={"title": title}).json()["id"]
    upload_response = client.post(
        f"/notes/{note_id}/audio",
        headers=headers,
        json={
            "fileName": file_name,
            "mimeType": "audio/mpeg",
            "fileSizeBytes": 1024,
            "durationSeconds": 30,
        },
    )
    assert upload_response.status_code == 202
    return note_id


def test_list_notes_returns_status_and_summary_preview(client):
    headers = login(client)
    completed_note_id = create_note(client, headers, "Completed note", "done.mp3")
    processing_note_id = create_note(client, headers, "Newest note", "queued.mp3")

    assert process_next_job() is True

    response = client.get("/notes", headers=headers)
    assert response.status_code == 200

    items = response.json()["items"]
    by_id = {item["id"]: item for item in items}
    assert set(by_id) == {processing_note_id, completed_note_id}
    assert by_id[completed_note_id]["status"] == "completed"
    assert by_id[completed_note_id]["summaryPreview"]
    assert by_id[processing_note_id]["status"] == "uploaded"
    assert by_id[processing_note_id]["summaryPreview"] is None


def test_list_notes_surfaces_processing_failures(client):
    headers = login(client)
    create_note(client, headers, "Please fail", "fail.mp3")

    assert process_next_job() is True

    response = client.get("/notes", headers=headers)
    assert response.status_code == 200

    failed_note = response.json()["items"][0]
    assert failed_note["status"] == "failed"
    assert failed_note["errorMessage"] == "Processing failed. Try a clearer or longer recording."
