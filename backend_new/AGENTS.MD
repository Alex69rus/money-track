# AGENTS.MD - backend_new

Rules for AI agents working in `backend_new`.

## Non-Negotiables

- Edit only `./backend_new` unless explicitly requested.
- Preserve existing API behavior unless a change is explicitly requested.
- Keep `/api/**` and `/health` contracts stable.
- A slice is done only when checks are green and changed scope is fully verified.

## Stack and Standards

- Python `3.13`, `uv` for commands.
- API: `FastAPI` + `uvicorn`.
- ORM: `Piccolo` for runtime CRUD/query logic.
- Migrations: Piccolo forward migrations.
- Validation: `Pydantic` + centralized settings in `app/core/config.py`.
- Quality tools: `ruff`, `mypy`, `pytest`.
- Typing: avoid `Any` in runtime service/query contracts.
- Runtime API code uses async I/O by default.
- Keep transaction tags as PostgreSQL arrays and use standard foreign keys.
- For caught exceptions, log at error level with `exc_info=True` and include the exception.

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
  piccolo_migrations/
  piccolo_conf.py
  pyproject.toml
```

## Routing

- `/api/transactions` -> `transactions` router
- `/api/categories` -> `categories` router
- `/api/tags` -> `tags` router
- `/health` -> health route

## Operational Guardrails

- Before integration tests, poll `GET /health` with timeout; never use fixed sleep.
- Triage failures before edits: `connectivity | sandbox | auth | contract`.
- Use explicit env contract in run commands: `BASE_URL`, `TEST_DATABASE_URL`, optional `PRODUCTION_BASE_URL`.
- Runtime app code in `backend_new/app/**` must use Piccolo ORM only:
  - no `asyncpg` imports in runtime paths
  - use normal Piccolo query builders for CRUD and simple aggregates; where Piccolo cannot express a required database aggregate (for example, PostgreSQL array `UNNEST` or a window aggregate), use `Entity.raw()` only with fixed, parameterized SQL and never interpolate user input
  - prefer typed query/object access
- Attach filters and pagination to DB query before execution.
- Never perform complex calculations across many records in application memory. Put filtering, grouping, sums, counts, shares, and ordering in the database query.
- Use `Entity.objects()` when fetching rows as entities. Use `Entity.select()` only for an intentionally limited field projection or database aggregate; do not select a full entity and then cast dictionary rows back into entity-like types.
- Preserve error contract with explicit handlers where needed.
- When tests add third-party imports, update `pyproject.toml` dependencies in the same change.
- Use one canonical engine factory shared by runtime and `piccolo_conf.py`.

## Iteration Workflow

1. Plan the smallest safe slice.
2. Implement only that slice.
3. Run checks:
   - `uv run ruff format .`
   - `uv run ruff check .`
   - `uv run mypy .`
   - `uv run pytest -q`
4. Report changed files, test results, and remaining risks.
5. Append concise takeaways/prevention rule to `./backend_new/GUARDRAILS.md` when relevant.

## Quality Gates

- Stop if lint/type/test fails.
- Stop if implemented endpoint tests fail.
- Stop if files outside allowed scope changed.

## Key References

- `./backend_new/GUARDRAILS.md`
- `./backend_new/tests/AGENTS.md`
- `./docs/deployment.md`
