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
});
