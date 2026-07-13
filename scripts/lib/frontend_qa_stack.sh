#!/usr/bin/env bash

# Shared lifecycle for root-owned frontend phase and mobile QA. Source this
# file from a runner; it intentionally does not set shell options itself.

qa_stack_init() {
  QA_ROOT_DIR="$1"
  QA_LOG_STEM="$2"
  QA_BACKEND_PORT="${QA_BACKEND_PORT:-8002}"
  QA_FRONTEND_PORT="${QA_FRONTEND_PORT:-4174}"
  QA_BACKEND_URL="${QA_BACKEND_URL:-http://127.0.0.1:${QA_BACKEND_PORT}}"
  QA_FRONTEND_URL="${QA_FRONTEND_URL:-http://127.0.0.1:${QA_FRONTEND_PORT}}"
  QA_REUSE_SERVICES="${QA_REUSE_SERVICES:-0}"
  QA_TMP_DIR="${QA_ROOT_DIR}/.codex-tmp"
  QA_UV_CACHE_DIR="${QA_UV_CACHE_DIR:-${QA_ROOT_DIR}/.uv-cache}"
  QA_BACKEND_LOG="${QA_TMP_DIR}/${QA_LOG_STEM}-backend.log"
  QA_FRONTEND_LOG="${QA_TMP_DIR}/${QA_LOG_STEM}-frontend.log"
  QA_STARTED_BACKEND=0
  QA_STARTED_FRONTEND=0
  QA_BACKEND_PID=""
  QA_FRONTEND_PID=""

  mkdir -p "${QA_TMP_DIR}" "${QA_UV_CACHE_DIR}"
}

qa_stack_is_up() {
  curl -sf "$1" >/dev/null 2>&1
}

qa_stack_wait_up() {
  local name="$1"
  local url="$2"
  local timeout="${3:-90}"

  for ((i = 1; i <= timeout; i += 1)); do
    if qa_stack_is_up "${url}"; then
      return 0
    fi
    sleep 1
  done

  echo "[${QA_LOG_STEM}] ${name} did not become ready at ${url} within ${timeout}s" >&2
  return 1
}

qa_stack_stop_tree() {
  local pid="$1"
  local child_pid

  if [[ -z "${pid}" ]] || ! kill -0 "${pid}" 2>/dev/null; then
    return
  fi

  while IFS= read -r child_pid; do
    [[ -n "${child_pid}" ]] && qa_stack_stop_tree "${child_pid}"
  done < <(pgrep -P "${pid}" 2>/dev/null || true)

  kill "${pid}" 2>/dev/null || true
  wait "${pid}" 2>/dev/null || true
}

qa_stack_cleanup() {
  if [[ "${QA_STARTED_FRONTEND}" -eq 1 ]]; then
    qa_stack_stop_tree "${QA_FRONTEND_PID}"
  fi
  if [[ "${QA_STARTED_BACKEND}" -eq 1 ]]; then
    qa_stack_stop_tree "${QA_BACKEND_PID}"
  fi
}

qa_stack_cors_allows_frontend() {
  curl -sS -D - -o /dev/null -X OPTIONS "${QA_BACKEND_URL}/api/transactions" \
    -H "Origin: ${QA_FRONTEND_URL}" \
    -H "Access-Control-Request-Method: GET" \
    | tr -d '\r' \
    | grep -Fqi "access-control-allow-origin: ${QA_FRONTEND_URL}"
}

qa_stack_start_backend() {
  echo "[${QA_LOG_STEM}] Starting backend (log: ${QA_BACKEND_LOG})"
  (
    cd "${QA_ROOT_DIR}/backend_new"
    ENVIRONMENT=Development \
      TELEGRAM_BOT_TOKEN=test-token \
      TELEGRAM_WEBHOOK_URL= \
      TELEGRAM_WEBHOOK_SECRET= \
      CORS_ALLOW_ORIGINS="${QA_FRONTEND_URL}" \
      UV_CACHE_DIR="${QA_UV_CACHE_DIR}" \
      uv run python -m uvicorn app.main:app --host 127.0.0.1 --port "${QA_BACKEND_PORT}"
  ) >"${QA_BACKEND_LOG}" 2>&1 &
  QA_BACKEND_PID=$!
  QA_STARTED_BACKEND=1
  qa_stack_wait_up "backend" "${QA_BACKEND_URL}/health"
}

qa_stack_start_frontend() {
  echo "[${QA_LOG_STEM}] Starting frontend on port ${QA_FRONTEND_PORT} (log: ${QA_FRONTEND_LOG})"
  (
    cd "${QA_ROOT_DIR}/frontend_new"
    VITE_API_BASE_URL="${QA_BACKEND_URL}" npm run dev -- --host 127.0.0.1 --port "${QA_FRONTEND_PORT}"
  ) >"${QA_FRONTEND_LOG}" 2>&1 &
  QA_FRONTEND_PID=$!
  QA_STARTED_FRONTEND=1
  qa_stack_wait_up "frontend" "${QA_FRONTEND_URL}"
}

qa_stack_start() {
  local backend_is_up=0
  local frontend_is_up=0

  qa_stack_is_up "${QA_BACKEND_URL}/health" && backend_is_up=1
  qa_stack_is_up "${QA_FRONTEND_URL}" && frontend_is_up=1

  if [[ "${backend_is_up}" -eq 1 && "${frontend_is_up}" -eq 1 ]]; then
    if [[ "${QA_REUSE_SERVICES}" != "1" ]]; then
      echo "[${QA_LOG_STEM}] Refusing to reuse an existing QA stack. Stop it or set QA_REUSE_SERVICES=1 explicitly." >&2
      return 2
    fi
    if ! qa_stack_cors_allows_frontend; then
      echo "[${QA_LOG_STEM}] Reused backend does not allow ${QA_FRONTEND_URL} by CORS. Restart the QA stack instead." >&2
      return 2
    fi
    echo "[${QA_LOG_STEM}] Reusing explicit QA stack at ${QA_BACKEND_URL} and ${QA_FRONTEND_URL}"
    return
  fi

  if [[ "${backend_is_up}" -eq 1 || "${frontend_is_up}" -eq 1 ]]; then
    echo "[${QA_LOG_STEM}] Refusing a partial QA stack. Stop the existing service(s) before running this command." >&2
    return 2
  fi

  qa_stack_start_backend
  qa_stack_start_frontend
}
