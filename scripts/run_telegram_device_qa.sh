#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_URL="${QA_BACKEND_URL:-http://127.0.0.1:8000}"
FRONTEND_URL="${QA_FRONTEND_URL:-http://127.0.0.1:4173}"
FRONTEND_PORT="${QA_FRONTEND_PORT:-4173}"
NGROK_DOMAIN="${TELEGRAM_DEVICE_NGROK_DOMAIN:-}"
TMP_DIR="${ROOT_DIR}/.codex-tmp"
mkdir -p "${TMP_DIR}"

if [[ -z "${NGROK_DOMAIN}" ]]; then
  echo "Set TELEGRAM_DEVICE_NGROK_DOMAIN to the reserved HTTPS domain configured on the test Telegram bot." >&2
  exit 2
fi

NGROK_DOMAIN="${NGROK_DOMAIN#https://}"
PUBLIC_URL="https://${NGROK_DOMAIN}"
BACKEND_LOG="${TMP_DIR}/telegram-device-backend.log"
FRONTEND_LOG="${TMP_DIR}/telegram-device-frontend.log"
STARTED_BACKEND=0
STARTED_FRONTEND=0
BACKEND_PID=""
FRONTEND_PID=""
NGROK_PID=""

cleanup() {
  if [[ -n "${NGROK_PID}" ]]; then
    kill "${NGROK_PID}" 2>/dev/null || true
    wait "${NGROK_PID}" 2>/dev/null || true
  fi
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
  curl -sf "$1" >/dev/null 2>&1
}

wait_up() {
  local name="$1"
  local url="$2"
  for ((i=1; i<=90; i+=1)); do
    if is_up "${url}"; then
      return 0
    fi
    sleep 1
  done
  echo "[qa:telegram-device] ${name} did not become ready at ${url}" >&2
  return 1
}

if ! is_up "${BACKEND_URL}/health"; then
  (
    cd "${ROOT_DIR}/backend_new"
    ENVIRONMENT=Development \
      TELEGRAM_WEB_APP_URL="${PUBLIC_URL}" \
      TELEGRAM_WEBHOOK_URL= \
      TELEGRAM_WEBHOOK_SECRET= \
      uv run python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
  ) >"${BACKEND_LOG}" 2>&1 &
  BACKEND_PID=$!
  STARTED_BACKEND=1
  wait_up "backend" "${BACKEND_URL}/health"
fi

if ! is_up "${FRONTEND_URL}"; then
  (
    cd "${ROOT_DIR}/frontend_new"
    VITE_API_BASE_URL= npm run dev -- --host 127.0.0.1 --port "${FRONTEND_PORT}"
  ) >"${FRONTEND_LOG}" 2>&1 &
  FRONTEND_PID=$!
  STARTED_FRONTEND=1
  wait_up "frontend" "${FRONTEND_URL}"
fi

docker compose -f "${ROOT_DIR}/compose.dev.yml" up -d nginx
wait_up "nginx proxy" "http://127.0.0.1:8080/health"

echo "Telegram device QA is ready at ${PUBLIC_URL}"
echo "Open the Mini App from the test bot on a physical phone, then check keyboard, bottom nav, sheets, and sticky actions."
echo "Press Ctrl+C when the device check is complete."

ngrok http 8080 --url "${NGROK_DOMAIN}" >"${TMP_DIR}/telegram-device-ngrok.log" 2>&1 &
NGROK_PID=$!
wait "${NGROK_PID}"
