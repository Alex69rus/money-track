from __future__ import annotations

import asyncio
import logging

from telegram import Bot, InlineKeyboardMarkup
from telegram.error import BadRequest, NetworkError, TelegramError

logger = logging.getLogger(__name__)


async def send_telegram_reply(
    bot: Bot,
    *,
    chat_id: int,
    text: str,
    reply_kind: str,
    reply_to_message_id: int | None = None,
    reply_markup: InlineKeyboardMarkup | None = None,
) -> bool:
    """Retry only transport failures; delivery failure never becomes parse failure."""
    for attempt in range(1, 4):
        try:
            await bot.send_message(
                chat_id=chat_id,
                text=text,
                reply_to_message_id=reply_to_message_id,
                reply_markup=reply_markup,
            )
            logger.info("Telegram reply delivered kind=%s attempt=%s", reply_kind, attempt)
            return True
        except TelegramError as exc:
            # BadRequest inherits NetworkError but a rejected payload won't heal
            # after a pause. Forbidden and RetryAfter also aren't transport retries.
            retry = isinstance(exc, NetworkError) and not isinstance(exc, BadRequest) and attempt < 3
            logger.error(
                "Telegram reply delivery failed kind=%s attempt=%s retry=%s error=%s",
                reply_kind,
                attempt,
                retry,
                exc,
                exc_info=True,
            )
            if not retry:
                return False
            await asyncio.sleep(1)
    return False
