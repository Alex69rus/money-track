#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PHASE_ID="${1:-phase2}"

BACKEND_URL="${QA_BACKEND_URL:-http://127.0.0.1:8000}"
FRONTEND_URL="${QA_FRONTEND_URL:-http://127.0.0.1:4173}"
FRONTEND_PORT="${QA_FRONTEND_PORT:-4173}"
TMP_DIR="${ROOT_DIR}/.codex-tmp"
mkdir -p "${TMP_DIR}"

BACKEND_LOG="${TMP_DIR}/qa-${PHASE_ID}-backend.log"
FRONTEND_LOG="${TMP_DIR}/qa-${PHASE_ID}-frontend.log"

STARTED_BACKEND=0
STARTED_FRONTEND=0
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [[ "${STARTED_FRONTEND}" -eq 1 && -n "${FRONTEND_PID}" ]]; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
    wait "${FRONTEND_PID}" 2>/dev/null || true
  fi
  if [[ "${STARTED_BACKEND}" -eq 1 && -n "${BACKEND_PID}" ]]; then
    kill "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

is_up() {
  local url="$1"
  curl -sf "${url}" >/dev/null 2>&1
}

wait_up() {
  local name="$1"
  local url="$2"
  local timeout="${3:-60}"

  for ((i=1; i<=timeout; i+=1)); do
    if is_up "${url}"; then
      return 0
    fi
    sleep 1
  done

  echo "[qa:${PHASE_ID}] ${name} did not become ready at ${url} within ${timeout}s" >&2
  return 1
}

echo "[qa:${PHASE_ID}] backend=${BACKEND_URL} frontend=${FRONTEND_URL}"

if is_up "${BACKEND_URL}/health"; then
  echo "[qa:${PHASE_ID}] Reusing running backend at ${BACKEND_URL}"
else
  echo "[qa:${PHASE_ID}] Starting backend (log: ${BACKEND_LOG})"
  (
    cd "${ROOT_DIR}/backend_new"
    uv run uvicorn app.main:app
  ) >"${BACKEND_LOG}" 2>&1 &
  BACKEND_PID=$!
  STARTED_BACKEND=1
  wait_up "backend" "${BACKEND_URL}/health" 90
fi

if is_up "${FRONTEND_URL}"; then
  echo "[qa:${PHASE_ID}] Reusing running frontend at ${FRONTEND_URL}"
else
  echo "[qa:${PHASE_ID}] Starting frontend on port ${FRONTEND_PORT} (log: ${FRONTEND_LOG})"
  (
    cd "${ROOT_DIR}/frontend_new"
    npm run dev -- --host 127.0.0.1 --port "${FRONTEND_PORT}"
  ) >"${FRONTEND_LOG}" 2>&1 &
  FRONTEND_PID=$!
  STARTED_FRONTEND=1
  wait_up "frontend" "${FRONTEND_URL}" 90
fi

echo "[qa:${PHASE_ID}] Running phase checks"
(
  cd "${ROOT_DIR}/frontend_new"
  QA_FRONTEND_URL="${FRONTEND_URL}" QA_BACKEND_URL="${BACKEND_URL}" npm run qa:phase -- "${PHASE_ID}"
)
