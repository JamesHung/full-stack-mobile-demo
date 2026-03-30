---
name: ci-fix-loop
description: Push → monitor CI → read logs → diagnose → fix → re-push loop. Use when a user says "push and monitor CI", "fix CI", "make CI green", "monitor the pipeline", or after pushing changes that need CI validation. Automates the iterative cycle of pushing code, waiting for CI results, diagnosing failures, applying fixes, and re-pushing until all checks pass.
---

# CI Fix Loop

## Overview

Standardized workflow for the push → monitor → diagnose → fix → re-push cycle. Eliminates wasted CI rounds by enforcing pre-push validation gates and structured failure diagnosis.

## Workflow

### Phase 1 — Pre-Push Validation

Before pushing, run all applicable local gates to catch issues that would waste a CI round:

```bash
# Shell script syntax (if any .sh files were modified)
find scripts/ -name '*.sh' -exec bash -n {} \;

# Unit tests
pnpm test --run 2>&1 | tail -20

# Expo CLI flag check (if Expo project)
# Verify any --dev-client / --go flags have corresponding packages installed
grep -r -- '--dev-client' scripts/ packages/ --include='*.sh' --include='*.ts' 2>/dev/null \
  && jq -e '.dependencies["expo-dev-client"] // .devDependencies["expo-dev-client"]' app/package.json

# Platform parity (if modifying platform-specific logic)
# Ensure iOS and Android branches have symmetric error handling
```

Only proceed to push if all local gates pass.

### Phase 2 — Push & Record

```bash
git push origin <branch>
```

After pushing, record the commit SHA for tracking:

```bash
git --no-pager log -1 --format='%H %s'
```

### Phase 3 — Monitor CI

Use GitHub MCP tools to poll check status with progressive backoff:

1. **Initial wait**: 60 seconds after push
2. **Poll interval**: 60s → 120s → 300s (progressive backoff)
3. **Max wait**: 30 minutes before escalating

```
Tool: github-mcp-server-pull_request_read
  method: get_check_runs
  → Look for: status (queued/in_progress/completed) and conclusion (success/failure)
```

If the PR has multiple jobs (e.g., `android-smoke` + `ios-smoke`), track each independently. Report partial results as they complete.

### Phase 4 — Diagnose Failure

When a check fails:

1. **Get job logs**:
   ```
   Tool: github-mcp-server-get_job_logs
     owner, repo, job_id (from check_runs)
     return_content: true
     tail_lines: 200
   ```

2. **Classify the error** into one of these categories:

   | Category | Signal Keywords | Typical Fix |
   |----------|----------------|-------------|
   | **Syntax error** | `syntax error`, `unexpected token`, `parse error` | Fix syntax, run `bash -n` |
   | **Dependency missing** | `not found`, `Cannot find module`, `No module named` | Install dep or remove flag |
   | **Timeout** | `timed out`, `HEALTH_CHECK_TIMEOUT`, `exceeded` | Increase timeout, add diagnostic log dump |
   | **Platform mismatch** | `0 devices`, `No simulator`, `emulator not found` | Fix device setup in CI config |
   | **Build failure** | `BUILD FAILED`, `error:`, `FAILURE` | Fix source code or build config |
   | **Flaky / transient** | `ESOCKETTIMEDOUT`, `rate limit`, `network` | Retry once, then investigate |

3. **Extract root cause**: Don't just fix the symptom. Trace back to understand *why* the error occurred.

### Phase 5 — Fix & Re-Push

1. Apply the fix locally
2. **Re-run Phase 1** (pre-push validation gates)
3. Commit with descriptive message: `fix(ci): <what was wrong and why>`
4. Push and return to Phase 3

### Phase 6 — Success Report

When all checks pass, output a summary:

```
CI Status: ✅ All checks passed
  Run ID: <id>
  Jobs:
    - android-smoke: ✅ (duration)
    - ios-smoke: ✅ (duration)
  Commits pushed: <count>
  CI rounds: <count> (target: 1-2)
```

## Anti-Patterns to Avoid

| Anti-Pattern | Why It Wastes Rounds | Prevention |
|-------------|---------------------|------------|
| Push without `bash -n` | Shell syntax errors only appear at runtime | Pre-push gate |
| Use CLI flags without checking deps | Missing packages cause silent CI failures | Dependency audit |
| Fix one platform, forget the other | Asymmetric error handling breaks the other job | Platform parity check |
| Timeout too low for CI cold-start | Local hot cache ≠ CI cold start | Use 2× CI cold-start as minimum |
| No log dump on failure path | Next failure is undiagnosable | Always add `cat <log>` before exit |

## Escalation Rules

- **1 CI round failed**: Diagnose and fix normally
- **2 consecutive rounds failed on same issue**: Step back, re-read the CI workflow file and scripts from scratch
- **3 rounds failed**: Escalate — the mental model of the CI environment may be wrong. Check if CI uses different scripts/paths than local (common in monorepos)

## Integration with AGENTS.md

This skill implements the following AGENTS.md rules:
- Shell 腳本語法驗證（`bash -n`）
- CLI Flag 與依賴驗證（verify packages before using flags）
- 問題紀錄規範（log CI issues to issuelog after resolution）
