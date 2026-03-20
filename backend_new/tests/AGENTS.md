# Tests Agent Guide (backend_new/tests)

This file is the operating guide for AI agents working with backend tests in `backend_new`.

## Scope

- Main suite is integration-focused in `tests/integration/test_api_parity.py`.
- Tests call a running API over HTTP and seed/assert DB state directly.
- Preserve current API behavior unless an intentional contract change is explicitly requested.

## Fast Facts

- API base URL fixture: `BASE_URL` (default `http://localhost:8000`).
- DB URL fixture: `TEST_DATABASE_URL`, else `.env:DATABASE_URL`, else `postgresql://postgres:password@127.0.0.1:5432/moneytrack`.
- Optional production checks: `PRODUCTION_BASE_URL` (tests are skipped if unset).
- Auth bypass in dev mode: when `ENVIRONMENT=Development`, API auth dependency returns user `123456789`.

## Preferred Execution Workflow

1. Start backend locally:
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

## Failure Classification (Mandatory Before Editing Code)

Classify failing runs first:
- `connectivity`: API or Postgres not reachable.
- `sandbox/permission`: sandbox blocks localhost/cache/socket access.
- `auth/environment mismatch`: wrong mode/URL.
- `contract/data regression`: assertions fail while environment is healthy.

Only edit app/test code for `contract/data regression`.

## Authoring Rules

1. Test behavior, not implementation details.
2. Use provided fixtures/helpers (`db_helper`, `perform_request`, seed models).
3. Namespace seeded values for isolation.
4. Assert status codes and key response fields.
5. Cover negative paths and boundary inputs.
6. Keep timestamps/amounts deterministic.

## Known Semantics To Preserve

- Text search on `GET /api/transactions?text=` matches amount, note, tags, and category name.
- Date filters use business-local timezone (`Asia/Dubai`) semantics.
- Unique constraint behavior on `(user_id, message_id)` is validated by tests.

## Minimal Agent Checklist

1. State exact command(s) used.
2. Report pass/fail/skip summary.
3. If failed, report one primary failure class.
4. Provide minimal next action to unblock.
