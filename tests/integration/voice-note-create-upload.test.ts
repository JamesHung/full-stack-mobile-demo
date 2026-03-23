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
});
