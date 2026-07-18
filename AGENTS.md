# AGENTS.md

## Guide Routing

Read this guide first, then load the scoped guide that owns the work:

- `backend_new/AGENTS.MD`: backend implementation, API contracts, database queries, migrations, and backend deployment configuration.
- `backend_new/tests/AGENTS.md`: backend tests, API startup, readiness polling, `BASE_URL` / `TEST_DATABASE_URL`, and LLM E2E checks.
- `frontend_new/AGENTS.MD`: frontend implementation, Tailwind, shadcn/ui, Telegram Mini App behavior, and frontend/backend contract changes.

When work spans more than one area, read every applicable scoped guide and follow the most specific rule in addition to this one.

## Project Overview

Money Track is a Telegram-based personal money tracker. The FastAPI backend receives Telegram updates, parses bank SMS messages, and stores transactions in PostgreSQL; the Telegram Mini App provides transaction management and analytics.

## High-Level Architecture

- `backend_new/`: FastAPI application, Telegram ingestion and SMS parsing, database access, and product APIs.
- `frontend_new/`: production React + TypeScript Telegram Mini App.
- PostgreSQL: shared transactional data store.
- Telegram Web App: authenticated product surface using Telegram `initData`.

Keep the architecture monolithic and explicit. Use environment variables for runtime configuration, avoid unproven abstractions, and do not introduce caching without a demonstrated need.

## Repository Map

```text
backend_new/    Backend application and tests
frontend_new/   Production Telegram Mini App and tests
docs/           Product, architecture, deployment, and task documentation
nginx/          Reverse-proxy configuration
scripts/        Development and QA automation
```

Follow `docs/conventions.md` for repository-wide conventions.

## Work Tracking

- Use `docs/tasklist.md` only for approved multi-iteration batches that need decomposition, status tracking, or handoff.
- For an isolated defect or CI finding, keep evidence in the root `bugs_reports/` directory and record the resolution in the delivery handoff; do not create a task-list row.

## Bug Management

- Use the repository `bug-management` skill for reported bugs, regressions, UI/UX defects, smoke-test findings, or supplied screenshots, videos, and logs.
- Capture the issue before changing product code. Keep the tracking proportionate: a raw report is enough for a focused fix unless the user asks for a larger batch.

## Log papercuts

When you encounter small friction while working—a failed tool call, confusing
setup, flaky command, stale cache, misleading error, missing helper, or
non-obvious gotcha—record it in `PAPERCUTS.md`.

Create the file if it does not exist. Append one entry in this format:

## YYYY-MM-DD HH:MM — <model>

<What you were doing> → <what got in the way>. Include a possible cause or fix
when useful.

Log papercuts proactively when they occur, but do not interrupt the main task.
Do not add duplicate entries. Papercuts are minor workflow friction, distinct
from completed-work logs and real bugs or tracked issues.
