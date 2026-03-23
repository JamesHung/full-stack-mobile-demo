import { getStatusBadgeTone, renderNoteCardCopy } from "../../app/features/notes/components/NoteCard";

describe("note list helpers", () => {
  it("maps status badges and summary previews", () => {
    expect(getStatusBadgeTone("processing")).toBe("info");
    expect(
      renderNoteCardCopy({
        id: "note-1",
        title: "Planning",
        status: "completed",
        summaryPreview: "Done",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
      }).subtitle,
    ).toBe("Done");
  });
});
