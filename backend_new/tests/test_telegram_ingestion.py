from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal

from telegram import Bot, InlineKeyboardMarkup, Update

from app.schemas.responses import TransactionResponse
from app.services.category_suggestion import CategoryActionOption, CategorySuggestionResult
from app.services.sms_parser import ParsedSmsTransaction
from app.services.telegram_callback_data import CategoryCallbackPayload
from app.services.telegram_ingestion import handle_telegram_update
from app.services.transaction_category_actions import CategoryActionResult


@dataclass
class _FakeBot:
    sent_messages: list[dict[str, object]] = field(default_factory=list)
    answered_callback_query_ids: list[str] = field(default_factory=list)

    async def send_message(
        self,
        *,
        chat_id: int,
        text: str,
        reply_to_message_id: int | None = None,
        reply_markup: InlineKeyboardMarkup | None = None,
    ) -> None:
        self.sent_messages.append(
            {
                "chat_id": chat_id,
                "text": text,
                "reply_to_message_id": reply_to_message_id,
                "reply_markup": reply_markup,
            }
        )

    async def answer_callback_query(
        self,
        *,
        callback_query_id: str,
    ) -> None:
        self.answered_callback_query_ids.append(callback_query_id)


@dataclass
class _FakeContext:
    bot: _FakeBot


def _build_message_update(
    *,
    from_id: int,
    edited: bool = False,
) -> Update:
    message_payload: dict[str, object] = {
        "message_id": 15,
        "date": 1758301908,
        "from": {"id": from_id, "is_bot": False, "first_name": "Aleksei"},
        "chat": {"id": from_id, "type": "private"},
        "text": "Payment of AED 107.68 was done at Amazon",
    }
    payload: dict[str, object] = {"update_id": 1}
    if edited:
        edited_payload = dict(message_payload)
        edited_payload["edit_date"] = 1758302000
        payload["edited_message"] = edited_payload
    else:
        payload["message"] = message_payload

    update = Update.de_json(payload, Bot("123456:ABCDEF"))
    assert update is not None
    return update


def _build_callback_update(*, from_id: int, callback_data: str) -> Update:
    payload = {
        "update_id": 2,
        "callback_query": {
            "id": "cbq-1",
            "from": {"id": from_id, "is_bot": False, "first_name": "Aleksei"},
            "chat_instance": "ci-1",
            "data": callback_data,
            "message": {
                "message_id": 30,
                "date": 1758301908,
                "chat": {"id": from_id, "type": "private"},
                "text": "Saved",
            },
        },
    }
    update = Update.de_json(payload, Bot("123456:ABCDEF"))
    assert update is not None
    return update


def _sample_transaction(
    *,
    user_id: int,
    category_id: int | None = None,
) -> TransactionResponse:
    return TransactionResponse(
        id=1,
        userId=user_id,
        transactionDate=datetime(2025, 9, 19, 13, 38, 28, tzinfo=UTC),
        amount=107.68,
        note="Amazon",
        categoryId=category_id,
        tags=[],
        currency="AED",
        smsText="Payment of AED 107.68 was done at Amazon",
        messageId="15",
        createdAt=datetime(2025, 9, 19, 13, 38, 28, tzinfo=UTC),
        category=None,
    )


def test_telegram_ingestion_processes_any_user(monkeypatch) -> None:
    parser_calls = 0

    async def _parse(_: str):
        nonlocal parser_calls
        parser_calls += 1
        return None

    monkeypatch.setattr("app.services.telegram_ingestion.parse_sms_transaction", _parse)

    context = _FakeContext(bot=_FakeBot())
    update = _build_message_update(from_id=123)
    asyncio.run(handle_telegram_update(update, context))

    assert parser_calls == 1
    assert len(context.bot.sent_messages) == 1
    assert context.bot.sent_messages[0]["text"] == "Cannot parse the transaction"


def test_telegram_ingestion_sends_fallback_for_invalid_parse(monkeypatch) -> None:
    async def _parse(_: str):
        return None

    monkeypatch.setattr("app.services.telegram_ingestion.parse_sms_transaction", _parse)

    context = _FakeContext(bot=_FakeBot())
    update = _build_message_update(from_id=459885395)
    asyncio.run(handle_telegram_update(update, context))

    assert len(context.bot.sent_messages) == 1
    assert context.bot.sent_messages[0]["text"] == "Cannot parse the transaction"


def test_telegram_ingestion_creates_transaction_with_category_buttons(monkeypatch) -> None:
    async def _parse(_: str):
        return ParsedSmsTransaction(amount=Decimal("107.68"), currency="AED", note="Amazon")

    async def _upsert(**kwargs):
        return _sample_transaction(user_id=int(kwargs["user_id"]))

    async def _suggest(**_kwargs):
        return CategorySuggestionResult(
            applied_category_id=10,
            applied_category_name="Groceries",
            top3_options=[
                CategoryActionOption(category_id=10, category_name="Groceries"),
                CategoryActionOption(category_id=11, category_name="Eating Out"),
                CategoryActionOption(category_id=12, category_name="Home"),
            ],
        )

    monkeypatch.setattr("app.services.telegram_ingestion.parse_sms_transaction", _parse)
    monkeypatch.setattr("app.services.telegram_ingestion.upsert_transaction_by_message_id", _upsert)
    monkeypatch.setattr("app.services.telegram_ingestion.suggest_and_apply_transaction_category", _suggest)

    context = _FakeContext(bot=_FakeBot())
    update = _build_message_update(from_id=459885395)
    asyncio.run(handle_telegram_update(update, context))

    assert len(context.bot.sent_messages) == 1
    sent = context.bot.sent_messages[0]
    sent_text = str(sent["text"])
    assert "Transaction was saved." in sent_text
    assert "Amount: 107.68" in sent_text
    assert "Category: Groceries" in sent_text

    reply_markup = sent["reply_markup"]
    assert isinstance(reply_markup, InlineKeyboardMarkup)
    buttons = [button for row in reply_markup.inline_keyboard for button in row]
    assert len(buttons) == 4
    assert str(buttons[-1].text) == "Remove category"


def test_telegram_ingestion_edited_message_skips_llm_when_category_exists(monkeypatch) -> None:
    async def _parse(_: str):
        return ParsedSmsTransaction(amount=Decimal("107.68"), currency="AED", note="Amazon")

    async def _upsert(**kwargs):
        return _sample_transaction(user_id=int(kwargs["user_id"]), category_id=33)

    suggest_calls = 0
    default_calls = 0

    async def _suggest(**_kwargs):
        nonlocal suggest_calls
        suggest_calls += 1
        return CategorySuggestionResult(
            applied_category_id=None,
            applied_category_name=None,
            top3_options=[],
        )

    async def _default(**_kwargs):
        nonlocal default_calls
        default_calls += 1
        return CategorySuggestionResult(
            applied_category_id=33,
            applied_category_name="Internet-Services",
            top3_options=[
                CategoryActionOption(category_id=33, category_name="Internet-Services"),
                CategoryActionOption(category_id=11, category_name="Eating Out"),
                CategoryActionOption(category_id=12, category_name="Home"),
            ],
        )

    monkeypatch.setattr("app.services.telegram_ingestion.parse_sms_transaction", _parse)
    monkeypatch.setattr("app.services.telegram_ingestion.upsert_transaction_by_message_id", _upsert)
    monkeypatch.setattr("app.services.telegram_ingestion.suggest_and_apply_transaction_category", _suggest)
    monkeypatch.setattr("app.services.telegram_ingestion.build_default_category_actions", _default)

    context = _FakeContext(bot=_FakeBot())
    update = _build_message_update(from_id=459885395, edited=True)
    asyncio.run(handle_telegram_update(update, context))

    assert suggest_calls == 0
    assert default_calls == 1
    assert len(context.bot.sent_messages) == 1
    sent_text = str(context.bot.sent_messages[0]["text"])
    assert "Category: Internet-Services" in sent_text


def test_telegram_ingestion_callback_query_updates_category(monkeypatch) -> None:
    payload = CategoryCallbackPayload(
        user_id=459885395,
        transaction_id=15,
        action="s",
        category_id=11,
    )

    monkeypatch.setattr(
        "app.services.telegram_ingestion.decode_category_callback_data",
        lambda _value: payload,
    )

    async def _apply(**_kwargs):
        return CategoryActionResult(success=True, message="Category updated to: Groceries")

    monkeypatch.setattr("app.services.telegram_ingestion.apply_category_callback_action", _apply)

    context = _FakeContext(bot=_FakeBot())
    update = _build_callback_update(from_id=459885395, callback_data="cs1:data")
    asyncio.run(handle_telegram_update(update, context))

    assert len(context.bot.sent_messages) == 1
    assert context.bot.sent_messages[0]["text"] == "Category updated to: Groceries"
    assert context.bot.answered_callback_query_ids == ["cbq-1"]


def test_telegram_ingestion_callback_query_invalid_payload(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.telegram_ingestion.decode_category_callback_data",
        lambda _value: None,
    )

    context = _FakeContext(bot=_FakeBot())
    update = _build_callback_update(from_id=459885395, callback_data="bad")
    asyncio.run(handle_telegram_update(update, context))

    assert len(context.bot.sent_messages) == 1
    assert context.bot.sent_messages[0]["text"] == "Could not update category. Please try again."
    assert context.bot.answered_callback_query_ids == ["cbq-1"]
