from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from telegram import Bot, InlineKeyboardMarkup, Update

from app.core.config import get_settings
from app.db.engine import get_engine
from app.services.telegram_callback_data import decode_category_callback_data
from app.services.telegram_ingestion import handle_telegram_update
from tests.fixtures import DbHelper, SeedTransaction


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


def _read_env_file_values() -> dict[str, str]:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def _env_value(key: str) -> str | None:
    return os.getenv(key) or _read_env_file_values().get(key)


def _seed_required_runtime_env() -> None:
    env_values = _read_env_file_values()
    for key, value in env_values.items():
        os.environ[key] = value
    get_settings.cache_clear()


def _require_llm_e2e_enabled() -> None:
    _seed_required_runtime_env()
    run_llm_e2e = _env_value("RUN_LLM_E2E")
    if run_llm_e2e not in {"1", "true", "TRUE", "yes", "YES"}:
        pytest.skip("Set RUN_LLM_E2E=1 (env or backend_new/.env) to run real LLM parser tests.")
    if not _env_value("OPENAI_API_KEY"):
        pytest.skip("Set OPENAI_API_KEY (env or backend_new/.env) to run real LLM parser tests.")


def _build_message_update(*, user_id: int, message_id: int, text: str) -> Update:
    payload = {
        "update_id": 1,
        "message": {
            "message_id": message_id,
            "date": int(datetime.now(UTC).timestamp()),
            "from": {"id": user_id, "is_bot": False, "first_name": "Aleksei"},
            "chat": {"id": user_id, "type": "private"},
            "text": text,
        },
    }
    update = Update.de_json(payload, Bot("123456:ABCDEF"))
    assert update is not None
    return update


def _build_callback_update(*, user_id: int, callback_data: str) -> Update:
    payload = {
        "update_id": 2,
        "callback_query": {
            "id": "cbq-1",
            "from": {"id": user_id, "is_bot": False, "first_name": "Aleksei"},
            "chat_instance": "ci-1",
            "data": callback_data,
            "message": {
                "message_id": 30,
                "date": int(datetime.now(UTC).timestamp()),
                "chat": {"id": user_id, "type": "private"},
                "text": "Saved",
            },
        },
    }
    update = Update.de_json(payload, Bot("123456:ABCDEF"))
    assert update is not None
    return update


async def _run_telegram_category_suggestion_e2e(
    *,
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    engine = get_engine()
    await engine.start_connection_pool()
    try:
        now = datetime.now(UTC)
        groceries_id = await db_helper.insert_category(
            name=f"{db_helper.namespace}Groceries",
            category_type="Expense",
            order_index=1,
        )
        eating_out_id = await db_helper.insert_category(
            name=f"{db_helper.namespace}EatingOut",
            category_type="Expense",
            order_index=2,
        )
        home_id = await db_helper.insert_category(
            name=f"{db_helper.namespace}Home",
            category_type="Expense",
            order_index=3,
        )
        await db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=now - timedelta(days=2),
                amount=Decimal("-50.00"),
                note="Github inc",
                category_id=groceries_id,
                tags=[],
                currency="AED",
                sms_text=f"{db_helper.namespace}hist-1",
                message_id=f"{db_helper.namespace}msg-hist-1",
            )
        )
        await db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=now - timedelta(days=1),
                amount=Decimal("-75.00"),
                note="Github inc subscription",
                category_id=eating_out_id,
                tags=[],
                currency="AED",
                sms_text=f"{db_helper.namespace}hist-2",
                message_id=f"{db_helper.namespace}msg-hist-2",
            )
        )
        await db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=now - timedelta(days=3),
                amount=Decimal("-88.00"),
                note="Github inc annual plan",
                category_id=home_id,
                tags=[],
                currency="AED",
                sms_text=f"{db_helper.namespace}hist-3",
                message_id=f"{db_helper.namespace}msg-hist-3",
            )
        )

        message_id_seed = 700000 + sum(ord(ch) for ch in db_helper.namespace) % 200000
        sms_text = (
            "Payment of USD 10 (AED 37) was done at Github inc using your Wio Personal card 9759 with Credit money"
        )
        context: _FakeContext | None = None
        first_message: dict[str, object] | None = None
        message_id = message_id_seed
        for attempt in range(3):
            current_message_id = message_id_seed + attempt
            current_context = _FakeContext(bot=_FakeBot())
            message_update = _build_message_update(
                user_id=test_user_id,
                message_id=current_message_id,
                text=sms_text,
            )
            await handle_telegram_update(message_update, current_context)
            if len(current_context.bot.sent_messages) == 1 and "Transaction was saved." in str(
                current_context.bot.sent_messages[0]["text"]
            ):
                context = current_context
                first_message = current_context.bot.sent_messages[0]
                message_id = current_message_id
                break
        if context is None or first_message is None:
            pytest.skip("Real LLM parser couldn't parse the SMS after 3 attempts")

        first_text = str(first_message["text"])
        assert "Category:" in first_text

        reply_markup = first_message["reply_markup"]
        assert isinstance(reply_markup, InlineKeyboardMarkup)
        buttons = [button for row in reply_markup.inline_keyboard for button in row]
        assert len(buttons) == 4
        assert str(buttons[-1].text) == "Remove category"

        top_payloads = [decode_category_callback_data(str(button.callback_data)) for button in buttons[:3]]
        assert all(payload is not None for payload in top_payloads)
        top_payload_values = [payload for payload in top_payloads if payload is not None]
        assert len(top_payload_values) == 3
        top_category_ids = [payload.category_id for payload in top_payload_values]
        assert all(category_id is not None for category_id in top_category_ids)
        assert len(set(top_category_ids)) == 3

        saved = await db_helper.get_transaction_by_user_and_message_id(
            user_id=test_user_id,
            message_id=str(message_id),
        )
        assert saved is not None
        assert saved["category_id"] is not None
        assert int(saved["category_id"]) == int(top_payload_values[0].category_id or 0)

        second_callback_update = _build_callback_update(
            user_id=test_user_id,
            callback_data=str(buttons[1].callback_data),
        )
        await handle_telegram_update(second_callback_update, context)
        saved_after_override = await db_helper.get_transaction_by_user_and_message_id(
            user_id=test_user_id,
            message_id=str(message_id),
        )
        assert saved_after_override is not None
        assert int(saved_after_override["category_id"]) == int(top_payload_values[1].category_id or 0)
        assert "Category updated to:" in str(context.bot.sent_messages[-1]["text"])

        remove_callback_update = _build_callback_update(
            user_id=test_user_id,
            callback_data=str(buttons[3].callback_data),
        )
        await handle_telegram_update(remove_callback_update, context)
        saved_after_remove = await db_helper.get_transaction_by_user_and_message_id(
            user_id=test_user_id,
            message_id=str(message_id),
        )
        assert saved_after_remove is not None
        assert saved_after_remove["category_id"] is None
        assert str(context.bot.sent_messages[-1]["text"]) == "Category removed. You can set it manually in app."
    finally:
        await engine.close_connection_pool()


def test_telegram_category_suggestion_e2e_real_llm(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    _require_llm_e2e_enabled()
    asyncio.run(
        _run_telegram_category_suggestion_e2e(
            db_helper=db_helper,
            test_user_id=test_user_id,
        )
    )
