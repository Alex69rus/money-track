---
name: parity-integration-author
description: Author and extend API parity integration tests between a baseline and candidate service. Use when deriving tests from real baseline behavior, building deterministic DB-backed fixtures, asserting HTTP contract plus DB side effects, and capturing machine-readable run artifacts for migration feedback loops.
---

# Parity Integration Author

Create or extend one shared integration suite for baseline-vs-candidate parity.

## Execute Workflow

1. Read PRD/test-strategy and map required scenarios to actual baseline endpoint behavior before writing tests.
2. Enumerate endpoint semantics to lock:
- status codes
- response shape/fields
- filter/pagination semantics
- ownership/auth behavior
- DB side effects/constraints
3. Build deterministic fixtures:
- use namespaced IDs/prefixes for all created test data
- use fixed timestamps and explicit user IDs
- keep setup/teardown idempotent
4. Implement tests that verify both API contract and DB post-conditions.
5. Keep scenario names explicit and parity-oriented.
6. Record each request result (method/path/status/body) to support diff/debug workflows.

## Canonical Capture Runner

Use repository capture script as the default way to run and persist machine-readable results:

```bash
cd /Users/akukharev/src/rnd/money-track/backend_new
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/moneytrack \
.venv/bin/python scripts/run_integration_capture.py \
  --base-url http://localhost:5000 \
  --results-file /tmp/backend-csharp-parity-results.json
```

Optional production auth-negative checks:

```bash
cd /Users/akukharev/src/rnd/money-track/backend_new
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/moneytrack \
.venv/bin/python scripts/run_integration_capture.py \
  --base-url http://localhost:5000 \
  --production-base-url http://localhost:5001 \
  --results-file /tmp/backend-parity-results.json
```

Before running capture against local C# baseline, ensure API readiness by polling `/health` instead of fixed sleep.

## Fixture Rules

- Scope cleanup strictly to namespaced test data; never broad-delete shared DB data.
- Prefer small, branch-covering datasets over large random fixtures.
- If using async DB clients from sync pytest tests, avoid cross-event-loop reuse bugs.
- Prefer short-lived DB connections per operation unless the whole suite is async.

## Scenario Coverage Checklist

- Health endpoint success.
- Categories sorting behavior.
- Tags distinct/sorted/current-user-only behavior.
- Transactions list defaults and `hasMore` logic.
- Date boundary semantics (`toDate` full-day inclusion).
- Filter behavior (amount/category/tag/text).
- CRUD ownership semantics (owned vs non-owned).
- Unauthorized shape in non-development mode.
- Constraint behaviors (unique keys, FK on-delete behavior).

## Output Expectations

Report:
- files changed
- passed/failed/skipped counts
- parity mismatches with concrete endpoint paths
- artifact location for captured JSON results
- guardrail updates added to `/Users/akukharev/src/rnd/money-track/backend_new/GUARDRAILS.md` when new pitfalls are discovered
