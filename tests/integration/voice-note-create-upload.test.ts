import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getListScreenState } from "../../app/(tabs)/index";
import { getDemoLoginCopy } from "../../app/sign-in";
import { buildCreateScreenState } from "../../app/notes/create";

describe("voice note create/upload flow state", () => {
  it("covers sign-in, create, and list states", () => {
    expect(getDemoLoginCopy(false)).toBe("Sign in with the demo account");
    expect(buildCreateScreenState()).toEqual({
      status: "idle",
      message: "Choose an audio file or record a clip.",
    });
    expect(
      getListScreenState({
        items: [
          {
            id: "note-1",
            title: "Idea",
            status: "uploaded",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    ).toBe("ready");
  });

  it("keeps the canonical smoke flow aligned with the upload and retry selectors", () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const smokeFlow = readFileSync(path.resolve(currentDir, "../../.maestro/voice-notes-smoke.yaml"), "utf-8");

    expect(smokeFlow).toContain("label: \"Create a unique failing note with the canonical sample upload\"");
    expect(smokeFlow).toContain("inputText: \"${SMOKE_NOTE_TITLE}\"");
    expect(smokeFlow).toContain("- tapOn: \"Upload sample\"");
    expect(smokeFlow).toContain("- tapOn: \"Retry\"");
  });
});
