#!/usr/bin/env bash
# Minimal entry point — delegates to smoke-kit CLI.
set -euo pipefail
PLATFORM="${1:?Usage: run-smoke.sh <android|ios>}"
shift
exec npx smoke-kit run "$PLATFORM" "$@"
