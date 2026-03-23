import type { UploadAudioInputDto } from "@voice-notes/shared";

export interface CreateVoiceNoteFormState {
  title: string;
  audio?: UploadAudioInputDto;
  error?: string | null;
  isSubmitting?: boolean;
}

export function getCreateVoiceNoteState(state: CreateVoiceNoteFormState) {
  if (state.error) {
    return {
      status: "error",
      message: state.error,
    };
  }

  if (state.isSubmitting) {
    return {
      status: "loading",
      message: "Uploading your voice note…",
    };
  }

  if (!state.audio) {
    return {
      status: "idle",
      message: "Choose an audio file or record a clip.",
    };
  }

  return {
    status: "ready",
    message: `Ready to upload ${state.audio.fileName}.`,
  };
}
