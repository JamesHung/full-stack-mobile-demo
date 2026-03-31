#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, "../package.json"), "utf-8"),
);

const program = new Command();

program
  .name("smoke-kit")
  .description(
    "Portable mobile smoke test kit for Expo / React Native + Node/Python backends",
  )
  .version(pkg.version);

program
  .command("init")
  .description(
    "Detect project structure and generate a valid smoke.config.json",
  )
  .option("--app-root <path>", "Path to the Expo app directory")
  .option("--backend-root <path>", "Path to the backend directory")
  .option("--app-id <id>", "App identifier override")
  .option(
    "--output <path>",
    "Output path for config file",
    "smoke.config.json",
  )
  .option("--force", "Overwrite existing config without confirmation")
  .option("--dry-run", "Print generated config to stdout without writing")
  .action(async (opts) => {
    const { initCommand } = await import("./commands/init.js");
    await initCommand(opts);
  });

program
  .command("scaffold")
  .description(
    "Inject full smoke test structure (config, scripts, flows, workflow) into a project",
  )
  .option("--app-root <path>", "Path to the Expo app directory")
  .option("--backend-root <path>", "Path to the backend directory")
  .option("--app-id <id>", "App identifier override")
  .option("--platform <platforms>", "Platforms to scaffold", "android,ios")
  .option("--output-dir <path>", "Base directory for generated files", ".")
  .option("--force", "Overwrite existing files without confirmation")
  .option("--dry-run", "List files that would be created without writing")
  .action(async (opts) => {
    const { scaffoldCommand } = await import("./commands/scaffold.js");
    await scaffoldCommand(opts);
  });

program
  .command("preflight")
  .description("Validate all prerequisites for smoke test execution")
  .option("--platform <platform>", "Target platform: android | ios", "android")
  .option("--config <path>", "Path to smoke.config.json")
  .option("--json", "Output results as JSON")
  .action(async (opts) => {
    const { preflightCommand } = await import("./commands/preflight.js");
    await preflightCommand(opts);
  });

program
  .command("run <platform>")
  .description("Orchestrate the full smoke test pipeline")
  .option("--config <path>", "Path to smoke.config.json")
  .option("--mode <mode>", "Execution mode: local | ci")
  .option("--skip-preflight", "Skip preflight checks")
  .option("--skip-backend", "Skip backend service startup")
  .option("--skip-build", "Skip app build and install")
  .option("--run-id <id>", "Override auto-generated run ID")
  .option("--timeout <seconds>", "Overall pipeline timeout", "300")
  .option("--verbose", "Enable verbose logging")
  .action(async (platform, opts) => {
    const { runCommand } = await import("./commands/run.js");
    await runCommand(platform, opts);
  });

program
  .command("plan")
  .description("Show which checks would run for the current diff")
  .option("--plan-file <path>", "Path to smoke-plan.yml")
  .option("--json", "Output as JSON")
  .option("--last-run", "Include last enforcement run status")
  .option("--verbose", "Show detailed output")
  .option("--mode <mode>", "Diff source: ci | local (auto-detected if omitted)")
  .action(async (opts) => {
    const { planCommand } = await import("./commands/plan.js");
    await planCommand(opts);
  });

program
  .command("enforce")
  .description("Run all required checks for the current diff (fail-closed)")
  .option("--plan-file <path>", "Path to smoke-plan.yml")
  .option("--verbose", "Show detailed output")
  .option("--mode <mode>", "Diff source: ci | local (auto-detected if omitted)")
  .action(async (opts) => {
    const { enforceCommand } = await import("./commands/enforce.js");
    await enforceCommand(opts);
  });

program
  .command("install-hook")
  .description("Install pre-push git hook for automatic enforcement")
  .option("--force", "Overwrite existing pre-push hook")
  .action(async (opts) => {
    const { installHookCommand } = await import("./commands/install-hook.js");
    await installHookCommand(opts);
  });

program
  .command("doctor")
  .description("Diagnose environment and configuration issues")
  .action(async () => {
    const { doctorCommand } = await import("./commands/doctor.js");
    await doctorCommand();
  });

program.parse();
