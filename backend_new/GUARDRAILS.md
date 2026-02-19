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
