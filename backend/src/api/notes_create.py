from fastapi import APIRouter, Depends, status

from backend.src.services.auth import UserResponse, get_current_user
from backend.src.services.note_creation import CreateNoteRequest, UploadAudioRequest, create_note, upload_audio

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create note",
    description="Create a draft voice note record before attaching audio.",
)
def create_note_endpoint(payload: CreateNoteRequest, user: UserResponse = Depends(get_current_user)) -> dict:
    return create_note(user.id, payload)


@router.post(
    "/{note_id}/audio",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload audio",
    description="Attach an audio file to a note and enqueue background processing.",
)
def upload_audio_endpoint(
    note_id: str,
    payload: UploadAudioRequest,
    user: UserResponse = Depends(get_current_user),
) -> dict:
    return upload_audio(user.id, note_id, payload)
