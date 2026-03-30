import { readFile } from "node:fs/promises";

export async function tailLines(
  filePath: string,
  lines: number = 50,
): Promise<string[]> {
  try {
    const content = await readFile(filePath, "utf-8");
    if (!content.trim()) return [];
    const allLines = content.split("\n");
    // Remove trailing empty line from final newline
    if (allLines[allLines.length - 1] === "") {
      allLines.pop();
    }
    return allLines.slice(-lines);
  } catch {
    return [];
  }
}
