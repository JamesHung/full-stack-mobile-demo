import type { NoteDetailDto } from "@voice-notes/shared";
import { canRetryNote } from "@voice-notes/shared";

export function getResultPanelState(note: NoteDetailDto) {
  if (note.status === "completed") {
    return {
      mode: "completed",
      transcript: note.transcript ?? "",
      summary: note.summary ?? "",
      tags: note.tags,
    };
  }

  if (canRetryNote(note.status)) {
    return {
      mode: "failed",
      errorMessage: note.errorMessage ?? "Processing failed.",
      canRetry: true,
    };
  }

  return {
    mode: "pending",
    message: "Processing is still in progress.",
  };
}
