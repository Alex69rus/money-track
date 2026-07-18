# Development Conventions

## Core rules

1. Keep solutions simple and explicit.
2. Use framework defaults unless a measured product need requires otherwise.
3. Implement only approved product scope.

## Backend

- Group FastAPI routes by domain under `backend_new/app/api/routes`.
- Use Piccolo for runtime database access, Pydantic for validation, and async methods by default.
- Log caught exceptions at error level with `exc_info=True` and the exception object.
- Keep migrations under `backend_new/piccolo_migrations` and use PostgreSQL arrays for transaction tags.

## Frontend

- `frontend_new/` is the production frontend. It uses strict TypeScript, React function components, Vite, Tailwind v4, shadcn/ui, and Fetch-based adapters. Its scoped `AGENTS.MD` is authoritative for frontend work.
- Keep simple component-local state and hooks. Do not use axios, Redux, or a Context state store.
- Use only Vite-prefixed environment variables in `frontend_new`; API access goes through its typed services/hooks.

## Testing and style

- Prefer deterministic tests that protect user-visible behavior.
- Keep frontend tests under `frontend_new/tests/` and backend tests under `backend_new/tests/`.
- Use `ruff format` for Python and Prettier-compatible formatting for React/TypeScript.
- Keep comments for non-obvious business rules only.

## Never do

- Add microservices, caching, or abstractions without a proven need.
- Hard-code runtime configuration.
