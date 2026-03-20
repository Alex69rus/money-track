# backend_new

Production Python backend for Money Track.

## Stack

- Python 3.13
- FastAPI + Uvicorn
- Piccolo ORM + PostgreSQL
- Pydantic settings
- Ruff, mypy, pytest

## Quick Start

1. Install dependencies:

```bash
uv sync --group dev
```

2. Run API locally:

```bash
ENVIRONMENT=Development DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/moneytrack TELEGRAM_BOT_TOKEN=test-token uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

3. Run checks:

```bash
uv run ruff format .
uv run ruff check .
uv run mypy .
uv run pytest -q
```
