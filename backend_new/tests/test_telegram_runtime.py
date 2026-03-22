from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

from app.core.config import get_settings
from app.services.telegram_runtime import TelegramBotRuntime


@dataclass
class _FakeBot:
    webhook_calls: list[dict[str, object]] = field(default_factory=list)

    async def set_webhook(
        self,
        *,
        url: str,
        allowed_updates: list[str],
        secret_token: str,
    ) -> None:
        self.webhook_calls.append(
            {
                "url": url,
                "allowed_updates": allowed_updates,
                "secret_token": secret_token,
            }
        )


@dataclass
class _FakeApplication:
    bot: _FakeBot = field(default_factory=_FakeBot)
    handlers: list[object] = field(default_factory=list)
    initialized: bool = False
    started: bool = False
    stopped: bool = False
    shutdown_called: bool = False

    def add_handler(self, handler: object) -> None:
        self.handlers.append(handler)

    async def initialize(self) -> None:
        self.initialized = True

    async def start(self) -> None:
        self.started = True

    async def stop(self) -> None:
        self.stopped = True

    async def shutdown(self) -> None:
        self.shutdown_called = True


@dataclass
class _FakeBuilder:
    app: _FakeApplication

    def token(self, _value: str) -> _FakeBuilder:
        return self

    def updater(self, _value) -> _FakeBuilder:
        return self

    def build(self) -> _FakeApplication:
        return self.app


def test_telegram_runtime_registers_webhook(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres:password@127.0.0.1:5432/moneytrack")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_URL", "https://money-track.org/api/telegram/webhook")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "secret-value")
    get_settings.cache_clear()

    fake_application = _FakeApplication()
    fake_builder = _FakeBuilder(fake_application)
    monkeypatch.setattr(
        "app.services.telegram_runtime.Application.builder",
        lambda: fake_builder,
    )

    runtime = TelegramBotRuntime()
    asyncio.run(runtime.start())

    assert fake_application.initialized is True
    assert fake_application.started is True
    assert len(fake_application.handlers) == 1
    assert fake_application.bot.webhook_calls == [
        {
            "url": "https://money-track.org/api/telegram/webhook",
            "allowed_updates": ["message", "edited_message"],
            "secret_token": "secret-value",
        }
    ]

    asyncio.run(runtime.stop())
    assert fake_application.stopped is True
    assert fake_application.shutdown_called is True
