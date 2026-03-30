import { writeFile } from "node:fs/promises";
import type { SmokeRun } from "../config/types.js";

export async function writeSummary(
  path: string,
  run: SmokeRun,
): Promise<void> {
  await writeFile(path, JSON.stringify(run, null, 2) + "\n", "utf-8");
}
