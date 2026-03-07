---
name: run-e2e-tests
description: Run and troubleshoot local end-to-end API/integration validation under sandboxed execution constraints. Use when tests touch localhost services, need escalation retries, require service readiness checks, and need concise root-cause classification for failures.
---

# Local E2E Validate With Sandbox

Run local integration checks reliably when sandbox/network restrictions may block localhost access.

## Default Invocation (No Parameters)

When the skill is invoked without explicit parameters, treat it as a Python backend validation run.

- Target backend: `backend_new` (FastAPI/Python).
- Default dev URL: `http://127.0.0.1:8000`.
- Default prod URL: `http://127.0.0.1:8001`.
- Default DB URL: `postgresql://postgres:password@127.0.0.1:5432/moneytrack`.
- Default inline orchestration command (from `backend_new`):
  - `(ENVIRONMENT=Development TELEGRAM_BOT_TOKEN=test-token DATABASE_URL="${TEST_DATABASE_URL:-postgresql://postgres:password@127.0.0.1:5432/moneytrack}" UV_CACHE_DIR="${UV_CACHE_DIR:-./.uv-cache}" uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 >/tmp/backend_new_uvicorn.log 2>&1 & pid=$!; trap 'kill $pid 2>/dev/null || true' EXIT; ready=0; for i in {1..30}; do if curl -sf http://127.0.0.1:8000/health >/dev/null; then ready=1; break; fi; sleep 1; done; if [ "$ready" -ne 1 ]; then echo 'health check failed: backend not ready on http://127.0.0.1:8000/health'; tail -n 120 /tmp/backend_new_uvicorn.log; exit 2; fi; BASE_URL="${BASE_URL:-http://127.0.0.1:8000}" UV_CACHE_DIR="${UV_CACHE_DIR:-./.uv-cache}" uv run --no-project pytest tests/integration; rc=$?; kill $pid 2>/dev/null || true; wait $pid 2>/dev/null || true; exit $rc)`

Only override these defaults when the user explicitly provides a different command, URL, or artifact path.

## Script Modes

Use one of three explicit modes:

- Local dual API orchestration script (preferred when present):
  - `backend_new/scripts/run_integration_local_dual_api.py`
  - Use only if this file exists in the current repository.
- Inline local orchestration fallback (default if script is missing):
  - Use the default inline orchestration command above.
  - Starts local API, polls `/health`, runs integration tests, and cleans up processes.
- Existing API endpoints (optional):
  - `backend_new/scripts/run_integration_against_existing_api.py`
  - Runs tests against already-running endpoint(s), with optional result artifact path and DB/user overrides.
  - Use only when service startup is intentionally managed outside this skill.

## Preflight

Before executing tests:

1. Verify target repo path exists: `backend_new`.
2. If using script mode, verify script path exists; if missing, switch to inline fallback immediately.
3. Set `UV_CACHE_DIR=./.uv-cache` for sandbox runs to avoid cache permission failures.

## Execute Workflow

1. Run the target command in sandbox first with explicit env vars and `UV_CACHE_DIR=./.uv-cache`.
2. If script path is missing, switch to inline fallback command and retry.
3. If failure is permission/sandbox related, rerun with escalation and concise justification.
4. Ensure service readiness before test start:
- poll health endpoint instead of fixed sleep
- fail fast with clear reason if service never becomes ready and include recent backend log tail
5. Classify failures into one class before proposing fixes:
- startup/path mismatch (missing script, wrong working dir)
- sandbox/permission
- connectivity (health check failed, refused/unreachable API)
- auth/environment mismatch
- contract/data regression
6. Re-run after each fix and report only net-new outcome changes.

## Reliability Rules

- Use explicit env vars in commands (`BASE_URL`, DB URL, auth mode, result path).
- Keep run commands copy-pastable and deterministic.
- Prefer single-command orchestration when starting temporary local services and tests together.
- Always clean up background processes started for validation.
- Prefer default local orchestration unless the user asks to reuse pre-running services.

## Reporting Format

Provide:
- exact command used
- test summary counts
- primary failure class
- minimal next action to unblock
