# Detection Order

## Source Priority

1. `preflight.sh`
   - Treat command requirements and bootstrap directories from `preflight.sh` as the highest-signal operational source.
   - Prefer preflight-derived PATH bootstrap logic over raw shell PATH state when checking Android SDK and Maestro binaries.

2. `package.json`
   - Read `packageManager` for the exact package-manager pin.
   - Do not infer runtime requirements from lockfile transitive versions.

3. `backend/pyproject.toml`
   - Read `project.requires-python` for the machine-readable Python requirement.
   - Use `backend/.venv/bin/python --version` as the most relevant Python runtime when the repo already bootstraps a backend virtualenv.

4. `AGENTS.md`
   - Use only as a documented baseline when it states a stricter or more explicit minor version than the manifests.
   - Report documented-version drift as a warning unless the repo manifests also enforce it.

## Severity Rules

- `fail`
  - Missing required command with no repo bootstrap fallback.
  - Missing bootstrap artifact required by preflight.
  - Exact package-manager version mismatch.
  - Python virtualenv version that does not satisfy `requires-python`.

- `warn`
  - Tool available only through a repo bootstrap path and not the current shell PATH.
  - No booted emulator or simulator.
  - Global `python3` differs from the backend requirement while the repo virtualenv is healthy.
  - Documented baseline drift that is not enforced by manifests.

- `pass`
  - Repo expectations and local machine state align.

## Extension Notes

- Add new repo heuristics in the script only when they affect repeated diagnosis.
- Keep SKILL.md procedural and move long rationale here.
- Prefer standard-library parsing so the doctor can run from a minimally prepared host.
