# Python Backend Scaffold Specification (`backend_new`)

## 1. Directory Structure

```text
backend_new/
  app/
    api/
      routes/
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
  README.md
  .env.example
```

## 2. Required Components

- ASGI app entrypoint with route registration.
- Config module for environment variables.
- DB session management with PostgreSQL.
- ORM models mapping existing schema exactly.
- Pydantic schemas aligned with current JSON payloads.
- Middleware for global exception handling.
- Auth service for Telegram init data validation.

## 3. Required Endpoint Modules

- `routes/health.py`
- `routes/transactions.py`
- `routes/categories.py`
- `routes/tags.py`

## 4. Testing Scaffold

- Shared fixtures for deterministic test dataset.
- Single integration test suite runnable against a target base URL.
- DB assertion helpers for post-condition checks.
- Optional helper script to run integration suite with explicit `BASE_URL`.

## 5. Configuration Keys (Minimum)

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `ENVIRONMENT` (`Development` should support test user bypass semantics parity)
- `API_HOST`
- `API_PORT`

## 6. Migration Guardrails

- Do not import from `/backend` runtime code.
- Do not modify `/backend` files.
- Keep table/column/index naming compatible with snake_case PostgreSQL schema.

## 7. Build/Run Expectations

- Local run should start API from `backend_new` only.
- Integration suite should run via `BASE_URL` and fail fast on mismatches.
- Primary migration feedback loop runs the suite against `backend_new`.
