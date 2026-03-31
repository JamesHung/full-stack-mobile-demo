# TODOS

## Validation result caching
- **Priority:** P2
- **Effort:** M (human: ~3 days / CC: ~20 min)
- **Depends on:** smoke-kit Phase A complete
- **What:** Cache check results by content hash so unchanged paths skip re-validation on subsequent runs.
- **Why:** When iterating on a single file, re-running all checks wastes 3-4 minutes on unchanged surfaces.
- **Context:** Identified in 10x vision, explicitly deferred from v1. Once metrics.jsonl shows adoption patterns, caching priorities become data-driven. Use git content hash (not timestamps) for cache keys.

## Metrics dashboard (CLI-based)
- **Priority:** P2
- **Effort:** S (human: ~1 day / CC: ~10 min)
- **Depends on:** smoke-kit Phase C (metrics.jsonl format)
- **What:** `smoke-kit metrics` command that reads `.smoke-kit/metrics.jsonl` and prints weekly summary: run count, failure rate, estimated CI time saved, skip bypass count.
- **Why:** Success criteria says "drift incidents decrease by >50%" — need a way to measure without manual JSONL grep.
- **Context:** CLI output sufficient. Future: could pipe into GitHub Actions job summary.

## Pipeline integration test coverage
- **Priority:** P2
- **Effort:** M (human: ~4 hours / CC: ~15 min)
- **Depends on:** pipeline.ts type fix (Phase A)
- **What:** Add integration tests for pipeline.ts covering all 6 stages with mocked services and Maestro. Verify stage ordering, error propagation, finalExitCode assignment, and summary output.
- **Why:** pipeline.ts is the most critical module in smoke-kit (434 lines, 6 stages), but has only 1 trivial test (exit code constants). Any refactor risks silent regression.
- **Context:** Identified in eng review. Current pipeline.test.ts is ★ quality (smoke test only). Need ★★★ coverage: stage success/failure propagation, early exit on stage failure, cleanup on error, GitHub Step Summary writing.

## Health probe retry abstraction
- **Priority:** P3
- **Effort:** S (human: ~30 min / CC: ~3 min)
- **Depends on:** None
- **What:** Extract shared `retryWithDeadline()` helper from `http-probe.ts` and `tcp-probe.ts`. Both use identical deadline-based retry loops with adaptive sleep.
- **Why:** DRY violation. If retry behavior changes (e.g., exponential backoff), both probes need manual sync. Bundle with emulator-manager DRY fix for one cleanup commit.
- **Context:** Both probes use the same pattern: deadline = Date.now() + timeout, loop while before deadline, sleep min(interval, remaining). Extracting to `src/utils/retry.ts` is straightforward.

## Cross-repo npm package extraction
- **Priority:** P3
- **Effort:** L (human: ~1 week / CC: ~45 min)
- **Depends on:** smoke-kit Phase A+B+C stable for 2-3 months
- **What:** Extract policy engine portion of `packages/smoke-kit` into standalone npm package for other Expo + backend monorepos.
- **Why:** 10x vision includes cross-repo portability. Validates abstraction quality.
- **Context:** Premature at current scale. Need production stability proof first. Consider long-term maintenance burden of open-source package (versioning, breaking changes, docs).
