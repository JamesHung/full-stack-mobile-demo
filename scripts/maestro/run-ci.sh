#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." >/dev/null 2>&1 && pwd)"
export CI=1
export EXPO_NO_TELEMETRY=1
export MAESTRO_OUTPUT_ROOT="${MAESTRO_OUTPUT_ROOT:-${REPO_ROOT}/.artifacts/maestro}"

exec "${REPO_ROOT}/scripts/maestro/run-local.sh" --mode ci "$@"
