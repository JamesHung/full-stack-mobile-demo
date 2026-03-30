import type { ErrorSummary } from "../config/types.js";

const BORDER = "═".repeat(51);
const DIVIDER = "─".repeat(51);

export function renderTerminalSummary(summary: ErrorSummary): string {
  const lines: string[] = [
    BORDER,
    " SMOKE KIT — ERROR SUMMARY",
    BORDER,
    ` Stage:      ${summary.stage}`,
    ` Exit Code:  ${summary.exitCode}`,
    ` Duration:   ${formatDuration(summary.durationMs)}`,
  ];

  if (summary.serviceName) {
    lines.push(` Service:    ${summary.serviceName}`);
  }

  if (summary.logTail.length > 0) {
    lines.push(DIVIDER);
    lines.push(` Last ${summary.logTail.length} lines of log:`);
    lines.push("");
    for (const line of summary.logTail) {
      lines.push(` ${line}`);
    }
    lines.push("");
  }

  lines.push(BORDER);
  return lines.join("\n");
}

export function renderMarkdownSummary(summary: ErrorSummary): string {
  const lines: string[] = [
    "## ❌ Smoke Kit — Error Summary",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| Stage | ${summary.stage} |`,
    `| Exit Code | ${summary.exitCode} |`,
    `| Duration | ${formatDuration(summary.durationMs)} |`,
  ];

  if (summary.serviceName) {
    lines.push(`| Service | ${summary.serviceName} |`);
  }

  if (summary.logTail.length > 0) {
    lines.push("");
    lines.push("<details>");
    lines.push(`<summary>Last ${summary.logTail.length} lines of log</summary>`);
    lines.push("");
    lines.push("```");
    for (const line of summary.logTail) {
      lines.push(line);
    }
    lines.push("```");
    lines.push("");
    lines.push("</details>");
  }

  return lines.join("\n");
}

export function buildErrorSummary(params: {
  stage: string;
  exitCode: number;
  durationMs: number;
  serviceName?: string;
  logTail: string[];
}): ErrorSummary {
  const summary: ErrorSummary = {
    stage: params.stage,
    exitCode: params.exitCode,
    durationMs: params.durationMs,
    serviceName: params.serviceName ?? null,
    logTail: params.logTail,
    renderedText: "",
    renderedMarkdown: "",
  };
  summary.renderedText = renderTerminalSummary(summary);
  summary.renderedMarkdown = renderMarkdownSummary(summary);
  return summary;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(0);
  return `${minutes}m ${remainingSeconds}s`;
}
