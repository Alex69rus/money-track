# PRD: Backend Migration C# -> Python

## 1. Context

Current backend is implemented in .NET Minimal API under `/Users/akukharev/src/rnd/money-track/backend`.
The target is a new Python backend in `/Users/akukharev/src/rnd/money-track/backend_new` with behavior parity for existing frontend and n8n integrations.

## 2. Goal

Deliver Python backend with API and database behavior equivalent to current C# backend for MVP scope.

## 3. Non-Goals

- No frontend refactor.
- No business feature expansion.
- No schema redesign in phase 1.
- No performance optimization work unless parity is already achieved.

## 4. Scope (Phase 1)

- Health endpoint parity.
- Transaction endpoints parity:
  - `GET /api/transactions`
  - `POST /api/transactions`
  - `PUT /api/transactions/{id}`
  - `DELETE /api/transactions/{id}`
- Categories endpoint parity:
  - `GET /api/categories`
- Tags endpoint parity:
  - `GET /api/tags`
- Telegram auth behavior parity (including development bypass behavior).
- Database compatibility with existing PostgreSQL.

## 5. Hard Constraints

- Python backend location: `/Users/akukharev/src/rnd/money-track/backend_new`.
- C# backend location: `/Users/akukharev/src/rnd/money-track/backend` remains unchanged.
- Existing database schema remains backward compatible in phase 1.
- Integration suite is authored from C# behavior, then used as primary feedback loop for Python backend.
- Frontend should switch backend by URL only (no payload contract changes).

## 6. Required Python Stack

- Runtime: Python `3.13` with local `.venv`.
- Package/dependency/tool runner: `uv`.
- API framework: `FastAPI` + `uvicorn`.
- Routing rule: dedicated FastAPI router per C# Minimal API router group.
- ORM: `Piccolo`.
- Migrations: `Piccolo` migrations with raw SQL.
- Migration direction: fast-forward only; `run_backwards` implementation is not required.
- Validation: `Pydantic`.
- Config loading and validation: single `pydantic_settings`-based config object + `.env` file support.
- Lint/type checks: `mypy`.
- Formatter: `ruff` (formatter and code quality checks).
- Tests: `pytest`.

## 7. Functional Requirements

### FR-1 API Contract Parity

Python responses, status codes, and error shape must match existing behavior for all in-scope endpoints.

### FR-2 Filtering/Pagination Semantics

`GET /api/transactions` must preserve:
- Date range handling with inclusive end-of-day logic for `toDate`.
- `skip/take` default values and `hasMore` calculation.
- Amount/category/tag/text filters behavior.

### FR-3 Auth Semantics

- Development mode bypass with fixed user ID behavior.
- Non-development mode requires valid Telegram init data.
- Missing/invalid auth flows return equivalent unauthorized response.

### FR-4 Data Integrity Semantics

Preserve key constraints and behavior:
- Unique index on `(user_id, message_id)`.
- `tags` as PostgreSQL `text[]` semantics.
- FK delete behavior (`category_id -> SET NULL`).

### FR-5 Router Structure Parity

- Keep route organization aligned with baseline endpoint groups:
  - transactions router for `/api/transactions`
  - categories router for `/api/categories`
  - tags router for `/api/tags`

### FR-6 Migration Strategy

- Use Piccolo migration files with explicit raw SQL statements.
- Use forward-only migration flow for this migration project.

## 8. Non-Functional Requirements

- Clear observability: info/error logging only (aligned with current style).
- Deterministic test environment with reproducible fixtures.
- CI-friendly setup for agent-driven iterative execution.
- All project commands should be runnable through `uv`.

## 9. Acceptance Criteria

- Integration suite is green on C# during authoring/coverage stage.
- Same integration suite is green on `backend_new` during migration.
- No regressions in API contract for current frontend usage.
- No direct edits to `/backend` during Python implementation.
- Migration deliverables documented and reproducible from clean checkout.
- Toolchain and project setup follow section "Required Python Stack".

## 10. Risks

- Hidden behavior in DateTime/UTC conversion.
- Auth signature validation edge cases.
- ORM differences for arrays and query translation in Piccolo.
- Seeder behavior divergence.

## 11. Milestones

1. Baseline capture (contracts + fixtures + parity tests).
2. `backend_new` scaffold readiness.
3. Read endpoints parity.
4. Write endpoints parity.
5. Final parity run and cutover checklist.

## 12. Definition of Done

Migration is done when:
- `backend_new` satisfies all in-scope parity tests.
- Existing `backend` still compiles and remains unchanged.
- Cutover can be performed by configuration only.
- `backend_new` uses Python `3.13`, `uv`, FastAPI/uvicorn, Piccolo, Pydantic settings, mypy, ruff, and pytest as mandated.
