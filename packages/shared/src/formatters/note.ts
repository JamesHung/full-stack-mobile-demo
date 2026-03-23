export function buildSummaryPreview(summary?: string | null, maxLength = 96): string | null {
  if (!summary) {
    return null;
  }

  const trimmed = summary.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function formatTimestampLabel(isoString: string): string {
  const date = new Date(isoString);
  return Number.isNaN(date.valueOf()) ? isoString : date.toISOString();
}
