# Money Track

Personal money tracking application with Telegram bot integration.

## Architecture

- **Backend**: Python FastAPI (`backend_new`) with Piccolo ORM and PostgreSQL
- **Production frontend**: React + TypeScript + Vite in `frontend_new/`
- **Legacy frontend**: `frontend/` is retained as a rollback-only backup and is not the production deployment target
- **Database**: PostgreSQL
- **Automation / AI**: n8n workflows
- **Containerization**: Docker Compose

## Quick Start

1. Clone the repository.
2. Start all services:

```bash
docker-compose up --build
```

3. Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **n8n**: http://localhost:5678

## Local Development

### Prerequisites
- Docker and Docker Compose
- Python 3.13
- `uv`
- Node.js 18+

### Backend (`backend_new`)

```bash
cd backend_new
uv sync --group dev
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend (`frontend_new`)

```bash
cd frontend_new
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

### Real Telegram Debugging (single domain for FE + BE)

Use this flow to debug the Telegram Web App against local code while keeping one public domain for both frontend and backend.

1. Make frontend API same-origin through nginx proxy:

```env
# frontend_new/.env
VITE_API_BASE_URL=
```

2. Set backend Telegram URLs to the same public domain:

```env
# backend_new/.env
TELEGRAM_WEB_APP_URL=https://delicate-halibut-tolerant.ngrok-free.app
TELEGRAM_WEBHOOK_URL=https://delicate-halibut-tolerant.ngrok-free.app/api/telegram/webhook
```

3. Run backend and frontend locally (commands above).
4. Run nginx proxy container (routes `/api/*` -> backend `:8000`, `/` -> frontend `:4173`):

```bash
docker compose -f compose.dev.yml up -d
```

5. Expose nginx via ngrok:

```bash
ngrok http 8080 --url delicate-halibut-tolerant.ngrok-free.app
```

If UI shows fallback mode, verify `frontend_new/.env` still has empty `VITE_API_BASE_URL` and restart Vite.


## Health Check

- Backend health: http://localhost:8000/health
- Expected response: `OK`

## Project Structure

```text
money-track/
├── backend_new/              # Python FastAPI backend
│   ├── app/                  # API routes, services, schemas, core
│   ├── tests/                # Integration and fixtures
│   ├── piccolo_migrations/   # Forward migrations
│   └── pyproject.toml
├── frontend/                 # Frozen legacy rollback source
├── frontend_new/             # Shipped Vite redesign
├── n8n/                      # n8n workflows (outdated)
├── docs/                     # ADRs, deployment, workflow
└── docker-compose.yml        # Local development setup
```
