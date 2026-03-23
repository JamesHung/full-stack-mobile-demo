from backend.src.services.note_creation import get_note_detail


def get_note_for_user(user_id: str, note_id: str) -> dict:
    return get_note_detail(user_id, note_id)
