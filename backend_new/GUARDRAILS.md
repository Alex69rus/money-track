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
- Prevention rule: reject non-Piccolo DB calls and dynamically constructed or unparameterized runtime SQL. Use fixed, parameterized `Entity.raw()` only when Piccolo cannot express a required PostgreSQL operation.

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

### 2026-03-22 - Telegram Runtime Test Boot Guard
- Takeaway: local test boot fails when `.env` enables `TELEGRAM_WEBHOOK_URL` and startup uses a dummy bot token.
- Exploration: ruled out API regressions after reproducing `InvalidToken` during lifespan startup and confirming tests pass when webhook env is cleared.
- Prevention rule: for local integration/full test orchestration, always set `TELEGRAM_WEBHOOK_URL=` and `TELEGRAM_WEBHOOK_SECRET=` with explicit `ENVIRONMENT=Development`.

### 2026-03-22 - Sandbox-Safe E2E Execution
- Takeaway: sandboxed `uv` runs can panic or fail with cache/system permission errors, causing false infrastructure failures.
- Exploration: ruled out app defects by rerunning the same orchestration with `UV_CACHE_DIR=./.uv-cache` and escalated execution; tests then passed.
- Prevention rule: default to orchestrated runs with `UV_CACHE_DIR=./.uv-cache`; escalate only when failure class is `sandbox/permission`.

### 2026-04-03 - Async Loop Consistency in Piccolo E2E
- Takeaway: running Piccolo pool operations across multiple `asyncio.run(...)` calls causes cross-loop failures (`Future attached to a different loop` / `another operation is in progress`).
- Exploration: ruled out query logic by reproducing failures only when pool start/query/close spanned different event loops; stable behavior returned after executing the full scenario in one coroutine.
- Prevention rule: when tests use `engine.start_connection_pool()`, run setup, business calls, and teardown in a single async coroutine with one `asyncio.run(...)` entrypoint.

### 2026-07-17 - Filter Variable Safety
- Takeaway: introducing a new filter parameter can accidentally be shadowed by an existing loop variable, silently composing an unintended second predicate.
- Exploration: multi-tag list requests retained only the last tag; focused API tests isolated the cause to `tag` being reused as a loop variable before applying the singular tag filter.
- Prevention rule: use distinct names for request filters and normalized loop values, and cover combined filter paths with integration tests.

### 2026-07-18 - Database-side Analytics Aggregation
- Takeaway: moving an aggregate from the frontend to Python only relocates the unbounded memory and latency cost.
- Exploration: static parameterized PostgreSQL queries correctly covered AED/user/date filtering, category/tag shares, Dubai-local month buckets, and tag extraction; the isolated parity suite passed 34 tests with 2 production-only skips.
- Prevention rule: reject any aggregate resource that loads matching transaction rows for Python reduction, grouping, share calculation, or ordering; return only database aggregate projections.

### 2026-07-18 - Bootstrap Catalog Seeds
- Takeaway: production identity values cannot be reused when seeding a fresh database with hierarchical catalog data.
- Preferred fix: seed root rows first, then resolve child `parent_category_id` values by the parent's stable unique name.
- Prevention rule: use idempotent `ON CONFLICT (name) DO NOTHING` catalog inserts in the initial migration and preserve the production type and ordering values.

### 2026-07-19 - Canonical Category Presentation
- Takeaway: shared category colors and Material Symbol names belong in the database catalog, not in per-client mappings.
- Exploration: an idempotent migration updated all 50 seeded categories by stable `(name, type)` and the category API exposed the values unchanged.
- Prevention rule: add every predefined category's icon and validated `#RRGGBB` color to the catalog migration and cover the API response in integration tests.

### 2026-07-25 - Zed FastAPI launcher
- Takeaway: this FastAPI service must launch the `uvicorn` module from `backend_new`; a Django-style `main.py runserver` profile cannot start it.
- Exploration: `python -m uvicorn app.main:app` returned `OK` from `/health`; the inherited `uvicorn` console script was ruled out because its interpreter path is stale after a moved checkout.
- Prevention rule: configure Zed Debugpy with `module: "uvicorn"` and `cwd: "$ZED_WORKTREE_ROOT/backend_new"`; recreate `.venv` before relying on console-script executables.

### 2026-07-25 - AI Chat Transaction Pagination
- Takeaway: pair a paginated data query with a matching database-side count query and deterministic ordering.
- Exploration: the focused AI-chat tool suite passed after applying the same predicates to `COUNT(*)` and adding `OFFSET` / `LIMIT` before execution.
- Prevention rule: every new raw paginated transaction query must return its requested page, unpaged total, and `has_more` from one shared predicate fragment.

### 2026-07-26 - Array Tag Filtering
- Takeaway: a PostgreSQL `SELECT` alias is not available to a `WHERE` predicate in the same query level.
- Exploration: case-insensitive tag filtering failed with `column "tag" does not exist`; default retrieval and pagination ruled out array storage and ordering defects.
- Prevention rule: expand tag arrays with `CROSS JOIN LATERAL UNNEST(...) AS alias(tag)` and reference `alias.tag` for all filter predicates.

### 2026-07-26 - AI Chat Aggregate Parameter Order
- Takeaway: raw-query argument order follows placeholder position in the complete SQL string, not query-construction order.
- Exploration: business-timezone grouping placed its placeholder before the nested user-scope predicate, so a user ID was bound where PostgreSQL expected a timezone string.
- Prevention rule: build raw SQL parameter lists in textual placeholder order and keep a local-time boundary integration test for every date-grouping query.

### 2026-07-26 - AI Chat Structured Tool Output
- Takeaway: ordinary Pydantic models and lists are stringified before the Agents SDK returns them to the model.
- Exploration: aggregate output reached the model as `TransactionAggregationResult(... Decimal(...))`; `ToolOutputText` preserved model-generated JSON as text instead.
- Prevention rule: return `ToolOutputText(text=<validated JSON>)` from every AI Chat tool and assert the model-facing text parses as JSON in its integration test.
