from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime
from decimal import Decimal

from agents.tool import ToolOutputText

from app.core.config import get_settings
from app.services.ai_chat.aggregate_tool import PaginatedTransactionAggregations, aggregate_transactions
from tests.fixtures import DbHelper
from tests.fixtures.ai_chat import invoke_ai_chat_tool, seed_ai_chat_transaction, unique_value


def _invoke_aggregate_transactions(*, user_id: int, arguments: dict[str, object]) -> PaginatedTransactionAggregations:
    result = asyncio.run(invoke_ai_chat_tool(tool=aggregate_transactions, user_id=user_id, arguments=arguments))
    assert isinstance(result, ToolOutputText)
    return PaginatedTransactionAggregations.model_validate_json(result.text)


def test_aggregate_transactions_returns_user_scoped_grand_totals(
    db_helper: DbHelper,
    test_user_id: int,
    test_other_user_id: int,
) -> None:
    tag = unique_value(db_helper.namespace, "aggregate-total")
    for user_id, amount, suffix in [
        (test_user_id, Decimal("10.00"), "first"),
        (test_user_id, Decimal("20.00"), "second"),
        (test_other_user_id, Decimal("999.00"), "other-user"),
    ]:
        asyncio.run(
            seed_ai_chat_transaction(
                db_helper,
                user_id=user_id,
                transaction_date=datetime(2099, 1, 10, 9, 0, tzinfo=UTC),
                amount=amount,
                note=unique_value(db_helper.namespace, suffix),
                category_id=None,
                tags=[tag],
                message_suffix=f"aggregate-total-{suffix}",
            )
        )

    result = _invoke_aggregate_transactions(
        user_id=test_user_id,
        arguments={
            "filters": {"tags": tag},
            "group_by_fields": [],
            "aggregation_function": "sum",
            "aggregation_field": "amount",
        },
    )

    assert result.total_count == 1
    assert result.has_more is False
    assert result.data[0].fields == {}
    assert result.data[0].value == Decimal("30.00")


def test_aggregate_transactions_paginates_and_orders_group_results(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    tags = [unique_value(db_helper.namespace, suffix) for suffix in ("bravo", "charlie", "alpha")]
    for tag, amount in zip(tags, (Decimal("5.00"), Decimal("5.00"), Decimal("10.00")), strict=True):
        asyncio.run(
            seed_ai_chat_transaction(
                db_helper,
                user_id=test_user_id,
                transaction_date=datetime(2099, 2, 1, 9, 0, tzinfo=UTC),
                amount=amount,
                note=tag,
                category_id=category_id,
                tags=[tag],
                message_suffix=f"aggregate-page-{tag}",
            )
        )

    first_page = _invoke_aggregate_transactions(
        user_id=test_user_id,
        arguments={
            "filters": {"tags": ",".join(tags)},
            "group_by_fields": ["tag"],
            "aggregation_function": "sum",
            "aggregation_field": "amount",
            "skip": 0,
            "take": 1,
        },
    )
    second_page = _invoke_aggregate_transactions(
        user_id=test_user_id,
        arguments={
            "filters": {"tags": ",".join(tags)},
            "group_by_fields": ["tag"],
            "aggregation_function": "sum",
            "aggregation_field": "amount",
            "skip": 1,
            "take": 1,
        },
    )
    category_sum = _invoke_aggregate_transactions(
        user_id=test_user_id,
        arguments={
            "filters": {"tags": ",".join(tags)},
            "group_by_fields": ["category_id"],
            "aggregation_function": "sum",
            "aggregation_field": "category_id",
        },
    )

    assert first_page.total_count == 3
    assert first_page.has_more is True
    assert first_page.data[0].fields == {"tag": tags[0]}
    assert second_page.data[0].fields == {"tag": tags[1]}
    assert category_sum.data[0].fields == {"category_id": category_id}
    assert category_sum.data[0].value == Decimal(category_id * 3)


def test_aggregate_transactions_groups_periods_in_configured_business_timezone(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    settings = get_settings()
    local_midnight_transaction = datetime(2099, 3, 4, 0, 30, tzinfo=settings.business_tzinfo).astimezone(UTC)
    tag = unique_value(db_helper.namespace, "aggregate-timezone")
    asyncio.run(
        seed_ai_chat_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=local_midnight_transaction,
            amount=Decimal("12.00"),
            note=tag,
            category_id=None,
            tags=[tag],
            message_suffix="aggregate-timezone",
        )
    )

    result = _invoke_aggregate_transactions(
        user_id=test_user_id,
        arguments={
            "filters": {"tags": tag, "from_date": "2099-03-04", "to_date": "2099-03-04"},
            "group_by_fields": ["transaction_date_day"],
            "aggregation_function": "count",
            "aggregation_field": "amount",
        },
    )

    assert result.data[0].fields == {"transaction_date_day": date(2099, 3, 4)}
    assert result.data[0].value == 1


def test_aggregate_tool_exposes_numeric_fields_and_bounded_pagination() -> None:
    schema = aggregate_transactions.params_json_schema
    assert schema["properties"]["aggregation_field"]["enum"] == ["amount", "category_id"]
    assert schema["properties"]["take"]["maximum"] == 100


def test_aggregate_tool_rejects_invalid_top_level_pagination() -> None:
    result = asyncio.run(
        invoke_ai_chat_tool(
            tool=aggregate_transactions,
            user_id=1,
            arguments={
                "filters": {},
                "group_by_fields": [],
                "aggregation_function": "count",
                "aggregation_field": "amount",
                "take": 101,
            },
        )
    )

    assert isinstance(result, str)
    assert "take" in result
