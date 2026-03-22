from __future__ import annotations

import asyncio
from dataclasses import dataclass

from fastapi import FastAPI
from fastapi.testclient import TestClient
from telegram import Bot

from app.api.routes.telegram import router as telegram_router
from app.core.config import get_settings


@dataclass
class _FakeApplication:
    bot: Bot
    update_queue: asyncio.Queue


@dataclass
class _FakeRuntime:
    application: _FakeApplication
    is_enabled: bool


def _build_test_app() -> FastAPI:
    test_app = FastAPI()
    test_app.include_router(telegram_router, prefix="/api/telegram")
    return test_app


def test_telegram_webhook_rejects_missing_secret(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres:password@127.0.0.1:5432/moneytrack")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "secret-value")
    get_settings.cache_clear()

    with TestClient(_build_test_app()) as client:
        response = client.post("/api/telegram/webhook", json={})
        assert response.status_code == 401


def test_telegram_webhook_rejects_when_runtime_disabled(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres:password@127.0.0.1:5432/moneytrack")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "secret-value")
    get_settings.cache_clear()

    with TestClient(_build_test_app()) as client:
        response = client.post(
            "/api/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "secret-value"},
            json={},
        )
        assert response.status_code == 503


def test_telegram_webhook_enqueues_update(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres:password@127.0.0.1:5432/moneytrack")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "secret-value")
    get_settings.cache_clear()

    fake_app = _FakeApplication(
        bot=Bot("123456:ABCDEF"),
        update_queue=asyncio.Queue(),
    )
    fake_runtime = _FakeRuntime(application=fake_app, is_enabled=True)

    payload = {
        "update_id": 1,
        "message": {
            "message_id": 15,
            "date": 1758301908,
            "from": {"id": 459885395, "is_bot": False, "first_name": "Aleksei"},
            "chat": {"id": 459885395, "type": "private"},
            "text": "Payment of AED 107.68 was done at Amazon",
        },
    }

    test_app = _build_test_app()
    with TestClient(test_app) as client:
        test_app.state.telegram_runtime = fake_runtime
        response = client.post(
            "/api/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "secret-value"},
            json=payload,
        )
        assert response.status_code == 200
        assert response.text == "OK"
        assert fake_app.update_queue.qsize() == 1
        delattr(test_app.state, "telegram_runtime")
