import { getStatusBadgeTone, renderNoteCardCopy } from "../../app/features/notes/components/NoteCard";

describe("note list formatting", () => {
  it("maps in-flight notes to the info badge tone", () => {
    expect(getStatusBadgeTone("uploaded")).toBe("info");
    expect(getStatusBadgeTone("processing")).toBe("info");
  });

  it("prefers summary preview, then error copy, then fallback text", () => {
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

    expect(
      renderNoteCardCopy({
        id: "note-2",
        title: "Broken",
        status: "failed",
        errorMessage: "Processing failed",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
      }).subtitle,
    ).toBe("Processing failed");

    expect(
      renderNoteCardCopy({
        id: "note-3",
        title: "",
        status: "draft",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
      }),
    ).toMatchObject({
      title: "Untitled note",
      subtitle: "No summary yet.",
    });
  });
});
