# backend_new

Python 3.13 backend scaffold for Money Track migration.

## Quick start

1. Create virtual environment and install deps:

```bash
uv sync --group dev
```

2. Run API:

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

3. Run checks:

```bash
uv run ruff format .
uv run ruff check .
uv run mypy .
uv run pytest -q
```
