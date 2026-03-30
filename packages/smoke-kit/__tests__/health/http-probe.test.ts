import { describe, it, expect, vi, afterEach } from "vitest";
import { httpProbe } from "../../src/health/http-probe.js";

describe("httpProbe", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true on successful 2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    );

    const result = await httpProbe({
      url: "http://localhost:8000/health",
      timeout: 2,
      retryInterval: 0.5,
    });
    expect(result).toBe(true);
  });

  it("retries on 5xx and eventually succeeds", async () => {
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ ok: false, status: 503 });
        }
        return Promise.resolve({ ok: true, status: 200 });
      }),
    );

    const result = await httpProbe({
      url: "http://localhost:8000/health",
      timeout: 10,
      retryInterval: 0.1,
    });
    expect(result).toBe(true);
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  it("returns false on 4xx without retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    const result = await httpProbe({
      url: "http://localhost:8000/nope",
      timeout: 2,
      retryInterval: 0.5,
    });
    expect(result).toBe(false);
  });

  it("returns false when timeout expires on connection error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Connection refused")),
    );

    const result = await httpProbe({
      url: "http://localhost:9999/health",
      timeout: 1,
      retryInterval: 0.2,
    });
    expect(result).toBe(false);
  });
});
