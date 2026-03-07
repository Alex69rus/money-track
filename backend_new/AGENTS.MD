# AGENTS.MD - backend_new

Rules for AI agents implementing Python backend migration in this folder.

## Non-Negotiables

- Mission: build `./backend_new` with behavior parity to `./backend`.
- Edit only `./backend_new` unless explicitly requested.
- Do not modify `./backend` or `./frontend`.
- Preserve API contract parity (status codes, payloads, validation behavior).
- A slice is done only when parity for covered scenarios is confirmed, checks are green, no forbidden files changed, and iteration is fully marked done in `./docs/tasklist.md`.

## Stack and Standards

- Python `3.13`, local `.venv`, `uv` for commands.
- API: `FastAPI` + `uvicorn`.
- ORM: `Piccolo` for runtime CRUD/query logic.
- Migrations: Piccolo raw SQL, forward-only.
- Validation: `Pydantic`; config via one `pydantic_settings` object with `.env` support.
- Quality tools: `ruff`, `mypy`, `pytest`.
- Typing: no `Any` in service/query contracts, no `dict[str, Any]` in runtime paths; use typed schema/entity models.

## Required Layout

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

## Routing

- `/api/transactions` -> `transactions` router
- `/api/categories` -> `categories` router
- `/api/tags` -> `tags` router
- `/health` -> health route

## Operational Guardrails

- Before integration tests, wait for readiness by polling `GET /health` with timeout; never use fixed sleep.
- Triage failures before edits: `connectivity | sandbox | auth | contract`.
- Use explicit env contract in run commands: `BASE_URL`, `TEST_DATABASE_URL`, optional `PRODUCTION_BASE_URL`.
- Runtime app code in `backend_new/app/**` must use Piccolo ORM only:
  - no `asyncpg` imports
  - no direct SQL strings
  - prefer `.objects()` entity fetches
- Attach filters and pagination to DB query before execution; never load-all then filter in Python.
- Preserve baseline error contract; implement explicit 401/500 handlers with `{error, message}` payload shape.
- When tests add third-party imports, update `pyproject.toml` dependencies in the same change.
- Use one canonical engine factory shared by runtime and `piccolo_conf.py`.

## Iteration Workflow

1. Plan the smallest parity slice.
2. Implement only that slice.
3. Run checks:
   - `uv run ruff format .`
   - `uv run ruff check .`
   - `uv run mypy .`
   - `uv run pytest -q`
4. Run integration suite against `backend_new` as primary feedback.
5. Run suite against C# only when authoring/extending tests.
6. Report: changed files, test results, parity gaps, next slice.
7. Append concise takeaways/exploration/prevention rule to `./backend_new/GUARDRAILS.md`.

## Quality Gates

- Stop if lint/type/test fails.
- Stop if implemented endpoint tests fail.
- Stop if files outside allowed scope changed.

## Key References

- `./docs/prd/backend-migration-prd.md`
- `./docs/prd/backend-migration-test-strategy.md`
- `./docs/prd/backend-migration-agent-runbook.md`
- `./backend_new/GUARDRAILS.md`
