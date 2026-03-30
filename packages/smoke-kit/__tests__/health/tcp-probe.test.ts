import { describe, it, expect, vi, afterEach } from "vitest";
import { tcpProbe } from "../../src/health/tcp-probe.js";
import * as net from "node:net";

vi.mock("node:net");

const mockedNet = vi.mocked(net);

describe("tcpProbe", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when connection succeeds immediately", async () => {
    mockedNet.createConnection.mockImplementation((_opts: unknown, cb?: () => void) => {
      if (cb) setTimeout(cb, 0);
      const socket = {
        destroy: vi.fn(),
        on: vi.fn(),
        setTimeout: vi.fn(),
      };
      return socket as unknown as net.Socket;
    });

    const result = await tcpProbe({ port: 8000, timeout: 2, retryInterval: 1 });
    expect(result).toBe(true);
  });

  it("returns false when timeout expires", async () => {
    mockedNet.createConnection.mockImplementation(() => {
      const socket = {
        destroy: vi.fn(),
        on: vi.fn().mockImplementation((event: string, cb: () => void) => {
          if (event === "error") setTimeout(cb, 0);
          return socket;
        }),
        setTimeout: vi.fn(),
      };
      return socket as unknown as net.Socket;
    });

    const result = await tcpProbe({
      port: 9999,
      timeout: 1,
      retryInterval: 0.3,
    });
    expect(result).toBe(false);
  });
});
