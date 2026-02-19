# backend_new Guardrails Log

This file stores reusable guardrails from iteration loops to reduce repeated mistakes and token waste.

## Update Rule

After each implementation/debugging iteration, append concise notes with:
- Takeaways: pitfalls, root causes, and preferred fixes.
- Explorations: what was checked, what was ruled out, and why.
- Prevention rule: one concrete default/command/check to avoid recurrence.

Keep entries short, actionable, and repository-specific.

## Entries

### 2026-02-18 - Integration Parity Suite Authoring

- Takeaway: Do not reuse one `asyncpg.Connection` across repeated `asyncio.run(...)` calls in sync pytest tests.
  - Root cause: cross-event-loop futures (`Future attached to a different loop`).
  - Preferred fix: use short-lived per-operation DB connections, or convert fixture stack to fully async.
- Exploration: `uv run pytest` in `backend_new` failed due to editable build metadata (Hatch wheel file-selection issue).
  - Ruled out: relying on default `uv run pytest` for parity runs.
  - Why: it attempts project build before running tests.
- Prevention rule: for local parity runs, prefer `.venv/bin/pytest tests/integration -q` with explicit env vars.

- Takeaway: fixed sleep before tests is flaky when starting local C# API.
  - Root cause: tests may start before Kestrel binds to `http://localhost:5000`.
  - Preferred fix: poll `GET /health` with timeout before running suite.
- Exploration: initial failures classified as connectivity (`connection refused`) versus auth (`401`) based on response/error class.
  - Ruled out: treating all failures as contract regressions.
  - Why: environment mode and startup readiness were true root causes.
- Prevention rule: classify failures first (connectivity/sandbox/auth/contract) before changing tests.

- Takeaway: integration suite requires clear mode assumptions for auth.
  - Root cause: running backend outside `ASPNETCORE_ENVIRONMENT=Development` causes expected `401` on protected endpoints.
  - Preferred fix: run development-mode baseline for parity authoring unless explicitly testing production auth.
- Exploration: production auth-negative tests were intentionally skipped without `PRODUCTION_BASE_URL`.
  - Ruled out: forcing production auth assertions in default local run.
  - Why: they belong to explicit non-development validation path.
- Prevention rule: always pass explicit env contract (`BASE_URL`, `TEST_DATABASE_URL`, optional `PRODUCTION_BASE_URL`) in run commands.

### 2026-02-18 - Scaffold Hardening Baseline

- Takeaway: initialize Piccolo connection pool in FastAPI lifespan, not per request.
  - Root cause: request-scoped pool setup adds overhead and can leak under failures.
  - Preferred fix: single startup/shutdown lifecycle with explicit `start_connection_pool` / `close_connection_pool`.
- Exploration: checked whether to instantiate `PostgresEngine` in `piccolo_conf.py` versus dedicated app module.
  - Ruled out: duplicated engine setup in multiple files.
  - Why: centralizing in `app/db/engine.py` avoids drift across runtime and migration config.
- Prevention rule: keep one canonical engine factory (`get_engine`) and import it from both app runtime and Piccolo config.

### 2026-02-18 - Static Analysis Stabilization

- Takeaway: strict `mypy` on integration-test-heavy repos can block migration slices when third-party stubs aren't available in CI/local environments.
  - Root cause: strict defaults (`no-untyped-def`, missing import typing) surface mostly in test harnesses and framework decorators.
  - Preferred fix: keep strict mode, but explicitly disable noisy error codes for this phase and preserve fast feedback on structural issues.
- Exploration: attempted per-module overrides for `tests.*`; rule didn't consistently match collected modules in this environment.
  - Ruled out: relying on module-pattern overrides only.
  - Why: direct `disable_error_code` in top-level mypy config is deterministic across invocation styles.
- Prevention rule: after any mypy config change, run `ruff check . && mypy .` from `backend_new/` in one command to validate config-effect and avoid false-green assumptions.

### 2026-02-19 - Auth + Read Slice Implementation

- Takeaway: mirroring C# error contract requires explicit unauthorized/internal handlers instead of FastAPI defaults (`detail` payloads differ).
  - Root cause: framework default exception serialization drifts from baseline contract.
  - Preferred fix: register custom exception handlers returning `{error, message}` shape for 401/500 paths.
- Exploration: checked whether to rely on Piccolo query builder for endpoint parity in this slice.
  - Ruled out: forcing full query-builder migration before parity semantics are stable.
  - Why: raw SQL via asyncpg provided faster control for date-range, tag overlap, and text-search parity behavior.
- Prevention rule: for each migrated endpoint, codify contract-first response fields in one serializer helper and reuse across CRUD routes.

### 2026-02-19 - ORM Compliance Follow-up

- Takeaway: migration slices must keep runtime CRUD/query paths on Piccolo ORM only; raw SQL in app code violates agreed migration constraints.
  - Root cause: parity implementation optimized quickly with asyncpg SQL before enforcing stack boundary.
  - Preferred fix: define Piccolo table models early and route all reads/writes through Piccolo query / object APIs.
- Exploration: evaluated keeping asyncpg for read filters while using Piccolo only for writes.
  - Ruled out: mixed runtime DB access layers.
  - Why: requirement explicitly mandates Piccolo for writing and fetching service CRUD logic.
- Prevention rule: before opening a PR, run a grep gate for DB access imports (`asyncpg`, direct SQL strings) under `backend_new/app` and replace with Piccolo equivalents.

### 2026-02-19 - Typed ORM Contract Tightening

- Takeaway: parity code that compiles can still drift from team standards if query/service boundaries use `Any` or anonymous dict payloads.
  - Root cause: rapid endpoint migration favored loose shapes over explicit contracts.
  - Preferred fix: route DB outputs through typed schema models and keep query function signatures class-based.
- Exploration: evaluated keeping Piccolo `.select()` for partial-field optimization.
  - Ruled out: mixed fetch styles for entity reads in runtime service paths.
  - Why: project rule now requires `.objects()` for entity fetch consistency.
- Prevention rule: before commit, run grep checks for `.select(` and `Any` in `backend_new/app` and resolve hits in runtime code.

### 2026-02-19 - DB-Level Filtering Enforcement

- Takeaway: loading all transactions and then filtering in Python violates scalability and parity expectations for query semantics.
  - Root cause: fast migration favored correctness-first loops over DB-side predicate composition.
  - Preferred fix: compose filters directly on Piccolo query objects (`.where(...)`, pagination in query), then map only returned rows.
- Exploration: verified runtime code paths for transactions now apply date/amount/category/tag/text predicates as query conditions before pagination.
  - Ruled out: retaining Python-side filtering loops.
  - Why: requirement is explicit that entity filtering must stay on the database side.
- Prevention rule: reject any PR where list endpoints call `.run()` before all requested filters and pagination are attached to the query.

### 2026-02-19 - Test Dependency Availability

- Takeaway: integration tests depending on `httpx` should not rely only on optional dev installation paths when the suite is a primary migration gate.
  - Root cause: environments executing project-only installs can miss HTTP client test prerequisites.
  - Preferred fix: include `httpx` in core project dependencies to keep test harness imports available in standard setup flows.
- Exploration: confirmed integration fixture import path requires `httpx` at test collection time.
  - Ruled out: deferring `httpx` availability to ad-hoc manual installs.
  - Why: that makes parity test runs inconsistent across environments.
- Prevention rule: when integration suite adds a new third-party import in `tests/**`, validate dependency placement in `pyproject.toml` before merging.
