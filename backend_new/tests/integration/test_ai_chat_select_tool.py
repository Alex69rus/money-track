from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from agents.tool import ToolOutputText
from pydantic import ValidationError

from app.services.ai_chat.common import TransactionFilter
from app.services.ai_chat.select_tool import TransactionsList, list_transactions
from tests.fixtures import DbHelper
from tests.fixtures.ai_chat import invoke_ai_chat_tool, seed_ai_chat_transaction, unique_value


def _invoke_list_transactions(*, user_id: int, arguments: dict[str, object]) -> TransactionsList:
    result = asyncio.run(invoke_ai_chat_tool(tool=list_transactions, user_id=user_id, arguments=arguments))
    assert isinstance(result, ToolOutputText)
    return TransactionsList.model_validate_json(result.text)


def test_list_transactions_applies_filters_and_user_scope(
    db_helper: DbHelper,
    test_user_id: int,
    test_other_user_id: int,
) -> None:
    tag = unique_value(db_helper.namespace, "select-match")
    other_tag = unique_value(db_helper.namespace, "select-other")
    search_term = unique_value(db_helper.namespace, "select-search")
    category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    other_category_id = asyncio.run(db_helper.get_category_id_by_name("Car"))
    matching_note = f"{search_term} matching transaction"

    matching_id = asyncio.run(
        seed_ai_chat_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
            amount=Decimal("-45.00"),
            note=matching_note,
            category_id=category_id,
            tags=[tag],
            message_suffix="select-match",
        )
    )
    for user_id, transaction_date, amount, note, row_category_id, row_tags, suffix in [
        (
            test_other_user_id,
            datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
            Decimal("-45.00"),
            matching_note,
            category_id,
            [tag],
            "select-other-user",
        ),
        (
            test_user_id,
            datetime(2099, 6, 14, 12, 0, tzinfo=UTC),
            Decimal("-45.00"),
            matching_note,
            category_id,
            [tag],
            "select-before",
        ),
        (
            test_user_id,
            datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
            Decimal("-55.00"),
            matching_note,
            category_id,
            [tag],
            "select-below-amount",
        ),
        (
            test_user_id,
            datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
            Decimal("-45.00"),
            matching_note,
            other_category_id,
            [tag],
            "select-other-category",
        ),
        (
            test_user_id,
            datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
            Decimal("-45.00"),
            matching_note,
            category_id,
            [other_tag],
            "select-other-tag",
        ),
    ]:
        asyncio.run(
            seed_ai_chat_transaction(
                db_helper,
                user_id=user_id,
                transaction_date=transaction_date,
                amount=amount,
                note=note,
                category_id=row_category_id,
                tags=row_tags,
                message_suffix=suffix,
            )
        )

    result = _invoke_list_transactions(
        user_id=test_user_id,
        arguments={
            "filters": {
                "from_date": "2099-06-15",
                "to_date": "2099-06-15",
                "min_amount": "-50.00",
                "max_amount": "-40.00",
                "category_id": category_id,
                "tags": f"missing-tag, {tag.upper()}",
                "text": search_term.upper(),
            }
        },
    )

    assert result.total_count == 1
    assert result.skip == 0
    assert result.take == 10
    assert result.has_more is False
    assert [transaction.id for transaction in result.data] == [matching_id]
    assert result.data[0].amount == Decimal("-45.00")


def test_list_transactions_sorts_and_paginates_with_stable_ties(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    tag = unique_value(db_helper.namespace, "select-sort")
    cases = [
        (datetime(2099, 7, 3, 12, 0, tzinfo=UTC), Decimal("-5.00"), "old"),
        (datetime(2099, 7, 3, 12, 1, tzinfo=UTC), Decimal("10.00"), "middle"),
        (datetime(2099, 7, 3, 12, 2, tzinfo=UTC), Decimal("-20.00"), "first-tie"),
        (datetime(2099, 7, 3, 12, 3, tzinfo=UTC), Decimal("-20.00"), "second-tie"),
    ]
    transaction_ids = [
        asyncio.run(
            seed_ai_chat_transaction(
                db_helper,
                user_id=test_user_id,
                transaction_date=transaction_date,
                amount=amount,
                note=unique_value(db_helper.namespace, suffix),
                category_id=None,
                tags=[tag],
                message_suffix=f"select-sort-{suffix}",
            )
        )
        for transaction_date, amount, suffix in cases
    ]

    default_order = _invoke_list_transactions(user_id=test_user_id, arguments={"filters": {"tags": tag}})
    amount_ascending = _invoke_list_transactions(
        user_id=test_user_id,
        arguments={"filters": {"tags": tag}, "sort_by": "amount", "sort_order_asc": True},
    )
    amount_descending_page = _invoke_list_transactions(
        user_id=test_user_id,
        arguments={
            "filters": {"tags": tag},
            "sort_by": "amount",
            "sort_order_asc": False,
            "skip": 1,
            "take": 1,
        },
    )

    assert [item.id for item in default_order.data] == list(reversed(transaction_ids))
    assert [item.id for item in amount_ascending.data] == [
        transaction_ids[2],
        transaction_ids[3],
        transaction_ids[0],
        transaction_ids[1],
    ]
    assert [item.id for item in amount_descending_page.data] == [transaction_ids[0]]
    assert amount_descending_page.total_count == 4
    assert amount_descending_page.has_more is True


def test_list_transactions_preserves_decimal_amount_precision(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    tag = unique_value(db_helper.namespace, "select-precision")
    amount = Decimal("9999999999999999.99")
    asyncio.run(
        seed_ai_chat_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=datetime(2099, 7, 4, 12, 0, tzinfo=UTC),
            amount=amount,
            note=unique_value(db_helper.namespace, "precision"),
            category_id=None,
            tags=[tag],
            message_suffix="select-precision",
        )
    )

    result = _invoke_list_transactions(user_id=test_user_id, arguments={"filters": {"tags": tag}})

    assert result.data[0].amount == amount
    assert result.data[0].model_dump(mode="json")["amount"] == "9999999999999999.99"


def test_list_transactions_treats_sql_shaped_filter_text_as_data(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    tag = unique_value(db_helper.namespace, "select-sql-shaped")
    transaction_id = asyncio.run(
        seed_ai_chat_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=datetime(2099, 7, 5, 12, 0, tzinfo=UTC),
            amount=Decimal("-12.00"),
            note=unique_value(db_helper.namespace, "safe-row"),
            category_id=None,
            tags=[tag],
            message_suffix="select-sql-shaped",
        )
    )

    injection_shaped_text = "'; DROP TABLE transactions; --"
    no_match = _invoke_list_transactions(
        user_id=test_user_id,
        arguments={"filters": {"tags": injection_shaped_text, "text": injection_shaped_text}},
    )
    preserved_row = _invoke_list_transactions(user_id=test_user_id, arguments={"filters": {"tags": tag}})

    assert no_match.data == []
    assert preserved_row.data[0].id == transaction_id


@pytest.mark.parametrize(
    "filters",
    [
        {"unexpected": "value"},
        {"from_date": "2099-07-02", "to_date": "2099-07-01"},
        {"min_amount": "20", "max_amount": "10"},
        {"category_id": 1, "uncategorized": True},
    ],
)
def test_transaction_filters_reject_invalid_input(filters: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        TransactionFilter.model_validate(filters)


def test_list_transactions_exposes_bounded_top_level_pagination() -> None:
    schema = list_transactions.params_json_schema
    assert schema["properties"]["skip"]["minimum"] == 0
    assert schema["properties"]["take"]["minimum"] == 1
    assert schema["properties"]["take"]["maximum"] == 100
    assert "skip" not in TransactionFilter.model_json_schema()["properties"]


def test_list_transactions_rejects_invalid_top_level_pagination() -> None:
    result = asyncio.run(
        invoke_ai_chat_tool(
            tool=list_transactions,
            user_id=1,
            arguments={"filters": {}, "take": -1},
        )
    )

    assert isinstance(result, str)
    assert "take" in result
