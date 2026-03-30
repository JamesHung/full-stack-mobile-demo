#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(__dirname, "..", "package.json"));
const tsxPath = require.resolve("tsx");
const cli = resolve(__dirname, "..", "src", "cli.ts");

try {
  execFileSync(process.execPath, ["--import", tsxPath, cli, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: {
      ...process.env,
      TSX_TSCONFIG_PATH: resolve(__dirname, "..", "tsconfig.json"),
    },
  });
} catch (e) {
  process.exit(e.status ?? 1);
}
