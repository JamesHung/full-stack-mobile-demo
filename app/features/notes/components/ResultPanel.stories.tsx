// @ts-nocheck
import React from "react";
import { getResultPanelState } from "./ResultPanel";

function DebugStory({ value }) {
  return React.createElement("pre", null, JSON.stringify(value, null, 2));
}

const meta = {
  title: "Notes/ResultPanel",
  component: () => null,
};

export default meta;

export const Completed = {
  render: () =>
    React.createElement(DebugStory, {
      value: getResultPanelState({
        id: "note-1",
        title: "Weekly review",
        status: "completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ["weekly", "review"],
        transcript: "Transcript body",
        summary: "Summary body",
      }),
    }),
};

export const Failed = {
  render: () =>
    React.createElement(DebugStory, {
      value: getResultPanelState({
        id: "note-2",
        title: "Broken upload",
        status: "failed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        errorMessage: "Audio quality too low.",
      }),
    }),
};

export const PendingAfterRetry = {
  render: () =>
    React.createElement(DebugStory, {
      value: getResultPanelState({
        id: "note-3",
        title: "Retry pending",
        status: "uploaded",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
      }),
    }),
};
