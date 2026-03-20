# Development Conventions

These conventions implement the principles defined in `vision.md`. Follow these rules when generating code for Money Track.

## Core Rules

1. **KISS & YAGNI**: Write the simplest code that works.
2. **Framework Conventions**: Use FastAPI/Piccolo defaults for backend and React defaults for frontend unless there is a clear reason not to.
3. **MVP Focus**: Build only what is defined in `vision.md` usage scenarios.

## Python Backend Conventions

- **FastAPI routes**: Keep routes in `app/api/routes` and group by domain.
- **Piccolo ORM**: Use Piccolo for runtime DB access.
- **Validation**: Use Pydantic schemas.
- **Logging**: Use basic info/error logging.
- **Async by default**: Prefer async API and DB operations.
- **Minimal abstractions**: Avoid unnecessary layers.
- **Search API**: Keep transaction search case-insensitive over intended fields.

## React Frontend Conventions

- **TypeScript**: Required for all components and services.
- **Material-UI**: Use standard components with project theme tokens.
- **Function Components**: No class components.
- **Simple State**: `useState` / `useEffect` only.
- **API Calls**: Fetch in services/hooks; no axios.
- **Telegram Web App**: Use official SDK methods only.
- **Search UX**: Keep simple text search with debouncing.

## Database Conventions

- **PostgreSQL**: Standard types, arrays for tags.
- **Migrations**: Piccolo forward migrations in `backend_new/piccolo_migrations`.
- **Primary Keys**: Use BIGINT for numeric identifiers where applicable.
- **Foreign Keys**: Standard FK relationships.

## Testing Conventions

- Prefer practical integration coverage for backend API behavior.
- Keep tests deterministic with explicit setup/cleanup.
- For frontend, add tests where they materially reduce regression risk.

## Code Style

- **Auto-formatting**: `ruff format` for Python, Prettier for React.
- **Type safety**: Keep strict typing, avoid `Any` in runtime paths.
- **Comments**: Add only for non-obvious business logic.

## Architecture Adherence

- **Database-first persistence**: All data operations through Piccolo-backed services.
- **No caching layer by default**: Query PostgreSQL directly.
- **Environment Variables**: All runtime configuration via env vars.

## NEVER DO

- Introduce microservices without explicit product need.
- Add complex configuration systems for MVP scope.
- Add unnecessary abstraction layers.
- Optimize prematurely without measured bottlenecks.

## DO

- Keep methods simple and responsibilities clear.
- Use readable names for variables and methods.
- Implement baseline error handling.
- Keep API behavior documented in project docs.
