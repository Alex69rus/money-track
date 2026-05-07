from __future__ import annotations

import logging
from typing import Any

from telegram import MenuButtonWebApp, Update, WebAppInfo
from telegram.ext import Application, TypeHandler

from app.core.config import get_settings
from app.services.telegram_ingestion import handle_telegram_update

logger = logging.getLogger(__name__)

ALLOWED_UPDATES = ["message", "edited_message", "callback_query"]


class TelegramBotRuntime:
    def __init__(self) -> None:
        self._application: Application[Any, Any, Any, Any, Any, Any] | None = None

    @property
    def application(self) -> Application[Any, Any, Any, Any, Any, Any]:
        if self._application is None:
            raise RuntimeError("Telegram runtime is not initialized")
        return self._application

    @property
    def is_enabled(self) -> bool:
        settings = get_settings()
        return bool(settings.telegram_webhook_url.strip())

    async def start(self) -> None:
        settings = get_settings()
        webhook_url = settings.telegram_webhook_url.strip()
        web_app_url = settings.telegram_web_app_url.strip()
        if not webhook_url:
            logger.info("Telegram runtime is disabled: TELEGRAM_WEBHOOK_URL is not configured")
            return
        if not settings.telegram_webhook_secret.strip():
            raise RuntimeError("TELEGRAM_WEBHOOK_SECRET must be configured when TELEGRAM_WEBHOOK_URL is set")

        application = Application.builder().token(settings.telegram_bot_token).updater(None).build()
        application.add_handler(TypeHandler(type=Update, callback=handle_telegram_update))
        await application.initialize()
        await application.start()
        await application.bot.set_webhook(
            url=webhook_url,
            allowed_updates=ALLOWED_UPDATES,
            secret_token=settings.telegram_webhook_secret,
        )
        if web_app_url:
            await application.bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(text="App", web_app=WebAppInfo(url=web_app_url))
            )
            logger.info("Telegram Web App menu button configured at %s", web_app_url)
        self._application = application
        logger.info("Telegram webhook registered at %s", webhook_url)

    async def stop(self) -> None:
        if self._application is None:
            return
        await self._application.stop()
        await self._application.shutdown()
        self._application = None
