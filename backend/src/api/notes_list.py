from fastapi import APIRouter, Depends

from backend.src.services.auth import UserResponse, get_current_user
from backend.src.services.note_listing import list_notes

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get(
    "",
    summary="List notes",
    description="Return the authenticated user's notes ordered by most recently updated.",
)
def list_notes_endpoint(user: UserResponse = Depends(get_current_user)) -> dict:
    return list_notes(user.id)
