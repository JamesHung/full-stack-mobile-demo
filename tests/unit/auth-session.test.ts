import { afterEach, describe, expect, it } from "vitest";
import { clearAuthSession, getAuthSession, setAuthSession } from "../../app/features/auth/session";

describe("auth session store", () => {
  afterEach(() => {
    clearAuthSession();
  });

  it("stores and clears the demo session", () => {
    setAuthSession({
      accessToken: "token-123",
      tokenType: "Bearer",
      user: {
        id: "user-1",
        email: "demo@example.com",
        displayName: "Demo User",
      },
    });

    expect(getAuthSession()?.accessToken).toBe("token-123");
    expect(getAuthSession()?.user.displayName).toBe("Demo User");

    clearAuthSession();

    expect(getAuthSession()).toBeNull();
  });
});
