import { describe, it, expect } from "vitest";
import {
  buildErrorSummary,
  renderTerminalSummary,
  renderMarkdownSummary,
} from "../../src/logs/error-summary.js";

describe("buildErrorSummary", () => {
  it("builds a complete error summary with all fields", () => {
    const summary = buildErrorSummary({
      stage: "health-check",
      exitCode: 5,
      durationMs: 62400,
      serviceName: "backend-api",
      logTail: ["Error: connection timeout", "at Socket.onTimeout"],
    });

    expect(summary.stage).toBe("health-check");
    expect(summary.exitCode).toBe(5);
    expect(summary.serviceName).toBe("backend-api");
    expect(summary.logTail).toHaveLength(2);
    expect(summary.renderedText).toContain("SMOKE KIT");
    expect(summary.renderedMarkdown).toContain("❌");
  });

  it("handles missing service name", () => {
    const summary = buildErrorSummary({
      stage: "preflight",
      exitCode: 3,
      durationMs: 1200,
      logTail: [],
    });

    expect(summary.serviceName).toBeNull();
    expect(summary.renderedText).not.toContain("Service:");
  });
});

describe("renderTerminalSummary", () => {
  it("includes box drawing characters", () => {
    const summary = buildErrorSummary({
      stage: "test-execution",
      exitCode: 6,
      durationMs: 45000,
      logTail: ["Test failed: Login flow"],
    });

    const text = renderTerminalSummary(summary);
    expect(text).toContain("═");
    expect(text).toContain("─");
    expect(text).toContain("Stage:");
    expect(text).toContain("Exit Code:");
    expect(text).toContain("test-execution");
  });

  it("formats duration correctly", () => {
    const summary = buildErrorSummary({
      stage: "service-startup",
      exitCode: 4,
      durationMs: 125000,
      logTail: [],
    });
    expect(summary.renderedText).toContain("2m 5s");
  });
});

describe("renderMarkdownSummary", () => {
  it("includes collapsible details block for log tail", () => {
    const summary = buildErrorSummary({
      stage: "health-check",
      exitCode: 5,
      durationMs: 60000,
      serviceName: "api",
      logTail: ["Connection refused", "Retry 30/30"],
    });

    const md = renderMarkdownSummary(summary);
    expect(md).toContain("<details>");
    expect(md).toContain("</details>");
    expect(md).toContain("```");
    expect(md).toContain("Connection refused");
  });

  it("includes table with service name", () => {
    const summary = buildErrorSummary({
      stage: "health-check",
      exitCode: 5,
      durationMs: 5000,
      serviceName: "worker",
      logTail: [],
    });
    const md = renderMarkdownSummary(summary);
    expect(md).toContain("| Service | worker |");
  });
});
