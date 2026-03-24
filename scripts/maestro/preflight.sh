#!/usr/bin/env bash
set -euo pipefail

smoke_repo_root() {
  cd "$(dirname "${BASH_SOURCE[0]}")/../.." >/dev/null 2>&1 && pwd
}

smoke_bootstrap_toolchain_paths() {
  local maestro_bin="${HOME}/.maestro/bin"
  local android_sdk_root="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-${HOME}/Library/Android/sdk}}"
  local path_parts=()

  if [[ -d "${maestro_bin}" ]]; then
    path_parts+=("${maestro_bin}")
  fi

  if [[ -d "${android_sdk_root}" ]]; then
    export ANDROID_HOME="${android_sdk_root}"
    export ANDROID_SDK_ROOT="${android_sdk_root}"
    [[ -d "${android_sdk_root}/platform-tools" ]] && path_parts+=("${android_sdk_root}/platform-tools")
    [[ -d "${android_sdk_root}/emulator" ]] && path_parts+=("${android_sdk_root}/emulator")
    [[ -d "${android_sdk_root}/tools" ]] && path_parts+=("${android_sdk_root}/tools")
  fi

  if (( ${#path_parts[@]} > 0 )); then
    export PATH="$(IFS=:; printf "%s:%s" "${path_parts[*]}" "${PATH}")"
  fi
}

smoke_runtime_config_script() {
  printf "%s/scripts/maestro/runtime-config.cjs" "$(smoke_repo_root)"
}

smoke_log() {
  printf "[smoke:%s] %s\n" "${1}" "${2}"
}

smoke_require_command() {
  local command_name="${1:?command name required}"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    printf "[preflight] Missing required command: %s\n" "${command_name}" >&2
    return 1
  fi
}

smoke_load_config() {
  local platform="${1:?platform required}"
  local mode="${2:-local}"
  local output

  output="$(node "$(smoke_runtime_config_script)" --platform "${platform}" --mode "${mode}" --format shell)"
  eval "${output}"
}

smoke_check_workspace_bootstrap() {
  local repo_root="${1:?repo root required}"

  if [[ ! -d "${repo_root}/node_modules" ]]; then
    printf "[preflight] Missing node_modules. Run `pnpm install` first.\n" >&2
    return 1
  fi

  if [[ ! -d "${repo_root}/backend/.venv" ]]; then
    printf "[preflight] Missing backend/.venv. Run `uv sync --directory backend` first.\n" >&2
    return 1
  fi
}

smoke_check_android_device() {
  smoke_require_command adb

  if [[ -n "${MAESTRO_DEVICE_ID:-}" ]]; then
    if ! adb devices | awk 'NR > 1 && $2 == "device" { print $1 }' | grep -Fx "${MAESTRO_DEVICE_ID}" >/dev/null; then
      printf "[preflight] Android device `%s` is not booted.\n" "${MAESTRO_DEVICE_ID}" >&2
      return 1
    fi
    return 0
  fi

  if ! adb devices | awk 'NR > 1 && $2 == "device" { print $1 }' | grep -q .; then
    printf "[preflight] No booted Android emulator/device detected.\n" >&2
    return 1
  fi
}

smoke_check_ios_device() {
  smoke_require_command xcodebuild
  smoke_require_command xcrun

  if [[ -n "${MAESTRO_DEVICE_ID:-}" ]]; then
    if ! xcrun simctl list devices booted | grep -F "${MAESTRO_DEVICE_ID}" >/dev/null; then
      printf "[preflight] iOS simulator `%s` is not booted.\n" "${MAESTRO_DEVICE_ID}" >&2
      return 1
    fi
    return 0
  fi

  if ! xcrun simctl list devices booted | grep -q "Booted"; then
    printf "[preflight] No booted iOS simulator detected.\n" >&2
    return 1
  fi
}

smoke_wait_for_http() {
  local url="${1:?url required}"
  local timeout_seconds="${2:?timeout required}"
  local label="${3:?label required}"
  local started_at

  started_at="$(date +%s)"
  while true; do
    if curl --fail --silent --show-error "${url}" >/dev/null 2>&1; then
      return 0
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      printf "[preflight] Timed out waiting for %s at %s.\n" "${label}" "${url}" >&2
      return 1
    fi

    sleep 2
  done
}

smoke_wait_for_process() {
  local process_id="${1:?pid required}"
  local timeout_seconds="${2:?timeout required}"
  local label="${3:?label required}"
  local started_at

  started_at="$(date +%s)"
  while true; do
    if kill -0 "${process_id}" >/dev/null 2>&1; then
      return 0
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      printf "[preflight] %s exited before becoming ready.\n" "${label}" >&2
      return 1
    fi

    sleep 1
  done
}

smoke_run_preflight() {
  local platform="${1:?platform required}"
  local mode="${2:-local}"
  local repo_root

  repo_root="$(smoke_repo_root)"
  smoke_bootstrap_toolchain_paths
  smoke_load_config "${platform}" "${mode}"
  smoke_require_command node
  smoke_require_command pnpm
  smoke_require_command uv
  smoke_require_command curl
  smoke_require_command java
  smoke_require_command maestro
  smoke_check_workspace_bootstrap "${repo_root}"

  if [[ ! -f "${SMOKE_FLOW_FILE}" ]]; then
    printf "[preflight] Missing flow file: %s\n" "${SMOKE_FLOW_FILE}" >&2
    return 1
  fi

  if [[ ! -f "${SMOKE_CANONICAL_FLOW_FILE}" ]]; then
    printf "[preflight] Missing canonical flow file: %s\n" "${SMOKE_CANONICAL_FLOW_FILE}" >&2
    return 1
  fi

  if [[ ! -f "${repo_root}/app/app.json" ]]; then
    printf "[preflight] Missing Expo app config at %s/app/app.json\n" "${repo_root}" >&2
    return 1
  fi

  case "${platform}" in
    android)
      smoke_check_android_device
      ;;
    ios)
      smoke_check_ios_device
      ;;
    *)
      printf "[preflight] Unsupported platform: %s\n" "${platform}" >&2
      return 1
      ;;
  esac
}

smoke_preflight_main() {
  local platform="${1:-}"
  local mode="${2:-local}"

  if [[ -z "${platform}" ]]; then
    printf "Usage: %s <android|ios> [local|ci]\n" "${0}" >&2
    exit 1
  fi

  smoke_run_preflight "${platform}" "${mode}"
  smoke_log "preflight" "platform=${platform} mode=${mode} ok"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  smoke_preflight_main "$@"
fi
