import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "../../app/lib/api/baseUrl";

describe("api base url helper", () => {
  it("prefers platform-specific Expo overrides", () => {
    expect(
      resolveApiBaseUrl("android", {
        EXPO_PUBLIC_API_BASE_URL: "http://localhost:9000/",
        EXPO_PUBLIC_API_BASE_URL_ANDROID: "http://10.10.0.2:9000/",
      }),
    ).toBe("http://10.10.0.2:9000");
  });

  it("falls back to the generic Expo override when the platform one is absent", () => {
    expect(
      resolveApiBaseUrl("ios", {
        EXPO_PUBLIC_API_BASE_URL: "http://127.0.0.1:9000/",
      }),
    ).toBe("http://127.0.0.1:9000");
  });

  it("uses stable emulator and simulator defaults when no override is present", () => {
    expect(resolveApiBaseUrl("android", {})).toBe("http://10.0.2.2:8000");
    expect(resolveApiBaseUrl("ios", {})).toBe("http://127.0.0.1:8000");
    expect(resolveApiBaseUrl("web", {})).toBe("http://localhost:8000");
  });
});
