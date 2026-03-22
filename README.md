# Money Track

Personal money tracking application with Telegram bot integration.

## Architecture

- **Backend**: Python FastAPI (`backend_new`) with Piccolo ORM and PostgreSQL
- **Frontend**: React + TypeScript + Material-UI
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

### Backend

```bash
cd backend_new
uv sync --group dev
ENVIRONMENT=Development DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/moneytrack TELEGRAM_BOT_TOKEN=test-token uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend

```bash
cd frontend
REACT_APP_API_URL=http://localhost:8000 npm start
```

### ngrok for Webhook Testing

To test Instagram webhooks locally:

```bash
ngrok http 8000 --url delicate-halibut-tolerant.ngrok-free.app
```


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
├── frontend/                 # React TypeScript app
├── n8n/                      # n8n workflows
├── docs/                     # ADRs, deployment, workflow
└── docker-compose.yml        # Local development setup
```
