---
name: local-e2e-validate-with-sandbox
description: Run and troubleshoot local end-to-end API/integration validation under sandboxed execution constraints. Use when tests touch localhost services, need escalation retries, require service readiness checks, and need concise root-cause classification for failures.
---

# Local E2E Validate With Sandbox

Run local integration checks reliably when sandbox/network restrictions may block localhost access.

## Default Invocation (No Parameters)

When the skill is invoked without explicit parameters, treat it as a Python backend validation run.

- Target backend: `backend_new` (FastAPI/Python).
- Default base URL: `http://127.0.0.1:8000`.
- Default capture artifact: `artifacts/integration/latest-results.json` (relative to `backend_new`).
- Default run command (from `backend_new`):
  - `uv run python scripts/run_integration_capture.py`

Only override these defaults when the user explicitly provides a different command, URL, or artifact path.

## Execute Workflow

1. Run the target test/check command in sandbox first.
2. If failure is permission/sandbox related, rerun with escalation and concise justification.
3. Ensure service readiness before test start:
- poll health endpoint instead of fixed sleep
- fail fast with clear reason if service never becomes ready
4. Classify failures into one class before proposing fixes:
- connectivity (refused/unreachable)
- sandbox/permission
- auth/environment mismatch
- contract/data regression
5. Re-run after each fix and report only net-new outcome changes.

## Reliability Rules

- Use explicit env vars in commands (`BASE_URL`, DB URL, auth mode, result path).
- Keep run commands copy-pastable and deterministic.
- Prefer single-command orchestration when starting temporary local services and tests together.
- Always clean up background processes started for validation.
- For integration capture runs, prefer:
  - `backend_new/scripts/run_integration_capture.py`
  - No-arg mode is supported and defaults to Python backend values.
  - This standardizes env wiring and JSON artifact output.

## Reporting Format

Provide:
- exact command used
- test summary counts
- primary failure class
- minimal next action to unblock
