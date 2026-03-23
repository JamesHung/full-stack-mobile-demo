import {
  buildSummaryPreview,
  validateCreateNotePayload,
  validateUploadAudioPayload,
} from "@voice-notes/shared";
import { getCreateVoiceNoteState } from "../../app/features/notes/components/CreateVoiceNoteForm";

describe("create and upload helpers", () => {
  it("rejects a title over the limit", () => {
    expect(validateCreateNotePayload({ title: "a".repeat(121) })).toContain(
      "Title must be 120 characters or fewer.",
    );
  });

  it("rejects unsupported uploads", () => {
    expect(
      validateUploadAudioPayload({
        fileName: "clip.ogg",
        mimeType: "audio/ogg",
        fileSizeBytes: 200,
      }),
    ).toContain("Unsupported audio format.");
  });

  it("builds the form state and summary preview", () => {
    expect(
      getCreateVoiceNoteState({
        title: "Idea",
        audio: {
          fileName: "clip.mp3",
          mimeType: "audio/mpeg",
          fileSizeBytes: 1024,
        },
      }),
    ).toEqual({
      status: "ready",
      message: "Ready to upload clip.mp3.",
    });
    expect(buildSummaryPreview("a".repeat(120))?.length).toBeLessThanOrEqual(96);
  });
});
