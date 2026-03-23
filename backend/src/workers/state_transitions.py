from datetime import UTC, datetime

from backend.src.logging.logger import configure_logging, log_event
from backend.src.services.processing_results import (
    persist_processing_failure,
    persist_processing_success,
)

logger = configure_logging()


def transition_job_to_running(connection, job_id: str, note_id: str) -> None:
    timestamp = datetime.now(UTC).isoformat()
    connection.execute(
        """
        UPDATE processing_jobs
        SET status = 'running', started_at = ?
        WHERE id = ?
        """,
        (timestamp, job_id),
    )
    connection.execute(
        """
        UPDATE voice_notes
        SET status = 'processing', updated_at = ?
        WHERE id = ?
        """,
        (timestamp, note_id),
    )
    log_event(logger, "worker.job_started", job_id=job_id, note_id=note_id)


E2E_TRANSCRIPT = (
    "美國與伊朗之間的緊張局勢持續升高。\n"
    "根據最新消息，美國總統川普要求伊朗在限定時間內恢復霍爾木茲海峽的正常通行，否則美方可能對伊朗的電力基礎設施採取軍事行動。\n"
    "對此，伊朗方面表示，若美國發動攻擊，將對區域內與美方相關的能源及基礎設施進行報復，並警告衝突可能進一步擴大。\n"
    "伊朗同時重申，霍爾木茲海峽的局勢已對全球能源市場帶來明顯衝擊。\n"
    "另一方面，美軍中央司令部官員表示，相關軍事行動目前正在依計劃進行。\n"
    "隨著中東局勢升溫，國際社會也持續關注衝突是否會影響區域安全、全球油價，以及更廣泛的經濟穩定。\n"
    "以上是最新國際情勢摘要。"
)

E2E_SUMMARY = "美國與伊朗局勢緊張，川普要求恢復霍爾木茲海峽通行否則動武，伊朗警告將報復並衝擊能源市場。"


def complete_processing(
    connection,
    job_id: str,
    note_id: str,
    title: str,
    should_fail: bool = False,
    file_name: str | None = None,
) -> None:
    if should_fail:
        persist_processing_failure(
            connection,
            note_id=note_id,
            job_id=job_id,
            failure_reason="synthetic_failure",
            user_message="Processing failed. Try a clearer or longer recording.",
        )
        log_event(logger, "worker.job_failed", job_id=job_id, note_id=note_id, reason="synthetic_failure")
        return

    if file_name == "@e2e.m4a":
        transcript = E2E_TRANSCRIPT
        summary = E2E_SUMMARY
        tags = ["iran", "usa", "oil"]
    else:
        transcript = f"Transcript for {title}"
        summary = f"Summary for {title}"
        tags = [segment.lower() for segment in title.split()[:3] if segment.strip()] or ["voice-note"]

    persist_processing_success(
        connection,
        note_id=note_id,
        summary=summary,
        transcript=transcript,
        tags=tags,
        job_id=job_id,
    )
    log_event(logger, "worker.job_completed", job_id=job_id, note_id=note_id)
