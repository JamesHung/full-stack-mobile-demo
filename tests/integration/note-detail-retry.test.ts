import { getNoteDetailScreenState } from "../../app/notes/[noteId]";

describe("note detail state", () => {
  it("renders completed note results", () => {
    expect(
      getNoteDetailScreenState({
        id: "note-1",
        title: "Standup",
        status: "completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["team"],
        transcript: "Transcript",
        summary: "Summary",
      }),
    ).toEqual({
      mode: "completed",
      transcript: "Transcript",
      summary: "Summary",
      tags: ["team"],
    });
  });

  it("renders failed and retriable note details with explicit copy", () => {
    expect(
      getNoteDetailScreenState({
        id: "note-2",
        title: "Retry me",
        status: "failed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        errorMessage: "Processing failed. Try a clearer or longer recording.",
      }),
    ).toEqual({
      mode: "failed",
      errorMessage: "Processing failed. Try a clearer or longer recording.",
      canRetry: true,
    });
  });

  it("returns the pending state after retry moves the note back into processing", () => {
    expect(
      getNoteDetailScreenState({
        id: "note-3",
        title: "Retry me again",
        status: "uploaded",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
      }),
    ).toEqual({
      mode: "pending",
      message: "Processing is still in progress.",
    });
  });
});
