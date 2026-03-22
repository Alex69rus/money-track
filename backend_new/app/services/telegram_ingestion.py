from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from telegram import Bot, Update
from telegram.ext import ContextTypes

from app.db.queries import (
    upsert_transaction_by_message_id,
)
from app.schemas.responses import TransactionResponse
from app.services.sms_parser import parse_sms_transaction

logger = logging.getLogger(__name__)

ALLOWED_TELEGRAM_USER_ID = 459885395
UNPARSED_REPLY_TEXT = "Cannot parse the transaction"


@dataclass(frozen=True)
class NormalizedTelegramMessage:
    message_date: int
    message_id: int
    from_id: int
    message_text: str


def _normalize_update(update: Update) -> NormalizedTelegramMessage | None:
    edited_message = update.edited_message
    message = update.message
    if edited_message is None and message is None:
        return None

    selected_date = (
        edited_message.date
        if edited_message is not None and edited_message.edit_date is not None
        else message.date
        if message is not None
        else None
    )
    if selected_date is None:
        return None

    selected_message_id = (
        edited_message.message_id
        if edited_message is not None and edited_message.message_id is not None
        else message.message_id
        if message is not None
        else None
    )
    if selected_message_id is None:
        return None

    from_user = (
        edited_message.from_user
        if edited_message is not None and edited_message.from_user is not None
        else message.from_user
        if message is not None
        else None
    )
    if from_user is None:
        return None

    selected_text = (
        edited_message.text
        if edited_message is not None and edited_message.text and edited_message.text.strip()
        else message.text
        if message is not None and message.text is not None
        else ""
    )

    return NormalizedTelegramMessage(
        message_date=int(selected_date.timestamp()),
        message_id=selected_message_id,
        from_id=from_user.id,
        message_text=selected_text,
    )


async def _send_unparsed(bot: Bot, *, chat_id: int, reply_to_message_id: int) -> None:
    await bot.send_message(
        chat_id=chat_id,
        text=UNPARSED_REPLY_TEXT,
        reply_to_message_id=reply_to_message_id,
    )


async def _send_create_reply(
    bot: Bot,
    *,
    chat_id: int,
    reply_to_message_id: int,
    transaction: TransactionResponse,
) -> None:
    note = transaction.note or ""
    text = (
        "Transaction was saved.\n"
        f"Date: {transaction.transactionDate.isoformat()}\n"
        f"Amount: {transaction.amount}\n"
        f"Currency: {transaction.currency}\n"
        f"Note: {note}"
    )
    await bot.send_message(
        chat_id=chat_id,
        text=text,
        reply_to_message_id=reply_to_message_id,
    )


async def handle_telegram_update(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not isinstance(update, Update):
        return

    normalized = _normalize_update(update)
    if normalized is None:
        return
    if normalized.from_id != ALLOWED_TELEGRAM_USER_ID:
        return

    try:
        parsed = await parse_sms_transaction(normalized.message_text)
        if parsed is None:
            await _send_unparsed(
                context.bot,
                chat_id=normalized.from_id,
                reply_to_message_id=normalized.message_id,
            )
            return

        amount = parsed.amount
        currency = parsed.currency
        if amount is None or currency is None:
            await _send_unparsed(
                context.bot,
                chat_id=normalized.from_id,
                reply_to_message_id=normalized.message_id,
            )
            return

        created = await upsert_transaction_by_message_id(
            user_id=normalized.from_id,
            message_id=str(normalized.message_id),
            transaction_date=datetime.fromtimestamp(normalized.message_date, tz=UTC),
            amount=amount,
            currency=currency,
            note=parsed.note,
            sms_text=normalized.message_text,
        )
        await _send_create_reply(
            context.bot,
            chat_id=normalized.from_id,
            reply_to_message_id=normalized.message_id,
            transaction=created,
        )
    except Exception as exc:
        logger.error("Failed to process Telegram update: %s", exc, exc_info=True)
        try:
            await _send_unparsed(
                context.bot,
                chat_id=normalized.from_id,
                reply_to_message_id=normalized.message_id,
            )
        except Exception as send_exc:
            logger.error(
                "Failed to send fallback Telegram reply: %s",
                send_exc,
                exc_info=True,
            )
