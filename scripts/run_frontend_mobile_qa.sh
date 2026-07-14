#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

source "${ROOT_DIR}/scripts/lib/frontend_qa_stack.sh"
qa_stack_init "${ROOT_DIR}" "qa-mobile"
trap qa_stack_cleanup EXIT INT TERM
qa_stack_start

(
  cd "${ROOT_DIR}/frontend_new"
  QA_FRONTEND_URL="${QA_FRONTEND_URL}" \
    QA_MOBILE_REPORT_FILE="${QA_TMP_DIR}/qa-mobile-report.json" \
    npm run qa:mobile
)
