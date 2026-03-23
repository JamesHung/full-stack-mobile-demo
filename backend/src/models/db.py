from dataclasses import dataclass


@dataclass(slots=True)
class UserRecord:
    id: str
    email: str
    display_name: str
    auth_provider: str
    created_at: str


@dataclass(slots=True)
class VoiceNoteRecord:
    id: str
    user_id: str
    title: str
    status: str
    summary: str | None
    summary_preview: str | None
    transcript: str | None
    tags: str | None
    error_code: str | None
    error_message: str | None
    latest_job_id: str | None
    audio_asset_id: str | None
    created_at: str
    updated_at: str
    completed_at: str | None


@dataclass(slots=True)
class AudioAssetRecord:
    id: str
    note_id: str
    storage_key: str
    file_name: str
    mime_type: str
    file_size_bytes: int
    duration_seconds: int | None
    uploaded_at: str


@dataclass(slots=True)
class ProcessingJobRecord:
    id: str
    note_id: str
    attempt: int
    status: str
    started_at: str | None
    finished_at: str | None
    failure_reason: str | None
    created_at: str
