from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from agents.tool_context import ToolContext

from app.services.ai_chat.aggregate_tool import TransactionAggregationResult, aggregate_transactions
from app.services.ai_chat.chat_agent_context import ChatAgentContext
from tests.fixtures import DbHelper, SeedTransaction


@dataclass(frozen=True)
class AggregationCase:
    group_by_field: str
    aggregation_function: str
    aggregation_field: str
    tag: str
    expected_fields: dict[str, datetime | int | str]
    expected_value: Decimal | datetime | int | str


def _unique_value(namespace: str, suffix: str) -> str:
    return f"{namespace}{suffix}"


def _seed_transaction(
    db_helper: DbHelper,
    *,
    user_id: int,
    transaction_date: datetime,
    amount: Decimal,
    category_id: int | None,
    tag: str,
    message_suffix: str,
) -> None:
    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=user_id,
                transaction_date=transaction_date,
                amount=amount,
                note=_unique_value(db_helper.namespace, f"{tag}-{message_suffix}"),
                category_id=category_id,
                tags=[tag],
                currency="AED",
                sms_text=None,
                message_id=_unique_value(db_helper.namespace, f"{tag}-{message_suffix}"),
            )
        )
    )


def _invoke_aggregate_transactions(
    *,
    user_id: int,
    filters: dict[str, object],
    group_by_field: str,
    aggregation_function: str,
    aggregation_field: str,
) -> list[TransactionAggregationResult]:
    return asyncio.run(
        _invoke_aggregate_transactions_async(
            user_id=user_id,
            filters=filters,
            group_by_field=group_by_field,
            aggregation_function=aggregation_function,
            aggregation_field=aggregation_field,
        )
    )


async def _invoke_aggregate_transactions_async(
    *,
    user_id: int,
    filters: dict[str, object],
    group_by_field: str,
    aggregation_function: str,
    aggregation_field: str,
) -> list[TransactionAggregationResult]:
    tool_arguments = json.dumps(
        {
            "filters": filters,
            "group_by_fields": [group_by_field],
            "aggregation_function": aggregation_function,
            "aggregation_field": aggregation_field,
        }
    )
    context = ToolContext(
        context=ChatAgentContext(user_id=user_id),
        tool_name=aggregate_transactions.name,
        tool_call_id="integration-test-aggregate-transactions",
        tool_arguments=tool_arguments,
    )

    result = await aggregate_transactions.on_invoke_tool(context, tool_arguments)

    assert isinstance(result, list)
    assert all(isinstance(item, TransactionAggregationResult) for item in result)
    return result


@pytest.fixture
def aggregation_cases(db_helper: DbHelper, test_user_id: int, case_index: int) -> list[AggregationCase]:
    home_category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    car_category_id = asyncio.run(db_helper.get_category_id_by_name("Car"))

    tags = {
        name: _unique_value(db_helper.namespace, f"aggregate-{name}-{case_index}")
        for name in (
            "day",
            "month",
            "quarter",
            "year",
            "tag",
            "category-id",
            "category-type",
        )
    }

    for index, transaction_date, amount in (
        (1, datetime(2099, 1, 10, 9, 0, tzinfo=UTC), Decimal("10.00")),
        (2, datetime(2099, 1, 10, 18, 0, tzinfo=UTC), Decimal("20.00")),
    ):
        _seed_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=transaction_date,
            amount=amount,
            category_id=home_category_id,
            tag=tags["day"],
            message_suffix=f"aggregate-day-{index}",
        )

    for index, transaction_date, amount in (
        (1, datetime(2099, 2, 1, 9, 0, tzinfo=UTC), Decimal("12.00")),
        (2, datetime(2099, 2, 20, 9, 0, tzinfo=UTC), Decimal("24.00")),
    ):
        _seed_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=transaction_date,
            amount=amount,
            category_id=home_category_id,
            tag=tags["month"],
            message_suffix=f"aggregate-month-{index}",
        )

    for index, transaction_date in (
        (1, datetime(2099, 7, 1, 9, 0, tzinfo=UTC)),
        (2, datetime(2099, 9, 30, 9, 0, tzinfo=UTC)),
    ):
        _seed_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=transaction_date,
            amount=Decimal("1.00"),
            category_id=home_category_id,
            tag=tags["quarter"],
            message_suffix=f"aggregate-quarter-{index}",
        )

    for index, category_id in ((1, home_category_id), (2, car_category_id)):
        _seed_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=datetime(2099, 10, index, 9, 0, tzinfo=UTC),
            amount=Decimal("1.00"),
            category_id=category_id,
            tag=tags["year"],
            message_suffix=f"aggregate-year-{index}",
        )

    for index in (1, 2):
        _seed_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=datetime(2099, 3, index, 9, 0, tzinfo=UTC),
            amount=Decimal("1.00"),
            category_id=home_category_id,
            tag=tags["tag"],
            message_suffix=f"aggregate-tag-{index}",
        )

    for index in (1, 2):
        _seed_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=datetime(2099, 4, index, 9, 0, tzinfo=UTC),
            amount=Decimal("1.00"),
            category_id=home_category_id,
            tag=tags["category-id"],
            message_suffix=f"aggregate-category-id-{index}",
        )

    for index in (1, 2):
        _seed_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=datetime(2099, 5, index, 9, 0, tzinfo=UTC),
            amount=Decimal("1.00"),
            category_id=home_category_id,
            tag=tags["category-type"],
            message_suffix=f"aggregate-category-type-{index}",
        )

    return [
        AggregationCase(
            "transaction_date_day",
            "sum",
            "amount",
            tags["day"],
            {"transaction_date_day": datetime(2099, 1, 10, tzinfo=UTC)},
            Decimal("30.00"),
        ),
        AggregationCase(
            "transaction_date_month",
            "avg",
            "amount",
            tags["month"],
            {"transaction_date_month": datetime(2099, 2, 1, tzinfo=UTC)},
            Decimal("18.00"),
        ),
        AggregationCase(
            "transaction_date_quarter",
            "min",
            "transaction_date_time",
            tags["quarter"],
            {"transaction_date_quarter": datetime(2099, 7, 1, tzinfo=UTC)},
            datetime(2099, 7, 1, 9, 0, tzinfo=UTC),
        ),
        AggregationCase(
            "transaction_date_year",
            "max",
            "category_id",
            tags["year"],
            {"transaction_date_year": datetime(2099, 1, 1, tzinfo=UTC)},
            max(home_category_id, car_category_id),
        ),
        AggregationCase("tag", "count", "asterisk", tags["tag"], {"tag": tags["tag"]}, 2),
        AggregationCase(
            "category_id",
            "count",
            "currency",
            tags["category-id"],
            {"category_id": home_category_id},
            2,
        ),
        AggregationCase(
            "category_type",
            "min",
            "category_type",
            tags["category-type"],
            {"category_type": "Expense"},
            "Expense",
        ),
    ]


@pytest.mark.parametrize("case_index", range(7))
# @pytest.mark.parametrize("case_index", range(1))
def test_aggregate_transactions_covers_grouping_and_aggregation_contract(
    aggregation_cases: list[AggregationCase],
    test_user_id: int,
    case_index: int,
) -> None:
    case = aggregation_cases[case_index]

    result = _invoke_aggregate_transactions(
        user_id=test_user_id,
        filters={"tags": case.tag},
        group_by_field=case.group_by_field,
        aggregation_function=case.aggregation_function,
        aggregation_field=case.aggregation_field,
    )

    assert len(result) == 1
    assert result[0].fields == case.expected_fields
    assert result[0].value == case.expected_value
