FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app ./app
COPY piccolo_conf.py ./
COPY piccolo_migrations ./piccolo_migrations

EXPOSE 8000

CMD ["sh", "-c", "uv run --no-dev piccolo migrations forwards all && uv run --no-dev uvicorn app.main:app --host 0.0.0.0 --port 8000 --ws auto"]
