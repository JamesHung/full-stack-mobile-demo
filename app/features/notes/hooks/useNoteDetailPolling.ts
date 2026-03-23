export function shouldPollNote(status?: string | null, isFocused = true): boolean {
  return isFocused && (status === "uploaded" || status === "processing");
}
