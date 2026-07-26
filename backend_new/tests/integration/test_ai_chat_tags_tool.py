from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime
from decimal import Decimal

from agents.tool_context import ToolContext

from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.tags_tool import get_user_tags
from tests.fixtures import DbHelper, SeedTransaction


def _unique_value(namespace: str, suffix: str) -> str:
    return f"{namespace}{suffix}"


def _isolated_user_id(db_helper: DbHelper) -> int:
    namespace_hex = db_helper.namespace.removeprefix("it_").removesuffix("_")
    return 1_000_000_000 + int(namespace_hex, 16)


def _invoke_get_user_tags(*, user_id: int, arguments: dict[str, object]) -> list[str]:
    return asyncio.run(_invoke_get_user_tags_async(user_id=user_id, arguments=arguments))


async def _invoke_get_user_tags_async(*, user_id: int, arguments: dict[str, object]) -> list[str]:
    tool_arguments = json.dumps(arguments)
    context = ToolContext(
        context=ChatAgentContext(user_id=user_id),
        tool_name=get_user_tags.name,
        tool_call_id="integration-test-get-user-tags",
        tool_arguments=tool_arguments,
    )

    result = await get_user_tags.on_invoke_tool(context, tool_arguments)

    assert isinstance(result, list)
    assert all(isinstance(tag, str) for tag in result)
    return result


def _seed_transaction(
    db_helper: DbHelper,
    *,
    user_id: int,
    tags: list[str],
    message_suffix: str,
) -> None:
    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=user_id,
                transaction_date=datetime(2099, 7, 5, 12, 0, tzinfo=UTC),
                amount=Decimal("10.00"),
                note=_unique_value(db_helper.namespace, f"tags-tool-{message_suffix}"),
                category_id=None,
                tags=tags,
                currency="AED",
                sms_text=None,
                message_id=_unique_value(db_helper.namespace, f"msg-tags-tool-{message_suffix}"),
            )
        )
    )


def test_get_user_tags_returns_unique_sorted_tags_and_ignores_empty_tag_arrays(
    db_helper: DbHelper,
) -> None:
    user_id = _isolated_user_id(db_helper)
    alpha_tag = _unique_value(db_helper.namespace, "000-tags-default-alpha")
    beta_tag = _unique_value(db_helper.namespace, "000-tags-default-beta")
    other_user_tag = _unique_value(db_helper.namespace, "000-tags-default-other-user")

    _seed_transaction(
        db_helper,
        user_id=user_id,
        tags=[alpha_tag, beta_tag],
        message_suffix="default-both",
    )
    _seed_transaction(
        db_helper,
        user_id=user_id,
        tags=[alpha_tag],
        message_suffix="default-duplicate",
    )
    _seed_transaction(
        db_helper,
        user_id=user_id,
        tags=[],
        message_suffix="default-tags-unset",
    )
    _seed_transaction(
        db_helper,
        user_id=user_id + 1,
        tags=[other_user_tag],
        message_suffix="default-other-user",
    )

    result = _invoke_get_user_tags(user_id=user_id, arguments={})

    assert result == [alpha_tag, beta_tag]
    assert other_user_tag not in result


def test_get_user_tags_applies_a_case_insensitive_tag_name_filter(
    db_helper: DbHelper,
) -> None:
    user_id = _isolated_user_id(db_helper)
    filter_value = _unique_value(db_helper.namespace, "filter-match")
    matching_tags = [f"{filter_value}-bus", f"{filter_value.upper()}-train"]
    non_matching_tag = _unique_value(db_helper.namespace, "filter-other")
    other_user_tag = f"{filter_value}-other-user"

    _seed_transaction(
        db_helper,
        user_id=user_id,
        tags=[matching_tags[0], non_matching_tag],
        message_suffix="filter-first-match",
    )
    _seed_transaction(
        db_helper,
        user_id=user_id,
        tags=[matching_tags[0], matching_tags[1]],
        message_suffix="filter-second-match",
    )
    _seed_transaction(
        db_helper,
        user_id=user_id + 1,
        tags=[other_user_tag],
        message_suffix="filter-other-user",
    )

    result = _invoke_get_user_tags(
        user_id=user_id,
        arguments={"tag_name_filter": filter_value.upper()},
    )

    assert set(result) == set(matching_tags)


def test_get_user_tags_applies_pagination_after_distinct_tag_ordering(
    db_helper: DbHelper,
) -> None:
    user_id = _isolated_user_id(db_helper)
    filter_value = _unique_value(db_helper.namespace, "paging-match")
    expected_tags = [f"{filter_value}-{suffix}" for suffix in ("alpha", "bravo", "charlie")]

    _seed_transaction(
        db_helper,
        user_id=user_id,
        tags=[expected_tags[0], expected_tags[1]],
        message_suffix="pagination-first",
    )
    _seed_transaction(
        db_helper,
        user_id=user_id,
        tags=[expected_tags[0], expected_tags[2]],
        message_suffix="pagination-second",
    )

    page = _invoke_get_user_tags(
        user_id=user_id,
        arguments={"tag_name_filter": filter_value, "skip": 1, "take": 1},
    )
    after_last_page = _invoke_get_user_tags(
        user_id=user_id,
        arguments={"tag_name_filter": filter_value, "skip": 3, "take": 1},
    )

    assert page == [expected_tags[1]]
    assert after_last_page == []
