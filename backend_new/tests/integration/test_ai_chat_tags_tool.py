from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime
from decimal import Decimal

from agents.tool import ToolOutputText

from app.services.ai_chat.tags_tool import get_user_tags
from tests.fixtures import DbHelper
from tests.fixtures.ai_chat import invoke_ai_chat_tool, seed_ai_chat_transaction, unique_value


def _invoke_get_user_tags(*, user_id: int, arguments: dict[str, object]) -> list[str]:
    result = asyncio.run(invoke_ai_chat_tool(tool=get_user_tags, user_id=user_id, arguments=arguments))
    assert isinstance(result, ToolOutputText)
    tags = json.loads(result.text)
    assert isinstance(tags, list)
    assert all(isinstance(tag, str) for tag in tags)
    return tags


def test_get_user_tags_filters_scopes_and_paginates(
    db_helper: DbHelper,
    test_user_id: int,
    test_other_user_id: int,
) -> None:
    tag_prefix = unique_value(db_helper.namespace, "tag-tool")
    matching_tags = [f"{tag_prefix}-{suffix}" for suffix in ("alpha", "bravo", "charlie")]
    for user_id, tags, suffix in [
        (test_user_id, matching_tags[:2], "first"),
        (test_user_id, [matching_tags[0], matching_tags[2]], "second"),
        (test_other_user_id, [f"{tag_prefix}-other-user"], "other-user"),
    ]:
        asyncio.run(
            seed_ai_chat_transaction(
                db_helper,
                user_id=user_id,
                transaction_date=datetime(2099, 7, 5, 12, 0, tzinfo=UTC),
                amount=Decimal("10.00"),
                note=unique_value(db_helper.namespace, suffix),
                category_id=None,
                tags=tags,
                message_suffix=f"tag-tool-{suffix}",
            )
        )

    page = _invoke_get_user_tags(
        user_id=test_user_id,
        arguments={"tag_name_filter": tag_prefix.upper(), "skip": 1, "take": 1},
    )

    assert page == [matching_tags[1]]


def test_tags_tool_exposes_bounded_top_level_pagination() -> None:
    schema = get_user_tags.params_json_schema
    assert schema["properties"]["skip"]["minimum"] == 0
    assert schema["properties"]["take"]["maximum"] == 100


def test_tags_tool_rejects_invalid_top_level_pagination() -> None:
    result = asyncio.run(
        invoke_ai_chat_tool(
            tool=get_user_tags,
            user_id=1,
            arguments={"skip": -1},
        )
    )

    assert isinstance(result, str)
    assert "skip" in result
