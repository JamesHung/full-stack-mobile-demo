from backend.src.services.database import session
from backend.src.services.note_creation import serialize_note_detail


def list_notes(user_id: str) -> dict:
    with session() as connection:
        rows = connection.execute(
            """
            SELECT * FROM voice_notes
            WHERE user_id = ?
            ORDER BY updated_at DESC
            """,
            (user_id,),
        ).fetchall()

        items = []
        for note in rows:
            asset = None
            job = None
            if note["audio_asset_id"]:
                asset = connection.execute(
                    "SELECT * FROM audio_assets WHERE id = ?",
                    (note["audio_asset_id"],),
                ).fetchone()
            if note["latest_job_id"]:
                job = connection.execute(
                    "SELECT * FROM processing_jobs WHERE id = ?",
                    (note["latest_job_id"],),
                ).fetchone()

            detail = serialize_note_detail(note, asset, job)
            items.append(
                {
                    "id": detail["id"],
                    "title": detail["title"],
                    "status": detail["status"],
                    "summaryPreview": detail["summaryPreview"],
                    "errorMessage": detail["errorMessage"],
                    "createdAt": detail["createdAt"],
                    "updatedAt": detail["updatedAt"],
                }
            )

    return {"items": items}
