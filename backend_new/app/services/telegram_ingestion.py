from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes

from app.db.queries import upsert_transaction_by_message_id
from app.schemas.responses import TransactionResponse
from app.services.category_suggestion import (
    CategoryActionOption,
    CategorySuggestionResult,
    build_default_category_actions,
    suggest_and_apply_transaction_category,
)
from app.services.sms_parser import parse_sms_transaction
from app.services.telegram_callback_data import (
    ACTION_REMOVE,
    ACTION_SET,
    decode_category_callback_data,
    encode_category_callback_data,
)
from app.services.transaction_category_actions import (
    GENERIC_UPDATE_ERROR_TEXT,
    apply_category_callback_action,
)

logger = logging.getLogger(__name__)

UNPARSED_REPLY_TEXT = "Cannot parse the transaction"


@dataclass(frozen=True)
class NormalizedTelegramMessage:
    chat_id: int
    from_id: int
    message_date: int
    message_id: int
    message_text: str
    is_edited: bool


def _normalize_message_update(update: Update) -> NormalizedTelegramMessage | None:
    if update.edited_message is not None:
        selected_message = update.edited_message
        is_edited = True
    elif update.message is not None:
        selected_message = update.message
        is_edited = False
    else:
        return None

    if selected_message.from_user is None:
        return None
    if selected_message.message_id is None:
        return None
    if selected_message.date is None:
        return None
    if selected_message.chat is None:
        return None

    return NormalizedTelegramMessage(
        chat_id=selected_message.chat.id,
        from_id=selected_message.from_user.id,
        message_date=int(selected_message.date.timestamp()),
        message_id=selected_message.message_id,
        message_text=selected_message.text or "",
        is_edited=is_edited,
    )


async def _send_unparsed(bot: Bot, *, chat_id: int, reply_to_message_id: int) -> None:
    await bot.send_message(
        chat_id=chat_id,
        text=UNPARSED_REPLY_TEXT,
        reply_to_message_id=reply_to_message_id,
    )


def _build_category_keyboard(
    *,
    user_id: int,
    transaction_id: int,
    top3_options: list[CategoryActionOption],
) -> InlineKeyboardMarkup:
    top3_buttons = [
        InlineKeyboardButton(
            text=option.category_name,
            callback_data=encode_category_callback_data(
                user_id=user_id,
                transaction_id=transaction_id,
                action=ACTION_SET,
                category_id=option.category_id,
            ),
        )
        for option in top3_options
    ]
    remove_button = InlineKeyboardButton(
        text="Remove category",
        callback_data=encode_category_callback_data(
            user_id=user_id,
            transaction_id=transaction_id,
            action=ACTION_REMOVE,
            category_id=None,
        ),
    )
    keyboard_rows: list[list[InlineKeyboardButton]] = []
    if top3_buttons:
        keyboard_rows.append(top3_buttons)
    keyboard_rows.append([remove_button])
    return InlineKeyboardMarkup(keyboard_rows)


async def _send_create_reply(
    bot: Bot,
    *,
    chat_id: int,
    user_id: int,
    reply_to_message_id: int,
    transaction: TransactionResponse,
    suggestion: CategorySuggestionResult,
) -> None:
    note = transaction.note or ""
    formatted_amount = f"{transaction.amount:.2f}"
    category_name = suggestion.applied_category_name or "Not assigned"
    keyboard = _build_category_keyboard(
        user_id=user_id,
        transaction_id=transaction.id,
        top3_options=suggestion.top3_options,
    )
    text = (
        "Transaction was saved.\n"
        f"Date: {transaction.transactionDate.isoformat()}\n"
        f"Category: {category_name}\n"
        f"Amount: {formatted_amount}\n"
        f"Currency: {transaction.currency}\n"
        f"Note: {note}"
    )
    await bot.send_message(
        chat_id=chat_id,
        text=text,
        reply_to_message_id=reply_to_message_id,
        reply_markup=keyboard,
    )


async def _resolve_suggestion(
    *,
    normalized: NormalizedTelegramMessage,
    transaction: TransactionResponse,
) -> CategorySuggestionResult:
    if normalized.is_edited and transaction.categoryId is not None:
        return await build_default_category_actions(
            preferred_category_id=transaction.categoryId,
            amount=transaction.amount,
        )
    return await suggest_and_apply_transaction_category(
        user_id=normalized.from_id,
        transaction=transaction,
    )


async def _handle_message_update(
    *,
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    normalized = _normalize_message_update(update)
    if normalized is None:
        return

    parsed = await parse_sms_transaction(normalized.message_text)
    if parsed is None:
        await _send_unparsed(
            context.bot,
            chat_id=normalized.chat_id,
            reply_to_message_id=normalized.message_id,
        )
        return

    amount = parsed.amount
    currency = parsed.currency
    if amount is None or currency is None:
        await _send_unparsed(
            context.bot,
            chat_id=normalized.chat_id,
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
    suggestion = await _resolve_suggestion(normalized=normalized, transaction=created)

    await _send_create_reply(
        context.bot,
        chat_id=normalized.chat_id,
        user_id=normalized.from_id,
        reply_to_message_id=normalized.message_id,
        transaction=created,
        suggestion=suggestion,
    )


async def _handle_callback_query(
    *,
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
) -> None:
    callback_query = update.callback_query
    if callback_query is None:
        return
    if callback_query.from_user is None:
        return

    message = callback_query.message
    chat_id = message.chat.id if message is not None else callback_query.from_user.id
    try:
        callback_payload = decode_category_callback_data(callback_query.data or "")
        if callback_payload is None:
            await context.bot.send_message(chat_id=chat_id, text=GENERIC_UPDATE_ERROR_TEXT)
            return

        result = await apply_category_callback_action(
            actor_user_id=callback_query.from_user.id,
            payload=callback_payload,
        )
        await context.bot.send_message(chat_id=chat_id, text=result.message)
    except Exception as exc:
        logger.error("Failed to process Telegram callback query: %s", exc, exc_info=True)
        await context.bot.send_message(chat_id=chat_id, text=GENERIC_UPDATE_ERROR_TEXT)
    finally:
        callback_query_id = callback_query.id
        if callback_query_id is not None:
            try:
                await context.bot.answer_callback_query(callback_query_id=callback_query_id)
            except Exception as exc:
                logger.error("Failed to acknowledge Telegram callback query: %s", exc, exc_info=True)


async def handle_telegram_update(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not isinstance(update, Update):
        return

    try:
        if update.callback_query is not None:
            await _handle_callback_query(update=update, context=context)
            return
        await _handle_message_update(update=update, context=context)
    except Exception as exc:
        logger.error("Failed to process Telegram update: %s", exc, exc_info=True)
        normalized = _normalize_message_update(update)
        if normalized is None:
            return
        try:
            await _send_unparsed(
                context.bot,
                chat_id=normalized.chat_id,
                reply_to_message_id=normalized.message_id,
            )
        except Exception as send_exc:
            logger.error(
                "Failed to send fallback Telegram reply: %s",
                send_exc,
                exc_info=True,
            )
