#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." >/dev/null 2>&1 && pwd)"
# shellcheck source=/dev/null
source "${REPO_ROOT}/scripts/maestro/preflight.sh"

RUN_MODE="local"
PRINT_CONFIG=0
PLATFORM=""
CURRENT_STAGE="bootstrap"
API_PID=""
WORKER_PID=""
METRO_PID=""

usage() {
  cat <<'EOF' >&2
Usage: scripts/maestro/run-local.sh [--mode local|ci] [--print-config] <android|ios>
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --mode)
        RUN_MODE="${2:-}"
        shift 2
        ;;
      --print-config)
        PRINT_CONFIG=1
        shift
        ;;
      android|ios)
        PLATFORM="$1"
        shift
        ;;
      *)
        printf "Unknown argument: %s\n" "$1" >&2
        usage
        exit 1
        ;;
    esac
  done

  if [[ -z "${PLATFORM}" ]]; then
    usage
    exit 1
  fi
}

print_config() {
  cat <<EOF
PLATFORM=${SMOKE_PLATFORM}
MODE=${SMOKE_MODE}
RUN_ID=${SMOKE_RUN_ID}
FLOW_FILE=${SMOKE_FLOW_FILE}
CANONICAL_FLOW_FILE=${SMOKE_CANONICAL_FLOW_FILE}
APP_ID=${SMOKE_APP_ID}
API_BASE_URL=${SMOKE_API_BASE_URL}
HOST_API_BASE_URL=${SMOKE_HOST_API_BASE_URL}
ANDROID_API_BASE_URL=${SMOKE_ANDROID_API_BASE_URL}
IOS_API_BASE_URL=${SMOKE_IOS_API_BASE_URL}
NOTE_TITLE=${SMOKE_NOTE_TITLE}
OUTPUT_DIR=${SMOKE_OUTPUT_DIR}
JUNIT_PATH=${SMOKE_JUNIT_PATH}
TEST_OUTPUT_DIR=${SMOKE_TEST_OUTPUT_DIR}
DEBUG_OUTPUT_DIR=${SMOKE_DEBUG_OUTPUT_DIR}
LOGS_DIR=${SMOKE_LOGS_DIR}
EOF
}

start_process() {
  local name="${1:?name required}"
  local log_path="${2:?log path required}"
  shift 2

  "$@" >"${log_path}" 2>&1 &
  local process_id=$!
  printf "%s" "${process_id}"
}

ensure_pid_alive() {
  local process_id="${1:?pid required}"
  local label="${2:?label required}"
  local log_path="${3:?log path required}"

  if ! kill -0 "${process_id}" >/dev/null 2>&1; then
    printf "[%s] %s exited unexpectedly. See %s\n" "${CURRENT_STAGE}" "${label}" "${log_path}" >&2
    return 1
  fi
}

write_summary() {
  local exit_code="${1:?exit code required}"
  local api_state="not-started"
  local worker_state="not-started"
  local metro_state="not-started"

  if [[ -n "${API_PID}" ]]; then
    if kill -0 "${API_PID}" >/dev/null 2>&1; then
      api_state="running"
    else
      api_state="exited"
    fi
  fi

  if [[ -n "${WORKER_PID}" ]]; then
    if kill -0 "${WORKER_PID}" >/dev/null 2>&1; then
      worker_state="running"
    else
      worker_state="exited"
    fi
  fi

  if [[ -n "${METRO_PID}" ]]; then
    if kill -0 "${METRO_PID}" >/dev/null 2>&1; then
      metro_state="running"
    else
      metro_state="exited"
    fi
  fi

  cat >"${SMOKE_SUMMARY_PATH}" <<EOF
platform=${SMOKE_PLATFORM}
mode=${SMOKE_MODE}
run_id=${SMOKE_RUN_ID}
stage=${CURRENT_STAGE}
exit_code=${exit_code}
output_dir=${SMOKE_OUTPUT_DIR}
artifact_name=${SMOKE_ARTIFACT_NAME}
flow_file=${SMOKE_FLOW_FILE}
api_base_url=${SMOKE_API_BASE_URL}
host_api_base_url=${SMOKE_HOST_API_BASE_URL}
device_id=${SMOKE_DEVICE_ID}
api_log=${SMOKE_API_LOG_PATH}
worker_log=${SMOKE_WORKER_LOG_PATH}
metro_log=${SMOKE_METRO_LOG_PATH}
build_log=${SMOKE_BUILD_LOG_PATH}
maestro_log=${SMOKE_MAESTRO_LOG_PATH}
api_state=${api_state}
worker_state=${worker_state}
metro_state=${metro_state}
EOF
}

cleanup() {
  local exit_code=$?

  write_summary "${exit_code}"

  if [[ -n "${METRO_PID}" ]] && kill -0 "${METRO_PID}" >/dev/null 2>&1; then
    kill "${METRO_PID}" >/dev/null 2>&1 || true
    wait "${METRO_PID}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${WORKER_PID}" ]] && kill -0 "${WORKER_PID}" >/dev/null 2>&1; then
    kill "${WORKER_PID}" >/dev/null 2>&1 || true
    wait "${WORKER_PID}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${API_PID}" ]] && kill -0 "${API_PID}" >/dev/null 2>&1; then
    kill "${API_PID}" >/dev/null 2>&1 || true
    wait "${API_PID}" >/dev/null 2>&1 || true
  fi

  if (( exit_code == 0 )); then
    printf "Smoke succeeded for %s.\n" "${SMOKE_PLATFORM}"
  else
    printf "Smoke failed for %s during %s.\n" "${SMOKE_PLATFORM}" "${CURRENT_STAGE}" >&2
    if [[ -f "${SMOKE_BUILD_LOG_PATH}" ]]; then
      printf -- "\n--- START BUILD LOG (%s) ---\n" "${SMOKE_BUILD_LOG_PATH}" >&2
      cat "${SMOKE_BUILD_LOG_PATH}" >&2
      printf -- "--- END BUILD LOG ---\n" >&2
    fi
  fi

  printf "Run ID: %s\n" "${SMOKE_RUN_ID}"
  printf "Output directory: %s\n" "${SMOKE_OUTPUT_DIR}"
  printf "JUnit report: %s\n" "${SMOKE_JUNIT_PATH}"
  printf "Debug output: %s\n" "${SMOKE_DEBUG_OUTPUT_DIR}"
}

start_services() {
  mkdir -p "${SMOKE_LOGS_DIR}" "${SMOKE_TEST_OUTPUT_DIR}" "${SMOKE_DEBUG_OUTPUT_DIR}"

  API_PID="$(start_process "api" "${SMOKE_API_LOG_PATH}" env PYTHONPATH="${REPO_ROOT}" uv run --directory backend uvicorn backend.src.main:app --host 0.0.0.0 --port 8000)"
  WORKER_PID="$(start_process \
    "worker" \
    "${SMOKE_WORKER_LOG_PATH}" \
    env \
    PYTHONPATH="${REPO_ROOT}" \
    VOICE_NOTES_PROCESSING_POLL_INTERVAL_MS="${SMOKE_WORKER_POLL_INTERVAL_MS:-3000}" \
    uv run --directory backend python -m backend.src.workers.notes)"
  local -a metro_command=(pnpm --filter app exec expo start --dev-client --port "${SMOKE_METRO_PORT}")
  if [[ "${RUN_MODE}" != "ci" ]]; then
    metro_command+=(--localhost)
  else
    metro_command+=(--host localhost)
  fi

  METRO_PID="$(start_process \
    "metro" \
    "${SMOKE_METRO_LOG_PATH}" \
    env \
    CI=1 \
    EXPO_NO_TELEMETRY=1 \
    EXPO_PUBLIC_API_BASE_URL="${SMOKE_API_BASE_URL}" \
    EXPO_PUBLIC_API_BASE_URL_ANDROID="${SMOKE_ANDROID_API_BASE_URL}" \
    EXPO_PUBLIC_API_BASE_URL_IOS="${SMOKE_IOS_API_BASE_URL}" \
    "${metro_command[@]}")"

  smoke_wait_for_process "${API_PID}" 60 "API process"
  smoke_wait_for_process "${WORKER_PID}" 60 "worker process"
  smoke_wait_for_process "${METRO_PID}" 60 "Metro process"
  smoke_wait_for_http "${SMOKE_API_HEALTH_URL}" 60 "backend API"
  smoke_wait_for_http "http://${SMOKE_METRO_HOST}:${SMOKE_METRO_PORT}/status" 60 "Metro"
}

build_and_install_app() {
  local -a expo_command

  if [[ "${SMOKE_PLATFORM}" == "android" ]]; then
    expo_command=(pnpm --filter app exec expo run:android --no-bundler)
  else
    expo_command=(pnpm --filter app exec expo run:ios --no-bundler)
  fi

  # On CI, we typically have only one device and explicit ID can be brittle with expo-cli
  if [[ -n "${SMOKE_DEVICE_ID}" ]] && [[ "${RUN_MODE}" != "ci" ]]; then
    expo_command+=(-d "${SMOKE_DEVICE_ID}")
  fi

  printf -- "Running expo command: %s\n" "${expo_command[*]}" >&2
  if [[ "${SMOKE_PLATFORM}" == "android" ]]; then
    adb devices >&2
  fi

  local build_exit=0
  env \
    CI=1 \
    EXPO_NO_TELEMETRY=1 \
    EXPO_PUBLIC_API_BASE_URL="${SMOKE_API_BASE_URL}" \
    EXPO_PUBLIC_API_BASE_URL_ANDROID="${SMOKE_ANDROID_API_BASE_URL}" \
    EXPO_PUBLIC_API_BASE_URL_IOS="${SMOKE_IOS_API_BASE_URL}" \
    "${expo_command[@]}" >"${SMOKE_BUILD_LOG_PATH}" 2>&1 || build_exit=$?

  if (( build_exit != 0 )) && [[ "${SMOKE_PLATFORM}" == "ios" ]]; then
    if grep -q "Build Succeeded" "${SMOKE_BUILD_LOG_PATH}" && grep -q "Installing on" "${SMOKE_BUILD_LOG_PATH}"; then
      printf "[build-install] iOS build and install succeeded; ignoring post-install URL open failure (exit %d)\n" "${build_exit}" >&2
      return 0
    fi
  fi

  return "${build_exit}"
}

run_maestro() {
  local -a maestro_command

  maestro_command=(maestro "--platform=${SMOKE_PLATFORM}")
  if [[ -n "${SMOKE_DEVICE_ID}" ]]; then
    maestro_command+=("--device=${SMOKE_DEVICE_ID}")
  fi

  maestro_command+=(
    test
    "${SMOKE_FLOW_FILE}"
    --format=JUNIT
    "--output=${SMOKE_JUNIT_PATH}"
    "--test-output-dir=${SMOKE_TEST_OUTPUT_DIR}"
    "--debug-output=${SMOKE_DEBUG_OUTPUT_DIR}"
    --flatten-debug-output
    "--test-suite-name=voice-notes-smoke-${SMOKE_PLATFORM}"
    "-e" "SMOKE_RUN_ID=${SMOKE_RUN_ID}"
    "-e" "SMOKE_NOTE_TITLE=${SMOKE_NOTE_TITLE}"
    "-e" "SMOKE_PLATFORM=${SMOKE_PLATFORM}"
    "-e" "SMOKE_PLATFORM_LABEL=${SMOKE_PLATFORM_LABEL}"
    "-e" "SMOKE_APP_ID=${SMOKE_APP_ID}"
  )

  "${maestro_command[@]}" 2>&1 | tee "${SMOKE_MAESTRO_LOG_PATH}"
}

main() {
  parse_args "$@"
  smoke_load_config "${PLATFORM}" "${RUN_MODE}"
  mkdir -p "${SMOKE_OUTPUT_DIR}" "${SMOKE_LOGS_DIR}" "${SMOKE_TEST_OUTPUT_DIR}" "${SMOKE_DEBUG_OUTPUT_DIR}"

  if (( PRINT_CONFIG == 1 )); then
    print_config
    exit 0
  fi

  trap cleanup EXIT INT TERM

  CURRENT_STAGE="preflight"
  smoke_run_preflight "${PLATFORM}" "${RUN_MODE}"

  CURRENT_STAGE="service-bootstrap"
  start_services
  ensure_pid_alive "${API_PID}" "API" "${SMOKE_API_LOG_PATH}"
  ensure_pid_alive "${WORKER_PID}" "worker" "${SMOKE_WORKER_LOG_PATH}"
  ensure_pid_alive "${METRO_PID}" "Metro" "${SMOKE_METRO_LOG_PATH}"

  CURRENT_STAGE="build-install"
  build_and_install_app
  ensure_pid_alive "${API_PID}" "API" "${SMOKE_API_LOG_PATH}"
  ensure_pid_alive "${WORKER_PID}" "worker" "${SMOKE_WORKER_LOG_PATH}"
  ensure_pid_alive "${METRO_PID}" "Metro" "${SMOKE_METRO_LOG_PATH}"

  CURRENT_STAGE="maestro"
  run_maestro

  CURRENT_STAGE="complete"
}

main "$@"
