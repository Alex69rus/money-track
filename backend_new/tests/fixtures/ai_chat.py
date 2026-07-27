from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal

from agents.tool import FunctionTool
from agents.tool_context import ToolContext

from app.services.ai_chat.chat_agent_context import ChatAgentContext
from tests.fixtures.db_helpers import DbHelper, SeedTransaction


def unique_value(namespace: str, suffix: str) -> str:
    return f"{namespace}{suffix}"


async def seed_ai_chat_transaction(
    db_helper: DbHelper,
    *,
    user_id: int,
    transaction_date: datetime,
    amount: Decimal,
    note: str,
    category_id: int | None,
    tags: list[str],
    message_suffix: str,
    currency: str = "AED",
    sms_text: str | None = None,
) -> int:
    return await db_helper.insert_transaction(
        SeedTransaction(
            user_id=user_id,
            transaction_date=transaction_date,
            amount=amount,
            note=note,
            category_id=category_id,
            tags=tags,
            currency=currency,
            sms_text=sms_text,
            message_id=unique_value(db_helper.namespace, message_suffix),
        )
    )


async def invoke_ai_chat_tool(
    *,
    tool: FunctionTool,
    user_id: int,
    arguments: dict[str, object],
) -> object:
    tool_arguments = json.dumps(arguments)
    context = ToolContext(
        context=ChatAgentContext(user_id=user_id),
        tool_name=tool.name,
        tool_call_id=f"integration-test-{tool.name}",
        tool_arguments=tool_arguments,
    )
    return await tool.on_invoke_tool(context, tool_arguments)
