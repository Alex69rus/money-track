# backend_new Guardrails Log

This file stores reusable guardrails from implementation/debugging loops to reduce repeated mistakes and token waste.

## Update Rule

After each implementation/debugging iteration, append concise notes with:
- Takeaways: pitfalls, root causes, and preferred fixes.
- Explorations: what was checked, what was ruled out, and why.
- Prevention rule: one concrete default command/check to avoid recurrence.

Keep entries short, actionable, and repository-specific.

## Active Guardrails

### 2026-02-18 - Integration Execution Reliability
- Takeaway: fixed sleeps before tests are flaky; startup timing must be validated explicitly.
- Preferred fix: always poll `GET /health` with timeout before integration runs.
- Prevention rule: classify failures first (`connectivity | sandbox | auth | contract`) before changing code.

### 2026-02-18 - Runtime Lifecycle
- Takeaway: DB connection pooling belongs in FastAPI lifespan, not per-request setup.
- Preferred fix: manage startup/shutdown pool lifecycle centrally.
- Prevention rule: keep one canonical engine factory shared by runtime and Piccolo config.

### 2026-02-19 - API Contract Safety
- Takeaway: framework defaults can drift from expected API error payloads.
- Preferred fix: use explicit exception handlers for stable error shapes.
- Prevention rule: lock response shape expectations with integration tests for each route group.

### 2026-02-19 - ORM Boundary Discipline
- Takeaway: mixing DB access patterns creates drift and maintenance risk.
- Preferred fix: keep runtime CRUD/query paths on Piccolo ORM only.
- Prevention rule: reject runtime changes that introduce direct SQL strings or non-Piccolo DB calls.

### 2026-02-19 - Typed Contracts
- Takeaway: loose runtime shapes increase hidden regressions.
- Preferred fix: route DB outputs through typed schema models and typed service contracts.
- Prevention rule: avoid `Any` in runtime service/query paths.

### 2026-02-19 - DB-Side Filtering
- Takeaway: Python-side filtering after load harms performance and parity.
- Preferred fix: attach all filters and pagination to DB queries before execution.
- Prevention rule: reject endpoint implementations that load-all then filter in Python.

### 2026-02-21 - Data Integrity Verification
- Takeaway: behavior tests alone can miss schema drift.
- Preferred fix: pair behavioral assertions with schema/catalog checks for critical constraints.
- Prevention rule: for each DB invariant, keep one behavior test and one schema-level assertion.

### 2026-02-22 - Paginated Count Efficiency
- Takeaway: `len(query.run())` for total counts is inefficient.
- Preferred fix: use DB aggregate count query with identical predicates.
- Prevention rule: enforce aggregate-count pattern for paginated endpoints.

### 2026-03-07 - Local-Day Date Filtering
- Takeaway: date filters must use business-local calendar boundaries.
- Preferred fix: compute local-day boundaries in `BUSINESS_TIMEZONE` and convert to UTC for predicates.
- Prevention rule: keep an integration test for local-day boundary exclusion.

### 2026-03-07 - Gate Command Reliability
- Takeaway: ad-hoc integration commands can produce false negatives.
- Preferred fix: use orchestrated service startup + readiness + test execution commands.
- Prevention rule: declare parity/status only from controlled test runs with explicit URLs and lifecycle handling.
