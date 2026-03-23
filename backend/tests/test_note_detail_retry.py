from backend.src.workers.notes import process_next_job


def login(client):
    response = client.post("/auth/demo-login", json={"email": "demo@example.com"})
    token = response.json()["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def create_failed_note(client, headers):
    note_id = client.post("/notes", headers=headers, json={"title": "Please fail"}).json()["id"]
    client.post(
        f"/notes/{note_id}/audio",
        headers=headers,
        json={
            "fileName": "fail.mp3",
            "mimeType": "audio/mpeg",
            "fileSizeBytes": 1024,
            "durationSeconds": 10,
        },
    )
    assert process_next_job() is True
    return note_id


def test_detail_and_retry_flow(client):
    headers = login(client)
    note_id = create_failed_note(client, headers)

    detail_response = client.get(f"/notes/{note_id}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["status"] == "failed"

    retry_response = client.post(f"/notes/{note_id}/retry", headers=headers)
    assert retry_response.status_code == 202
    assert retry_response.json()["note"]["status"] == "uploaded"
