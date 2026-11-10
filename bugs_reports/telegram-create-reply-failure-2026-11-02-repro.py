"""Offline historical probe of commit 07c203e; current regression lives in backend tests."""
import asyncio
import json
import runpy
import sys
import subprocess
import types
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "backend_new"))
from telegram.error import NetworkError
source = subprocess.check_output(
    ["git", "show", "07c203ea55309761ebc48d0a9bf27531ba2fcea6:backend_new/app/services/telegram_ingestion.py"],
    cwd=root, text=True,
)
ingestion = types.ModuleType("historical_telegram_ingestion")
sys.modules[ingestion.__name__] = ingestion
exec(compile(source, "historical_telegram_ingestion.py", "exec"), ingestion.__dict__)

helpers = runpy.run_path(str(root / "backend_new/tests/test_telegram_ingestion.py"))
transaction = helpers["_sample_transaction"](user_id=123).model_copy(
    update={"id": 3400, "amount": -49.31, "note": "Amazon grocery"}
)
suggestion = ingestion.CategorySuggestionResult(
    applied_category_id=50, applied_category_name="Groceries", top3_options=[]
)
update = helpers["_build_message_update"](from_id=123)

async def main():
    bot = AsyncMock()
    bot.send_message.side_effect = [NetworkError("httpx.ConnectError: synthetic TLS failure"), None]
    context = helpers["_FakeContext"](bot=bot)
    parser = AsyncMock(return_value=helpers["ParsedSmsTransaction"](
        amount=helpers["Decimal"]("-49.31"), currency="AED", note="Amazon grocery"
    ))
    upsert = AsyncMock(return_value=transaction)
    category = AsyncMock(return_value=suggestion)
    with patch.object(ingestion, "parse_sms_transaction", parser), patch.object(
        ingestion, "upsert_transaction_by_message_id", upsert
    ), patch.object(ingestion, "suggest_and_apply_transaction_category", category
    ), patch("app.services.telegram_callback_data.get_settings", return_value=SimpleNamespace(telegram_webhook_secret="offline-probe")):
        await ingestion.handle_telegram_update(update, context)
    texts = [call.kwargs["text"] for call in bot.send_message.await_args_list]
    assert parser.await_count == upsert.await_count == category.await_count == 1
    assert len(texts) == 2
    assert texts[0].startswith("Transaction was saved.")
    assert texts[1] == "Cannot parse the transaction"
    assert bot.send_message.await_args_list[0].kwargs["reply_to_message_id"] == bot.send_message.await_args_list[1].kwargs["reply_to_message_id"]
    print(json.dumps({
        "result": "reproduced", "parser_calls": parser.await_count,
        "upsert_calls": upsert.await_count, "category_calls": category.await_count,
        "send_attempts": len(texts), "first_send": "saved confirmation; synthetic network failure",
        "second_send": texts[1], "same_reply_target": True,
        "network_or_database_calls": 0
    }, indent=2))

asyncio.run(main())
