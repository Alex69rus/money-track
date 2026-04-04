# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Agent Guide Routing

Read this root guide first, then load additional scoped guides based on task location:

- `backend_new/AGENTS.MD`:
  - Read before any backend implementation/refactor under `backend_new/**`.
  - Read before changing backend runtime behavior, API contracts, DB queries, migrations, or deployment-related backend config.
- `backend_new/tests/AGENTS.md`:
  - Read before creating/updating/running backend tests in `backend_new/tests/**`.
  - Read before running integration/e2e checks that require API startup, readiness polling, `BASE_URL`/`TEST_DATABASE_URL`, or LLM e2e envs (`RUN_LLM_E2E`, `OPENAI_API_KEY`).
- `frontend_new/AGENTS.MD`:
  - Read before any frontend redesign implementation under `frontend_new/**`.
  - Read before touching Tailwind v4, shadcn/ui composition, Telegram Mini App lifecycle/auth handling, or FE-to-BE API contract changes driven by redesign.

If multiple guides apply, follow the most specific scoped guide for that area in addition to this root guide.

## Project Overview

Money Track is a Telegram bot and web app for personal money tracking. The system processes bank SMS messages through n8n workflows and provides a React web interface for transaction management and analytics.

## Architecture Overview

**System Components:**
- **Python FastAPI backend**: Transaction CRUD, read APIs, SMS parsing and AI chat (existing, external) in `backend_new`
- **React + TypeScript frontend**: Legacy app in `frontend/` (frozen) and redesign app in `frontend_new/`
- **PostgreSQL**: Shared database between n8n and backend API
- **Telegram Web App**: Browser-based interface accessed via Telegram

**Key Architectural Decisions:**
- Monolithic Python backend (`backend_new`)
- No caching layer - direct database queries only
- Keep abstractions minimal and explicit
- Environment variables for all configuration

## Development Process

**Workflow Steps:**
1. **Plan -> Approve -> Implement -> Test -> Confirm -> Commit -> Next**
2. Always propose solution with code snippets before implementing
3. Update progress in `docs/tasklist.md` after each iteration
4. Wait for explicit approval before moving to next iteration

## Local Testing

**Backend Testing:**
- **Development Mode**: Run backend with `ENVIRONMENT=Development` to bypass Telegram authentication
- **Backend Command**: `cd backend_new && ENVIRONMENT=Development DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/moneytrack TELEGRAM_BOT_TOKEN=test-token uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`
- **Database**: Uses real PostgreSQL data, full API functionality available for testing
- **Verification**: Use `/health` and API integration tests in `backend_new/tests/**`

For frontend redesign setup and testing commands, use `frontend_new/AGENTS.MD`.

## Code Conventions

Follow `docs/conventions.md` strictly.

**Python Backend:**
- FastAPI routes grouped by domain (`transactions`, `categories`, `tags`, `health`)
- Piccolo ORM for runtime DB access
- Async methods by default
- Logging at info/error level only
- If you catch an exception, always log it with `exc_info=True` and include the exception object in the message.
- Strong typing in schemas and query/service boundaries

**Database:**
- Piccolo migrations from `backend_new`
- PostgreSQL arrays for tags field
- Standard FK relationships

## Key Files Structure

```text
backend_new/
├── app/
│   ├── api/routes/
│   ├── services/
│   ├── schemas/
│   ├── db/
│   └── main.py
├── tests/
└── piccolo_migrations/
```

Frontend redesign structure and rules are defined in `frontend_new/AGENTS.MD`.

## Data Model

Core entities:
- **Transactions**: Parsed SMS data with tags array, category FK, `user_id` as BIGINT (Telegram user ID)
- **Categories**: Predefined global categories

Currency and frontend behavior decisions: see `frontend_new/docs/decisions.md` for redesign scope.  
Authentication: Telegram Web App initData validation  
Note: No separate Users table - `user_id` stores Telegram user ID directly.

## Never Do

**Backend:**
- Add microservices or complex architecture
- Add unnecessary abstractions or repository patterns
- Implement caching solutions without a proven need
- Use `/tmp` for temporary files; use files under the current working directory

- Modify frozen legacy frontend in `frontend/**` unless explicitly requested.

## Always Do

**Backend:**
- Use async/await for API operations
- Implement basic error handling and logging
- Keep DB access on Piccolo ORM in runtime code
