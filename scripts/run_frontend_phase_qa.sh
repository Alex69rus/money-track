#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PHASE_ID="${1:-phase2}"

source "${ROOT_DIR}/scripts/lib/frontend_qa_stack.sh"
qa_stack_init "${ROOT_DIR}" "qa-${PHASE_ID}"
trap qa_stack_cleanup EXIT INT TERM
qa_stack_start

echo "[qa-${PHASE_ID}] Running phase checks"
(
  cd "${ROOT_DIR}/frontend_new"
  QA_FRONTEND_URL="${QA_FRONTEND_URL}" \
    QA_BACKEND_URL="${QA_BACKEND_URL}" \
    QA_REPORT_FILE="${QA_TMP_DIR}/qa-${PHASE_ID}-report.json" \
    npm run qa:phase -- "${PHASE_ID}"
)
