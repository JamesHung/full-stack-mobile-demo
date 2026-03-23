import { getListScreenState } from "../../app/(tabs)/index";
import { renderNoteCardCopy } from "../../app/features/notes/components/NoteCard";

describe("note list status flow", () => {
  it("reports loading, empty, ready, and error states", () => {
    expect(getListScreenState()).toBe("loading");
    expect(getListScreenState({ items: [] })).toBe("empty");
    expect(
      getListScreenState({
        items: [
          {
            id: "note-1",
            title: "Idea",
            status: "processing",
            createdAt: "2026-03-23T00:00:00.000Z",
            updatedAt: "2026-03-23T00:05:00.000Z",
          },
        ],
      }),
    ).toBe("ready");
    expect(getListScreenState({ items: [] }, "network")).toBe("error");
  });

  it("renders status-dependent copy for manual refresh views", () => {
    expect(
      renderNoteCardCopy({
        id: "note-2",
        title: "Weekly sync",
        status: "completed",
        summaryPreview: "Action items captured",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:05:00.000Z",
      }).subtitle,
    ).toBe("Action items captured");

    expect(
      renderNoteCardCopy({
        id: "note-3",
        title: "Retry me",
        status: "failed",
        errorMessage: "Tap refresh after retry",
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:05:00.000Z",
      }).subtitle,
    ).toBe("Tap refresh after retry");
  });
});
