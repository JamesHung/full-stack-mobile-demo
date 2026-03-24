// @ts-nocheck
import React from "react";
import { getStatusBadgeTone, renderNoteCardCopy } from "./NoteCard";

function DebugStory({ value }) {
  return React.createElement("pre", null, JSON.stringify(value, null, 2));
}

const meta = {
  title: "Notes/NoteCard",
  component: () => null,
};

export default meta;

export const Completed = {
  render: () =>
    React.createElement(DebugStory, {
      value: renderNoteCardCopy({
        id: "note-1",
        title: "Sprint recap",
        status: "completed",
        summaryPreview: "Team aligned on three launch blockers.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    }),
};

export const Failed = {
  render: () => React.createElement(DebugStory, { value: { tone: getStatusBadgeTone("failed") } }),
};

export const Processing = {
  render: () => React.createElement(DebugStory, { value: { tone: getStatusBadgeTone("processing") } }),
};
