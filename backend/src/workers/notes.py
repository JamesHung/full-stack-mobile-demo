import time

from backend.src.logging.logger import configure_logging, log_event
from backend.src.services.database import bootstrap_database, session
from backend.src.settings.config import get_settings
from backend.src.workers.state_transitions import complete_processing, transition_job_to_running


def process_next_job() -> bool:
    with session() as connection:
        job = connection.execute(
            """
            SELECT jobs.id, jobs.note_id, notes.title, assets.file_name
            FROM processing_jobs AS jobs
            JOIN voice_notes AS notes ON notes.id = jobs.note_id
            JOIN audio_assets AS assets ON assets.id = notes.audio_asset_id
            WHERE jobs.status = 'queued'
            ORDER BY jobs.created_at ASC
            LIMIT 1
            """
        ).fetchone()
        if job is None:
            return False

        transition_job_to_running(connection, job["id"], job["note_id"])
        should_fail = "fail" in (job["title"] or "").lower()
        complete_processing(
            connection,
            job["id"],
            job["note_id"],
            job["title"],
            should_fail=should_fail,
            file_name=job["file_name"],
        )
        return True


def worker_loop() -> None:
    bootstrap_database()
    logger = configure_logging()
    interval_seconds = get_settings().processing_poll_interval_ms / 1000
    while True:
        processed = process_next_job()
        log_event(logger, "worker.tick", processed=processed)
        time.sleep(interval_seconds)


if __name__ == "__main__":
    worker_loop()
