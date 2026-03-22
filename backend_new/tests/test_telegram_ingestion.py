from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal

from telegram import Bot, Update

from app.schemas.responses import TransactionResponse
from app.services.sms_parser import ParsedSmsTransaction
from app.services.telegram_ingestion import handle_telegram_update


@dataclass
class _FakeBot:
    sent_messages: list[dict[str, object]] = field(default_factory=list)

    async def send_message(
        self,
        *,
        chat_id: int,
        text: str,
        reply_to_message_id: int,
    ) -> None:
        self.sent_messages.append(
            {
                "chat_id": chat_id,
                "text": text,
                "reply_to_message_id": reply_to_message_id,
            }
        )


@dataclass
class _FakeContext:
    bot: _FakeBot


def _build_update(
    *, from_id: int, reply_to_message_id: int | None = None, edited: bool = False
) -> Update:
    message_payload: dict[str, object] = {
        "message_id": 15,
        "date": 1758301908,
        "from": {"id": from_id, "is_bot": False, "first_name": "Aleksei"},
        "chat": {"id": from_id, "type": "private"},
        "text": "Payment of AED 107.68 was done at Amazon",
    }
    if reply_to_message_id is not None:
        message_payload["reply_to_message"] = {
            "message_id": reply_to_message_id,
            "date": 1758301800,
            "from": {"id": from_id, "is_bot": False, "first_name": "Aleksei"},
            "chat": {"id": from_id, "type": "private"},
            "text": "Older message",
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


def _sample_transaction(note: str) -> TransactionResponse:
    return TransactionResponse(
        id=1,
        userId=459885395,
        transactionDate=datetime(2025, 9, 19, 13, 38, 28, tzinfo=UTC),
        amount=107.68,
        note=note,
        categoryId=None,
        tags=[],
        currency="AED",
        smsText="Payment of AED 107.68 was done at Amazon",
        messageId="15",
        createdAt=datetime(2025, 9, 19, 13, 38, 28, tzinfo=UTC),
        category=None,
    )


def test_telegram_ingestion_ignores_disallowed_user(monkeypatch) -> None:
    parser_called = False

    async def _parse(_: str):
        nonlocal parser_called
        parser_called = True
        return None

    monkeypatch.setattr("app.services.telegram_ingestion.parse_sms_transaction", _parse)

    context = _FakeContext(bot=_FakeBot())
    update = _build_update(from_id=123)
    asyncio.run(handle_telegram_update(update, context))

    assert parser_called is False
    assert context.bot.sent_messages == []


def test_telegram_ingestion_sends_fallback_for_invalid_parse(monkeypatch) -> None:
    async def _parse(_: str):
        return None

    monkeypatch.setattr("app.services.telegram_ingestion.parse_sms_transaction", _parse)

    context = _FakeContext(bot=_FakeBot())
    update = _build_update(from_id=459885395)
    asyncio.run(handle_telegram_update(update, context))

    assert len(context.bot.sent_messages) == 1
    assert context.bot.sent_messages[0]["text"] == "Cannot parse the transaction"


def test_telegram_ingestion_creates_transaction(monkeypatch) -> None:
    async def _parse(_: str):
        return ParsedSmsTransaction(amount=Decimal("107.68"), currency="AED", note="Amazon")

    async def _upsert(**_kwargs):
        return _sample_transaction("Amazon")

    monkeypatch.setattr("app.services.telegram_ingestion.parse_sms_transaction", _parse)
    monkeypatch.setattr("app.services.telegram_ingestion.upsert_transaction_by_message_id", _upsert)

    context = _FakeContext(bot=_FakeBot())
    update = _build_update(from_id=459885395)
    asyncio.run(handle_telegram_update(update, context))

    assert len(context.bot.sent_messages) == 1
    assert "Transaction was saved." in str(context.bot.sent_messages[0]["text"])


def test_telegram_ingestion_edited_message_uses_same_upsert_path(monkeypatch) -> None:
    async def _parse(_: str):
        return ParsedSmsTransaction(amount=Decimal("107.68"), currency="AED", note="Amazon")

    upsert_calls: list[dict[str, object]] = []

    async def _upsert(**kwargs):
        upsert_calls.append(kwargs)
        return _sample_transaction("Amazon")

    monkeypatch.setattr("app.services.telegram_ingestion.parse_sms_transaction", _parse)
    monkeypatch.setattr("app.services.telegram_ingestion.upsert_transaction_by_message_id", _upsert)

    context = _FakeContext(bot=_FakeBot())
    update = _build_update(from_id=459885395, edited=True)
    asyncio.run(handle_telegram_update(update, context))

    assert len(context.bot.sent_messages) == 1
    assert "Transaction was saved." in str(context.bot.sent_messages[0]["text"])
    assert len(upsert_calls) == 1
    assert upsert_calls[0]["message_id"] == "15"
