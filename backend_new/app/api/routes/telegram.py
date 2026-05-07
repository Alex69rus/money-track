from __future__ import annotations

import hmac
import logging
from collections.abc import Mapping
from typing import cast

from fastapi import APIRouter, Header, HTTPException, Request, status
from fastapi.responses import PlainTextResponse
from opentelemetry import trace
from telegram import Update

from app.core.config import get_settings
from app.services.telegram_runtime import TelegramBotRuntime

logger = logging.getLogger(__name__)
tracer = trace.get_tracer("money-track-backend-new.telegram-webhook")

router = APIRouter()


def _is_webhook_secret_valid(received_secret: str | None) -> bool:
    expected_secret = get_settings().telegram_webhook_secret
    if not expected_secret:
        return False
    return hmac.compare_digest(expected_secret, received_secret or "")


@router.post("/webhook", response_class=PlainTextResponse)
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token"),
) -> PlainTextResponse:
    with tracer.start_as_current_span("telegram.webhook.receive"):
        logger.info("Telegram webhook request received")
        if not _is_webhook_secret_valid(x_telegram_bot_api_secret_token):
            logger.error(
                "Telegram webhook rejected: invalid secret token (header present=%s)",
                x_telegram_bot_api_secret_token is not None,
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Telegram webhook secret",
            )

        runtime = cast(TelegramBotRuntime | None, getattr(request.app.state, "telegram_runtime", None))
        if runtime is None or not runtime.is_enabled:
            logger.error("Telegram webhook rejected: runtime is not enabled")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Telegram runtime is not enabled",
            )

        body = await request.json()
        if not isinstance(body, Mapping):
            logger.error("Telegram webhook rejected: payload is not a JSON object")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid update payload")
        parsed_update = Update.de_json(dict(body), runtime.application.bot)
        if parsed_update is None:
            logger.error("Telegram webhook rejected: failed to parse update payload")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid update payload")

        await runtime.application.update_queue.put(parsed_update)
        return PlainTextResponse("OK")
