#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT_DIR}/scripts/lib/frontend_qa_stack.sh"

configure_case() {
  local reuse_services="$1"
  local backend_up="$2"
  local frontend_up="$3"
  local cors_allows="$4"

  QA_REUSE_SERVICES="${reuse_services}"
  qa_stack_init "${ROOT_DIR}" "qa-stack-test"

  qa_stack_is_up() {
    if [[ "$1" == *"/health" ]]; then
      [[ "${backend_up}" == "1" ]]
      return
    fi
    [[ "${frontend_up}" == "1" ]]
  }

  qa_stack_cors_allows_frontend() {
    [[ "${cors_allows}" == "1" ]]
  }

  qa_stack_start_backend() {
    QA_TEST_STARTED_BACKEND=1
  }

  qa_stack_start_frontend() {
    QA_TEST_STARTED_FRONTEND=1
  }
}

assert_case() {
  local name="$1"
  local expected_exit="$2"
  local reuse_services="$3"
  local backend_up="$4"
  local frontend_up="$5"
  local cors_allows="$6"
  local exit_code

  configure_case "${reuse_services}" "${backend_up}" "${frontend_up}" "${cors_allows}"
  QA_TEST_STARTED_BACKEND=0
  QA_TEST_STARTED_FRONTEND=0

  if qa_stack_start; then
    exit_code=0
  else
    exit_code=$?
  fi

  if [[ "${exit_code}" != "${expected_exit}" ]]; then
    echo "${name}: expected exit ${expected_exit}, received ${exit_code}" >&2
    exit 1
  fi

  if [[ "${backend_up}" == "0" && "${frontend_up}" == "0" ]]; then
    [[ "${QA_TEST_STARTED_BACKEND}" == "1" && "${QA_TEST_STARTED_FRONTEND}" == "1" ]] || {
      echo "${name}: fresh stack did not start both services" >&2
      exit 1
    }
  else
    [[ "${QA_TEST_STARTED_BACKEND}" == "0" && "${QA_TEST_STARTED_FRONTEND}" == "0" ]] || {
      echo "${name}: existing stack unexpectedly started a service" >&2
      exit 1
    }
  fi
}

assert_case "fresh stack" 0 0 0 0 0
assert_case "implicit reuse" 2 0 1 1 1
assert_case "reused stack with invalid CORS" 2 1 1 1 0
assert_case "explicit compatible reuse" 0 1 1 1 1
assert_case "partial stack" 2 1 1 0 0

echo "frontend QA stack decision matrix passed"
