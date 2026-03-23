import json
from datetime import UTC, datetime


def _preview(summary: str) -> str:
    return summary if len(summary) <= 96 else f"{summary[:95].rstrip()}…"


def persist_processing_success(connection, note_id: str, summary: str, transcript: str, tags: list[str], job_id: str) -> None:
    timestamp = datetime.now(UTC).isoformat()
    connection.execute(
        """
        UPDATE processing_jobs
        SET status = 'completed', finished_at = ?, failure_reason = NULL
        WHERE id = ?
        """,
        (timestamp, job_id),
    )
    connection.execute(
        """
        UPDATE voice_notes
        SET status = 'completed', summary = ?, summary_preview = ?, transcript = ?, tags = ?,
            error_code = NULL, error_message = NULL, updated_at = ?, completed_at = ?
        WHERE id = ?
        """,
        (summary, _preview(summary), transcript, json.dumps(tags), timestamp, timestamp, note_id),
    )


def persist_processing_failure(connection, note_id: str, job_id: str, failure_reason: str, user_message: str) -> None:
    timestamp = datetime.now(UTC).isoformat()
    connection.execute(
        """
        UPDATE processing_jobs
        SET status = 'failed', finished_at = ?, failure_reason = ?
        WHERE id = ?
        """,
        (timestamp, failure_reason, job_id),
    )
    connection.execute(
        """
        UPDATE voice_notes
        SET status = 'failed', error_code = 'processing_failed', error_message = ?, updated_at = ?
        WHERE id = ?
        """,
        (user_message, timestamp, note_id),
    )
