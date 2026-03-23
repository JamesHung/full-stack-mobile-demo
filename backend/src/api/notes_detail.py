from fastapi import APIRouter, Depends, status

from backend.src.services.auth import UserResponse, get_current_user
from backend.src.services.note_detail import get_note_for_user
from backend.src.services.retry_processing import retry_note

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get(
    "/{note_id}",
    summary="Get note detail",
    description="Return transcript, summary, tags, status, and failure information for one note.",
)
def get_note_detail_endpoint(note_id: str, user: UserResponse = Depends(get_current_user)) -> dict:
    return get_note_for_user(user.id, note_id)


@router.post(
    "/{note_id}/retry",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Retry note processing",
    description="Create a new processing attempt for a failed note owned by the authenticated user.",
)
def retry_note_endpoint(note_id: str, user: UserResponse = Depends(get_current_user)) -> dict:
    return retry_note(user.id, note_id)
