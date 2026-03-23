import type { CreateNoteRequestDto, UploadAudioInputDto } from "../contracts/note";

const SUPPORTED_AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-wav", "audio/webm"];
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

export function validateCreateNotePayload(payload: CreateNoteRequestDto): string[] {
  const errors: string[] = [];

  if (payload.title && payload.title.trim().length > 120) {
    errors.push("Title must be 120 characters or fewer.");
  }

  return errors;
}

export function validateUploadAudioPayload(payload: UploadAudioInputDto): string[] {
  const errors: string[] = [];

  if (!SUPPORTED_AUDIO_TYPES.includes(payload.mimeType)) {
    errors.push("Unsupported audio format.");
  }

  if (payload.fileSizeBytes <= 0 || payload.fileSizeBytes > MAX_AUDIO_SIZE_BYTES) {
    errors.push("Audio file exceeds the supported size limit.");
  }

  if (payload.durationSeconds !== undefined && payload.durationSeconds <= 0) {
    errors.push("Audio duration must be greater than zero.");
  }

  return errors;
}

export function canRetryNote(status: string): boolean {
  return status === "failed";
}

export { MAX_AUDIO_SIZE_BYTES, SUPPORTED_AUDIO_TYPES };
