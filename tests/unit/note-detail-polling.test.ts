import { getResultPanelState } from "../../app/features/notes/components/ResultPanel";
import { shouldPollNote } from "../../app/features/notes/hooks/useNoteDetailPolling";

describe("note detail polling", () => {
  it("polls only while a note is in flight", () => {
    expect(shouldPollNote("uploaded", true)).toBe(true);
    expect(shouldPollNote("completed", true)).toBe(false);
    expect(shouldPollNote("processing", false)).toBe(false);
  });

  it("exposes retry affordance for failed notes", () => {
    expect(
      getResultPanelState({
        id: "note-1",
        title: "Retry",
        status: "failed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        errorMessage: "Processing failed.",
      }),
    ).toEqual({
      mode: "failed",
      errorMessage: "Processing failed.",
      canRetry: true,
    });
  });
});
