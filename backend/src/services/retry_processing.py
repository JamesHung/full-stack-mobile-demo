from datetime import UTC, datetime
from uuid import uuid4

from backend.src.exceptions.errors import ConflictError, NotFoundError
from backend.src.services.database import session
from backend.src.services.note_creation import get_note_detail


def retry_note(user_id: str, note_id: str) -> dict:
    with session() as connection:
        note = connection.execute(
            "SELECT * FROM voice_notes WHERE id = ? AND user_id = ?",
            (note_id, user_id),
        ).fetchone()
        if note is None:
            raise NotFoundError("Note not found.")
        if note["status"] != "failed":
            raise ConflictError("Retry is only available for failed notes.")

        active = connection.execute(
            """
            SELECT id FROM processing_jobs
            WHERE note_id = ? AND status IN ('queued', 'running')
            """,
            (note_id,),
        ).fetchone()
        if active is not None:
            raise ConflictError("A processing job is already active for this note.")

        attempt = connection.execute(
            "SELECT COALESCE(MAX(attempt), 0) + 1 AS next_attempt FROM processing_jobs WHERE note_id = ?",
            (note_id,),
        ).fetchone()["next_attempt"]
        job_id = str(uuid4())
        timestamp = datetime.now(UTC).isoformat()

        connection.execute(
            """
            INSERT INTO processing_jobs (id, note_id, attempt, status, created_at)
            VALUES (?, ?, ?, 'queued', ?)
            """,
            (job_id, note_id, attempt, timestamp),
        )
        connection.execute(
            """
            UPDATE voice_notes
            SET status = 'uploaded', latest_job_id = ?, error_code = NULL, error_message = NULL, updated_at = ?
            WHERE id = ?
            """,
            (job_id, timestamp, note_id),
        )

    detail = get_note_detail(user_id, note_id)
    return {"note": detail, "job": detail["latestJob"]}
