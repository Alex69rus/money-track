# AGENT.MD - backend_new

This file defines strict rules for AI agents implementing the Python backend migration in this folder.

## Mission

Build a Python backend in `/Users/akukharev/src/rnd/money-track/backend_new` with behavior parity to `/Users/akukharev/src/rnd/money-track/backend`.

## Hard Boundaries

- Edit only files under `/Users/akukharev/src/rnd/money-track/backend_new` unless explicitly requested.
- Do not modify `/Users/akukharev/src/rnd/money-track/backend` (baseline for comparison).
- Do not modify `/Users/akukharev/src/rnd/money-track/frontend`.
- Preserve API contract parity (status codes, payloads, validation behavior).

## Required Stack

- Python `3.13`
- Local `.venv`
- `uv` for dependency management and command execution
- API: `FastAPI` + `uvicorn`
- ORM: `Piccolo`
- Migrations: `Piccolo` with raw SQL migrations only
- Migration mode: forward-only (no need to implement `run_backwards`)
- Validation: `Pydantic`
- Config: single `pydantic_settings` config object with `.env` support
- Type checking: `mypy`
- Formatting/linting: `ruff`
- Testing: `pytest`

## Required Structure

```text
backend_new/
  app/
    api/routes/
    core/
    db/
    models/
    schemas/
    services/
    main.py
  tests/
    integration/
    fixtures/
  scripts/
  piccolo_migrations/
  piccolo_conf.py
  pyproject.toml
  .env.example
```

## Routing Rules

Create dedicated FastAPI routers matching C# endpoint groups:
- `transactions` router for `/api/transactions`
- `categories` router for `/api/categories`
- `tags` router for `/api/tags`
- health route for `/health`

## Database and Migration Rules

- Keep schema compatibility with existing PostgreSQL schema.
- Use snake_case naming compatible with current DB tables/columns.
- Write Piccolo migrations using explicit raw SQL.
- Prefer additive/compatible changes only in migration phase 1.

## Development Workflow Per Iteration

1. Plan smallest parity slice.
2. Implement only that slice.
3. Run checks:
   - `uv run ruff format .`
   - `uv run ruff check .`
   - `uv run mypy .`
   - `uv run pytest -q`
4. Run integration suite against `backend_new` as the primary feedback loop.
5. Run the suite against C# only when authoring or extending test coverage.
6. Report:
   - files changed
   - test results
   - parity gaps
   - next slice

## Quality Gates

Do not proceed to next slice if any gate fails:
- lint/type/test failures
- test failures for implemented endpoints
- unauthorized changes outside allowed folders

## Done Criteria

A slice is complete only when:
- behavior matches baseline for covered scenarios;
- checks are green (`ruff`, `mypy`, `pytest`);
- no forbidden files were modified.

## Key References

- `/Users/akukharev/src/rnd/money-track/docs/prd/backend-migration-prd.md`
- `/Users/akukharev/src/rnd/money-track/docs/prd/backend-migration-test-strategy.md`
- `/Users/akukharev/src/rnd/money-track/docs/prd/backend-migration-agent-runbook.md`
