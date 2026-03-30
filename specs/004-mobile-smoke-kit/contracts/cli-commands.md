# CLI Contract: smoke-kit

**Package**: `packages/smoke-kit`
**Binary**: `smoke-kit` (via `package.json` `bin` field)
**Runtime**: `tsx` (TypeScript execution without compilation)

## Commands

### `smoke-kit init`

Detect project structure and generate a valid `smoke.config.json`.

```
smoke-kit init [options]

Options:
  --app-root <path>      Path to the Expo app directory (default: auto-detect)
  --backend-root <path>  Path to the backend directory (default: auto-detect)
  --app-id <id>          App identifier override (default: auto-detect from app.json)
  --output <path>        Output path for config file (default: ./smoke.config.json)
  --force                Overwrite existing config without confirmation
  --dry-run              Print generated config to stdout without writing
```

**Behavior**:
1. Scan project root for `app/`, `packages/*/` directories containing `app.json`
2. Detect app identifier from `expo.ios.bundleIdentifier` / `expo.android.package`
3. Detect backend root by looking for `backend/`, `api/`, or `server/` directories
4. Generate `smoke.config.json` with detected values and sensible defaults
5. Validate generated config against JSON Schema before writing
6. If file exists and `--force` not set: prompt for confirmation (interactive) or error (CI)

**Exit codes**: 0 (success), 1 (general error), 2 (config validation error)

**Output**: `smoke.config.json` file at specified or default location

---

### `smoke-kit scaffold`

Inject full smoke test structure (config, scripts, flows, workflow) into a project.

```
smoke-kit scaffold [options]

Options:
  --app-root <path>      Path to the Expo app directory (default: auto-detect)
  --backend-root <path>  Path to the backend directory (default: auto-detect)
  --app-id <id>          App identifier override (default: auto-detect from app.json)
  --platform <platforms> Platforms to scaffold (default: android,ios)
  --output-dir <path>    Base directory for generated files (default: project root)
  --force                Overwrite existing files without confirmation
  --dry-run              List files that would be created without writing
```

**Behavior**:
1. Run `init` logic to generate `smoke.config.json` (if not present)
2. Copy template files from `packages/smoke-kit/templates/` to target project:
   - `smoke.config.json` → `{output-dir}/smoke.config.json`
   - `scripts/run-smoke.sh` → `{output-dir}/scripts/maestro/run-smoke.sh`
   - `flows/*.yaml` → `{output-dir}/.maestro/*.yaml`
   - `workflows/smoke.yml` → `{output-dir}/.github/workflows/mobile-smoke.yml`
3. Perform variable substitution on all templates
4. Make shell scripts executable (`chmod +x`)
5. Skip existing files unless `--force` is set (FR-007)

**Exit codes**: 0 (success), 1 (general error), 2 (config error)

**Output**: Multiple files created in target project

---

### `smoke-kit preflight`

Validate all prerequisites for smoke test execution.

```
smoke-kit preflight [options]

Options:
  --platform <platform>  Target platform: android | ios (default: android)
  --config <path>        Path to smoke.config.json (default: ./smoke.config.json)
  --json                 Output results as JSON
```

**Behavior**:
1. Load and validate `smoke.config.json`
2. Check required toolchain:
   - Universal: `node`, `pnpm`, `maestro`
   - Android: `adb`, `java`
   - iOS: `xcodebuild`, `xcrun`
   - Backend: `uv` (if backend services configured), `curl`
3. Check workspace bootstrap:
   - `node_modules/` exists
   - Backend virtualenv exists (if backend configured)
   - `app.json` exists at configured `appRoot`
4. Check device/emulator availability:
   - Android: booted emulator via `adb devices`
   - iOS: booted simulator via `xcrun simctl list devices booted`
5. Check port availability for configured services
6. Report results with ✅/❌ indicators and remediation guidance

**Exit codes**: 0 (all checks pass), 3 (one or more checks fail)

**Output format** (terminal):
```
Smoke Kit Preflight — android
─────────────────────────────
✅ node           v22.0.0
✅ pnpm           v10.6.2
✅ maestro        v1.38.0
✅ adb            available
✅ java           v17.0.1
✅ node_modules   present
✅ backend/.venv  present
✅ app.json       found at app/app.json
✅ emulator       emulator-5554 (booted)
✅ port 8000      available
✅ port 8081      available

All checks passed. Ready to run smoke tests.
```

**Output format** (JSON with `--json`):
```json
{
  "platform": "android",
  "passed": true,
  "checks": [
    { "name": "node", "status": "pass", "detail": "v22.0.0" },
    { "name": "emulator", "status": "fail", "detail": "No booted device found", "remediation": "Run 'emulator -avd Pixel_7' or start from Android Studio" }
  ]
}
```

---

### `smoke-kit run <platform>`

Orchestrate the full smoke test pipeline.

```
smoke-kit run <platform> [options]

Arguments:
  platform               Target platform: android | ios

Options:
  --config <path>        Path to smoke.config.json (default: ./smoke.config.json)
  --mode <mode>          Execution mode: local | ci (default: auto-detect)
  --skip-preflight       Skip preflight checks
  --skip-backend         Skip backend service startup
  --skip-build           Skip app build and install
  --run-id <id>          Override auto-generated run ID
  --timeout <seconds>    Overall pipeline timeout (default: 300)
  --verbose              Enable verbose logging
```

**Pipeline stages** (executed in order):

| Stage | Description | Exit code on failure |
|-------|-------------|---------------------|
| 1. Config | Load and validate smoke.config.json | 2 |
| 2. Preflight | Validate prerequisites (skippable) | 3 |
| 3. Service Startup | Start configured backend services | 4 |
| 4. Health Check | TCP + HTTP probes for all services | 5 |
| 5. Test Execution | Run Maestro flows | 6 |
| 6. Cleanup | Kill all spawned processes | 7 (warning only) |

**On failure at any stage**:
1. Collect last 50 lines of relevant logs
2. Format and display Error Summary
3. Execute cleanup stage
4. Write run summary to `summary.json`
5. Exit with stage-specific exit code

**Artifacts produced** (at `{artifactConfig.outputRoot}/{mode}/{platform}-{runId}/`):
- `results.xml` — JUnit XML test results
- `summary.json` — structured run summary
- `logs/` — service log files
- `debug/` — Maestro debug output
- `test-output/` — Maestro test screenshots and recordings

**Exit codes**: See data model (exit-codes table in research.md R-006)

---

## Global Options

All commands support:

```
  -V, --version    Output version number
  -h, --help       Display help for command
```

## Environment Variables

| Variable | Description | Used By |
|----------|-------------|---------|
| `SMOKE_RUN_ID` | Override auto-generated run ID | `run` |
| `SMOKE_CONFIG_PATH` | Override default config file path | all |
| `CI` | Auto-detect CI mode when set to `true` | `run` |
| `GITHUB_STEP_SUMMARY` | GitHub Actions step summary file path | `run` (CI mode) |
| `MAESTRO_DEVICE_ID` | Target device ID for Maestro | `run` |

## Error Summary Contract

When any stage fails, the CLI outputs a structured error summary to stderr:

```
═══════════════════════════════════════════════════
 SMOKE KIT — ERROR SUMMARY
═══════════════════════════════════════════════════
 Stage:      {stage name}
 Exit Code:  {exit code}
 Duration:   {duration}
 Service:    {service name, if applicable}
───────────────────────────────────────────────────
 Last 50 lines of {log file}:

 {log content, each line indented 1 space}

═══════════════════════════════════════════════════
```

In CI mode, the same content is additionally written to `$GITHUB_STEP_SUMMARY` as Markdown:

```markdown
## ❌ Smoke Kit — Error Summary

| Field | Value |
|-------|-------|
| Stage | {stage name} |
| Exit Code | {exit code} |
| Duration | {duration} |
| Service | {service name} |

<details>
<summary>Last 50 lines of {log file}</summary>

\`\`\`
{log content}
\`\`\`

</details>
```
