# ADR-003: Project Structure

## Status
Accepted

## Context
We need a clear repository structure centered on the Python backend and React frontend.

## Decision
```text
money-track/
├── backend_new/               # Python FastAPI backend
│   ├── app/                   # API, services, schemas, DB/core
│   ├── tests/                 # Integration tests and fixtures
│   ├── piccolo_migrations/    # DB migrations
│   └── pyproject.toml
├── frontend/                  # React app
├── n8n/                       # Workflow definitions
├── docs/adr/                  # Architecture records
└── docker-compose.yml         # Local stack
```

## Rationale
- `backend_new` is the production backend.
- Backend internals are organized by behavior and responsibility.
- Frontend and workflow assets remain decoupled but colocated.

## Consequences
- Easier onboarding and navigation.
- Fewer ambiguous ownership boundaries.

## Date
2026-03-20
