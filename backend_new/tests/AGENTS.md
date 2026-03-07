# Tests Agent Guide (backend_new/tests)

This file is the operating guide for AI agents working with backend tests in `backend_new`.

## Scope

- Current suite is integration-focused and lives in `tests/integration/test_api_parity.py`.
- These tests call a running API over HTTP and also seed/assert DB state directly.
- They are parity tests: preserve behavior compatibility with the baseline API unless a change is explicitly approved.

## Fast Facts

- API base URL fixture: `BASE_URL` (default `http://localhost:8000`).
- DB URL fixture: `TEST_DATABASE_URL`, else `.env:DATABASE_URL`, else `postgresql://postgres:password@127.0.0.1:5432/moneytrack`.
- Optional prod auth checks: `PRODUCTION_BASE_URL` (tests are skipped if unset).
- Session cleanup removes only namespaced test artifacts.
- Auth bypass in dev mode: when `ENVIRONMENT=Development`, API auth dependency returns user `123456789` and does not require `X-Telegram-Init-Data`.

## Preferred Execution Workflow

Use this exact sequence to avoid flaky or misleading failures.

1. Start backend locally (do not use backend docker container unless explicitly requested):
   - `cd backend_new && uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`
2. Poll readiness (no fixed sleeps):
   - `for i in {1..30}; do curl -sf http://127.0.0.1:8000/health >/dev/null && echo READY && break; sleep 1; done`
3. Run tests against explicit URL:
   - `cd backend_new && BASE_URL='http://127.0.0.1:8000' uv run --no-project pytest tests -q`
4. Stop the background backend process after run.

If only integration tests are needed:
- `cd backend_new && BASE_URL='http://127.0.0.1:8000' uv run --no-project pytest tests/integration -q`

If machine-readable output is needed:
- `cd backend_new && BASE_URL='http://127.0.0.1:8000' RESULTS_FILE='artifacts/integration/latest-results.json' uv run python ../.agents/skills/run-e2e-tests/scripts/run_integration_against_existing_api.py`

## Sandbox / CI-Like Environments

When running in constrained sandboxes:

- Run in sandbox first.
- If localhost access fails with `Operation not permitted`, classify as `sandbox/permission` and rerun with escalation.
- If `uv` fails reading cache (for example under `~/.cache/uv`), rerun with escalation.
- Do not interpret those as product regressions.

## Failure Classification (Mandatory Before Editing Code)

Classify failing runs into one class first:

- `connectivity`: API or Postgres not reachable (`ConnectError`, `Connection refused`).
- `sandbox/permission`: sandbox blocks localhost or cache/socket access.
- `auth/environment mismatch`: wrong mode/URL (for example missing `PRODUCTION_BASE_URL` for prod auth checks).
- `contract/data regression`: assertions fail while environment is healthy.

Only edit application/test code for `contract/data regression`.

## Authoring Rules For New Tests

Follow these rules when adding or changing tests.

1. Keep parity intent explicit:
   - Test behavior, not implementation details.
   - If introducing new behavior, call it out as intentional and not parity.
2. Use provided fixtures and helpers:
   - `db_helper`, `perform_request`, `test_user_id`, `test_other_user_id`.
   - Seed transactions with `SeedTransaction`.
3. Namespace all seeded values:
   - Build strings with `_unique_value(db_helper.namespace, "...")`.
   - This is required for reliable session cleanup and isolation.
4. Use `perform_request(...)` for HTTP calls:
   - It records normalized results for capture artifacts.
5. Assert both transport and contract:
   - Always assert status code.
   - Assert key response fields and side effects (DB row state) when relevant.
6. Cover negative paths:
   - Ownership checks, missing resource checks, invalid inputs, and boundary dates.
7. Prefer deterministic data:
   - Fixed timestamps/amounts in assertions.
   - Explicit timezone boundary checks (`Asia/Dubai`) for date filters.

## Known Test Semantics To Preserve

- Text search parity for `GET /api/transactions?text=`:
  - Match by `amount`, `note`, `tags`, and category name.
  - Do not include `sms_text` in generic text filter unless explicitly introduced as a new feature.
- Local-day filtering semantics:
  - `fromDate`/`toDate` are interpreted in business local timezone (`Asia/Dubai`), not raw UTC day boundaries.
- Unique constraint behavior:
  - `(user_id, message_id)` unique index is validated by tests.

## Common Pitfalls

- Seeing backend stack traces in logs does not always mean suite failure.
  - Some tests intentionally trigger DB errors and assert returned status/behavior.
  - Trust pytest exit code and assertions, not raw server log noise.
- Running tests without a live API always produces widespread HTTP failures.
- Running backend in docker while also trying local backend can create confusion over active URL/port.
  - Prefer one backend target per run.
- Running API in `Production` unintentionally during local parity runs causes auth-related failures unless valid Telegram header data is provided.

## Auth Mode Notes

- Preferred local test mode: `ENVIRONMENT=Development`.
- In development mode:
  - `get_current_user_id` bypasses Telegram verification.
  - Effective authenticated user is fixed to `123456789`.
- Keep `TEST_USER_ID` aligned with that default unless you intentionally test another path.
- Use `PRODUCTION_BASE_URL` only when explicitly running production auth-negative checks.

## Minimal Agent Checklist

Before reporting completion:

1. State exact command(s) used.
2. Report pass/fail/skip summary.
3. If failed, report one primary failure class.
4. Provide minimal next action to unblock.
