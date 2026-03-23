import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, Field

from backend.src.exceptions.errors import ConflictError, NotFoundError
from backend.src.logging.logger import configure_logging, log_event
from backend.src.services.database import session
from backend.src.settings.config import get_settings

ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/webm"}
MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024

logger = configure_logging()


class CreateNoteRequest(BaseModel):
    title: str = Field(default="Untitled note", max_length=120)


class UploadAudioRequest(BaseModel):
    fileName: str
    mimeType: str
    fileSizeBytes: int = Field(gt=0, le=MAX_AUDIO_SIZE_BYTES)
    durationSeconds: int | None = Field(default=None, gt=0)


def _now() -> str:
    return datetime.now(UTC).isoformat()


def create_note(user_id: str, payload: CreateNoteRequest) -> dict:
    note_id = str(uuid4())
    timestamp = _now()
    title = payload.title.strip() or "Untitled note"
    with session() as connection:
        connection.execute(
            """
            INSERT INTO voice_notes (
                id, user_id, title, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (note_id, user_id, title, "draft", timestamp, timestamp),
        )

    return get_note_detail(user_id, note_id)


def upload_audio(user_id: str, note_id: str, payload: UploadAudioRequest) -> dict:
    if payload.mimeType not in ALLOWED_AUDIO_TYPES:
        raise ConflictError("Unsupported audio format.")

    settings = get_settings()
    with session() as connection:
        note = connection.execute(
            "SELECT * FROM voice_notes WHERE id = ? AND user_id = ?",
            (note_id, user_id),
        ).fetchone()
        if note is None:
            raise NotFoundError("Note not found.")

        existing_job = connection.execute(
            """
            SELECT id FROM processing_jobs
            WHERE note_id = ? AND status IN ('queued', 'running')
            """,
            (note_id,),
        ).fetchone()
        if existing_job is not None:
            raise ConflictError("A processing job is already active for this note.")

        asset_id = str(uuid4())
        job_id = str(uuid4())
        timestamp = _now()
        storage_key = str(Path(settings.audio_storage_dir) / f"{asset_id}-{payload.fileName}")
        Path(storage_key).write_text(
            json.dumps(payload.model_dump(mode="json"), ensure_ascii=True),
            encoding="utf-8",
        )

        connection.execute(
            """
            INSERT INTO audio_assets (
                id, note_id, storage_key, file_name, mime_type, file_size_bytes, duration_seconds, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                asset_id,
                note_id,
                storage_key,
                payload.fileName,
                payload.mimeType,
                payload.fileSizeBytes,
                payload.durationSeconds,
                timestamp,
            ),
        )

        attempt = connection.execute(
            "SELECT COALESCE(MAX(attempt), 0) + 1 AS next_attempt FROM processing_jobs WHERE note_id = ?",
            (note_id,),
        ).fetchone()["next_attempt"]

        connection.execute(
            """
            INSERT INTO processing_jobs (
                id, note_id, attempt, status, created_at
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (job_id, note_id, attempt, "queued", timestamp),
        )

        connection.execute(
            """
            UPDATE voice_notes
            SET status = 'uploaded', audio_asset_id = ?, latest_job_id = ?, updated_at = ?,
                error_code = NULL, error_message = NULL
            WHERE id = ?
            """,
            (asset_id, job_id, timestamp, note_id),
        )

    log_event(
        logger,
        "note.audio_uploaded",
        note_id=note_id,
        user_id=user_id,
        job_id=job_id,
        file_name=payload.fileName,
    )

    detail = get_note_detail(user_id, note_id)
    return {
        "note": detail,
        "job": detail["latestJob"],
    }


def get_note_detail(user_id: str, note_id: str) -> dict:
    with session() as connection:
        note = connection.execute(
            "SELECT * FROM voice_notes WHERE id = ? AND user_id = ?",
            (note_id, user_id),
        ).fetchone()
        if note is None:
            raise NotFoundError("Note not found.")

        asset = None
        if note["audio_asset_id"]:
            asset = connection.execute(
                "SELECT * FROM audio_assets WHERE id = ?",
                (note["audio_asset_id"],),
            ).fetchone()

        latest_job = None
        if note["latest_job_id"]:
            latest_job = connection.execute(
                "SELECT * FROM processing_jobs WHERE id = ?",
                (note["latest_job_id"],),
            ).fetchone()

    return serialize_note_detail(note, asset, latest_job)


def serialize_note_detail(note, asset, latest_job) -> dict:
    return {
        "id": note["id"],
        "title": note["title"],
        "status": note["status"],
        "summaryPreview": note["summary_preview"],
        "errorMessage": note["error_message"],
        "createdAt": note["created_at"],
        "updatedAt": note["updated_at"],
        "transcript": note["transcript"],
        "summary": note["summary"],
        "tags": json.loads(note["tags"]) if note["tags"] else [],
        "audio": None
        if asset is None
        else {
            "id": asset["id"],
            "fileName": asset["file_name"],
            "mimeType": asset["mime_type"],
            "fileSizeBytes": asset["file_size_bytes"],
            "durationSeconds": asset["duration_seconds"],
            "uploadedAt": asset["uploaded_at"],
        },
        "latestJob": None
        if latest_job is None
        else {
            "id": latest_job["id"],
            "attempt": latest_job["attempt"],
            "status": latest_job["status"],
            "createdAt": latest_job["created_at"],
            "startedAt": latest_job["started_at"],
            "finishedAt": latest_job["finished_at"],
            "failureReason": latest_job["failure_reason"],
        },
    }
