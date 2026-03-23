import type { NoteListItemDto } from "@voice-notes/shared";
import { formatTimestampLabel } from "@voice-notes/shared";

export function getStatusBadgeTone(status: NoteListItemDto["status"]): "neutral" | "info" | "success" | "danger" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "uploaded":
    case "processing":
      return "info";
    default:
      return "neutral";
  }
}

export function renderNoteCardCopy(note: NoteListItemDto) {
  return {
    title: note.title || "Untitled note",
    subtitle: note.summaryPreview ?? note.errorMessage ?? "No summary yet.",
    updatedAt: formatTimestampLabel(note.updatedAt),
  };
}
