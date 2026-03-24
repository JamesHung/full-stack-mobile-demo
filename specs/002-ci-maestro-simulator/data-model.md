# Data Model: CI Maestro Simulator Runs

## SmokeRunConfig

Represents the normalized configuration needed to execute one smoke run on one platform.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | enum (`android`, `ios`) | Yes | Target platform for the run |
| `flow_basename` | string | Yes | Canonical flow family name, expected to remain `voice-notes-smoke` |
| `flow_file` | string | Yes | Maestro flow entry file to execute |
| `app_id` | string | Yes | Install target matched to the built app |
| `api_base_url` | string | Yes | Backend base URL reachable from the target simulator/emulator |
| `device_id` | string | No | Explicit target device identifier when more than one device is available |
| `preflight_profile` | string | Yes | Named prerequisite check set to run before build/test |
| `artifact_root` | string | Yes | Root directory where JUnit and Maestro output are written |
| `build_command` | string | Yes | Command used to install or build the app for the target platform |
| `service_bootstrap_mode` | enum (`auto-start`, `ci-job-managed`) | Yes | How API and worker services are started for this run |
| `run_data_prefix` | string | Yes | Prefix used to generate unique per-run note data |

**Validation rules**

- `platform` must be one of `android` or `ios`
- `flow_file` must resolve to an existing Maestro flow entry
- `app_id` must match the corresponding identifier declared in `app/app.json`
- `api_base_url` must be reachable from the selected target device profile
- `artifact_root` must be unique per run to avoid overwriting Android/iOS evidence
- `service_bootstrap_mode` must be `auto-start` for local runs and `ci-job-managed` for CI runs

## PreflightCheck

Represents one prerequisite that must pass before a smoke run is allowed to continue.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable prerequisite name |
| `scope` | enum (`local`, `ci`, `shared`) | Yes | Where the check applies |
| `command` | string | Yes | Command or probe used to verify the prerequisite |
| `required` | boolean | Yes | Whether failure blocks the run |
| `failure_hint` | string | Yes | Actionable remediation guidance |
| `result` | enum (`pending`, `passed`, `failed`, `skipped`) | Yes | Current evaluation state |

**State transitions**

- `pending -> passed`
- `pending -> failed`
- `pending -> skipped` only when a check is not applicable for the selected platform

## LocalServiceProcess

Represents one backend process owned by the local smoke runner.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | enum (`api`, `worker`) | Yes | Service started by the local smoke command |
| `start_command` | string | Yes | Repo-owned command used to start the service |
| `health_check` | string | Yes | Probe used to verify readiness |
| `log_path` | string | Yes | File path where stdout/stderr are written |
| `pid` | number | No | Process identifier after startup |
| `state` | enum (`pending`, `starting`, `ready`, `failed`, `stopped`) | Yes | Current process lifecycle state |

**State transitions**

- `pending -> starting -> ready -> stopped`
- `pending -> starting -> failed`
- `ready -> failed` when the process exits or health checks fail during a run

## FixtureProfile

Represents the deterministic data inputs used by the canonical smoke flow.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `demo_email` | string | Yes | Seeded account email used for sign-in |
| `sample_audio_name` | string | Yes | Audio fixture name displayed in the create flow |
| `note_title_prefix` | string | Yes | Shared prefix for generated per-run note titles |
| `failure_suffix` | string | Yes | Text that guarantees the worker enters the failure/retry path |
| `expected_retry_label` | string | Yes | UI label proving the failure path reached retry state |
| `clear_app_state` | boolean | Yes | Whether the flow resets prior session state before launch |

**Validation rules**

- Values must align with current app copy and backend behavior
- The same fixture profile must be reusable in local and CI runs unless a documented platform exception exists
- Each run must derive a unique note title from `note_title_prefix` plus run-specific suffix data

## SmokeEvidenceBundle

Represents the retained evidence from one completed smoke run.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | enum (`android`, `ios`) | Yes | Platform that produced the evidence |
| `run_id` | string | Yes | Unique identifier for the smoke execution |
| `artifact_basename` | string | Yes | Platform-specific artifact base name such as `voice-notes-smoke-android` |
| `junit_report` | string | Yes | Path to the JUnit XML output |
| `maestro_output_dir` | string | Yes | Directory with screenshots, command metadata, and related output |
| `debug_output_dir` | string | Yes | Directory with `maestro.log` and low-level debug output |
| `service_logs` | string[] | No | Paths to local or CI service logs captured during the run |
| `build_log` | string | No | Optional build/install log path |
| `status` | enum (`passed`, `failed`) | Yes | Final smoke result |

**Validation rules**

- `artifact_basename` must be unique per platform/job
- `junit_report`, `maestro_output_dir`, and `debug_output_dir` must exist before a run is reported complete
- `service_logs` should be present for local auto-start runs and CI-managed service jobs whenever available

## CiTriggerSet

Represents the path-filter policy that decides whether smoke jobs should run automatically.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workflow_file` | string | Yes | Workflow path that owns the trigger |
| `watched_paths` | string[] | Yes | Repository globs that cause smoke execution |
| `skip_when_unmatched` | boolean | Yes | Whether smoke jobs are skipped when no watched path changes |
| `includes_workflow_changes` | boolean | Yes | Whether workflow-definition changes retrigger the workflow |

**Validation rules**

- `watched_paths` must cover app, backend, shared contracts, Maestro flows, orchestration scripts, workflow files, and dependency/config lockfiles needed by the smoke path
- `skip_when_unmatched` must remain `true`

## CiSmokeJob

Represents one GitHub Actions job that builds, runs, and publishes smoke evidence for a single platform.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `job_name` | string | Yes | Workflow-visible job identifier |
| `platform` | enum (`android`, `ios`) | Yes | Target platform |
| `runner_label` | string | Yes | GitHub runner image used by the job |
| `needs_backend` | boolean | Yes | Whether the job must boot local API/worker services |
| `cache_inputs` | string[] | Yes | Dependency/build caches the job should restore |
| `timeout_minutes` | number | Yes | Maximum allowed job runtime |
| `fail_on_provisioning_error` | boolean | Yes | Whether emulator/simulator provisioning failure should fail the job |
| `run_config` | `SmokeRunConfig` | Yes | The platform-specific run configuration |
| `trigger_set` | `CiTriggerSet` | Yes | Trigger profile controlling whether the job runs |
| `evidence` | `SmokeEvidenceBundle` | Yes | Published evidence bundle |

**State transitions**

- `queued -> bootstrapping -> building -> running_smoke -> uploading_artifacts -> passed`
- `queued -> bootstrapping -> building -> failed`
- `queued -> bootstrapping -> running_smoke -> uploading_artifacts -> failed`
- `queued -> bootstrapping -> provisioning_failed -> uploading_artifacts -> failed`

## Relationships

- `CiSmokeJob` owns exactly one `SmokeRunConfig`
- `CiSmokeJob` references exactly one `CiTriggerSet`
- `SmokeRunConfig` references one or more `PreflightCheck` entries through its `preflight_profile`
- Local smoke runs own two `LocalServiceProcess` records: one for `api` and one for `worker`
- `SmokeRunConfig` uses exactly one `FixtureProfile`
- `CiSmokeJob` publishes exactly one `SmokeEvidenceBundle`
