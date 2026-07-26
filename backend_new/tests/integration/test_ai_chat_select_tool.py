from __future__ import annotations

import asyncio
import json
from datetime import UTC, datetime
from decimal import Decimal

from agents.tool_context import ToolContext

from app.models import TransactionsWithCategory
from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.select_tool import TransactionsList, list_transactions
from tests.fixtures import DbHelper, SeedTransaction


def _unique_value(namespace: str, suffix: str) -> str:
    return f"{namespace}{suffix}"


def _invoke_list_transactions(*, user_id: int, filters: dict[str, object]) -> TransactionsList:
    return asyncio.run(_invoke_list_transactions_async(user_id=user_id, filters=filters))


async def _invoke_list_transactions_async(*, user_id: int, filters: dict[str, object]) -> TransactionsList:
    tool_arguments = json.dumps({"filters": filters})
    context = ToolContext(
        context=ChatAgentContext(user_id=user_id),
        tool_name=list_transactions.name,
        tool_call_id="integration-test-list-transactions",
        tool_arguments=tool_arguments,
    )

    result = await list_transactions.on_invoke_tool(context, tool_arguments)

    assert isinstance(result, TransactionsList)
    return result


def _seed_transaction(
    db_helper: DbHelper,
    *,
    user_id: int,
    transaction_date: datetime,
    amount: Decimal,
    note: str,
    category_id: int | None,
    tags: list[str],
    message_suffix: str,
) -> int:
    return asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=user_id,
                transaction_date=transaction_date,
                amount=amount,
                note=note,
                category_id=category_id,
                tags=tags,
                currency="AED",
                sms_text=note,
                message_id=_unique_value(db_helper.namespace, message_suffix),
            )
        )
    )


def test_transactions_with_category_view_exposes_shared_tool_fields(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    transaction_date = datetime(2099, 7, 4, 12, 34, tzinfo=UTC)
    transaction_id = _seed_transaction(
        db_helper,
        user_id=test_user_id,
        transaction_date=transaction_date,
        amount=Decimal("-12.34"),
        note=_unique_value(db_helper.namespace, "shared-view"),
        category_id=category_id,
        tags=[_unique_value(db_helper.namespace, "shared-view-tag")],
        message_suffix="msg-shared-view",
    )

    rows = asyncio.run(
        TransactionsWithCategory.select(
            TransactionsWithCategory.id,
            TransactionsWithCategory.user_id,
            TransactionsWithCategory.transaction_date_time,
            TransactionsWithCategory.transaction_date_day,
            TransactionsWithCategory.transaction_date_month,
            TransactionsWithCategory.transaction_date_quarter,
            TransactionsWithCategory.transaction_date_year,
            TransactionsWithCategory.amount,
            TransactionsWithCategory.note,
            TransactionsWithCategory.tags,
            TransactionsWithCategory.currency,
            TransactionsWithCategory.category_id,
            TransactionsWithCategory.category_name,
            TransactionsWithCategory.category_type,
        )
        .where(TransactionsWithCategory.id == transaction_id)
        .run()
    )

    assert len(rows) == 1
    row = rows[0]
    assert row["id"] == transaction_id
    assert row["user_id"] == test_user_id
    assert row["transaction_date_time"] == transaction_date
    assert row["transaction_date_day"] == datetime(2099, 7, 4, tzinfo=UTC)
    assert row["transaction_date_month"] == datetime(2099, 7, 1, tzinfo=UTC)
    assert row["transaction_date_quarter"] == datetime(2099, 7, 1, tzinfo=UTC)
    assert row["transaction_date_year"] == datetime(2099, 1, 1, tzinfo=UTC)
    assert row["amount"] == Decimal("-12.34")
    assert row["category_id"] == category_id
    assert row["category_name"] == "Home"
    assert row["category_type"] == "Expense"


def test_list_transactions_applies_date_amount_category_tag_text_filters_and_user_scope(
    db_helper: DbHelper,
    test_user_id: int,
    test_other_user_id: int,
) -> None:
    tag = _unique_value(db_helper.namespace, "select-match")
    other_tag = _unique_value(db_helper.namespace, "select-other")
    search_term = _unique_value(db_helper.namespace, "select-search")
    category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    other_category_id = asyncio.run(db_helper.get_category_id_by_name("Car"))

    matching_note = f"{search_term} matching transaction"
    matching_id = _seed_transaction(
        db_helper,
        user_id=test_user_id,
        transaction_date=datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
        amount=Decimal("-45.00"),
        note=matching_note,
        category_id=category_id,
        tags=[tag],
        message_suffix="msg-select-match",
    )
    _seed_transaction(
        db_helper,
        user_id=test_other_user_id,
        transaction_date=datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
        amount=Decimal("-45.00"),
        note=matching_note,
        category_id=category_id,
        tags=[tag],
        message_suffix="msg-select-other-user-match",
    )

    for suffix, transaction_date, amount, note, row_category_id, row_tags in [
        (
            "before-from-date",
            datetime(2099, 6, 14, 12, 0, tzinfo=UTC),
            Decimal("-45.00"),
            matching_note,
            category_id,
            [tag],
        ),
        (
            "after-to-date",
            datetime(2099, 6, 16, 12, 0, tzinfo=UTC),
            Decimal("-45.00"),
            matching_note,
            category_id,
            [tag],
        ),
        (
            "below-min-amount",
            datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
            Decimal("-55.00"),
            matching_note,
            category_id,
            [tag],
        ),
        (
            "above-max-amount",
            datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
            Decimal("-35.00"),
            matching_note,
            category_id,
            [tag],
        ),
        (
            "other-category",
            datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
            Decimal("-45.00"),
            matching_note,
            other_category_id,
            [tag],
        ),
        (
            "other-tag",
            datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
            Decimal("-45.00"),
            matching_note,
            category_id,
            [other_tag],
        ),
        (
            "other-text",
            datetime(2099, 6, 15, 12, 0, tzinfo=UTC),
            Decimal("-45.00"),
            _unique_value(db_helper.namespace, "different-text"),
            category_id,
            [tag],
        ),
    ]:
        _seed_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=transaction_date,
            amount=amount,
            note=note,
            category_id=row_category_id,
            tags=row_tags,
            message_suffix=f"msg-select-{suffix}",
        )

    result = _invoke_list_transactions(
        user_id=test_user_id,
        filters={
            "from_date": "2099-06-15",
            "to_date": "2099-06-15",
            "min_amount": "-50.00",
            "max_amount": "-40.00",
            "category_id": category_id,
            "tags": f"missing-tag, {tag.upper()}",
            "text": search_term.upper(),
            "take": 10,
        },
    )

    assert result.total_count == 1
    assert result.skip == 0
    assert result.take == 10
    assert result.has_more is False
    assert len(result.data) == 1
    transaction = result.data[0]
    assert transaction.id == matching_id
    assert transaction.transaction_date_time == "2099-06-15T12:00:00+00:00"
    assert transaction.amount == -45.0
    assert transaction.note == matching_note
    assert transaction.tags == [tag]
    assert transaction.currency == "AED"
    assert transaction.category_id == category_id
    assert transaction.category_name == "Home"
    assert transaction.category_type == "Expense"


def test_list_transactions_filters_by_flow(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    tag = _unique_value(db_helper.namespace, "flow")
    expense_id = _seed_transaction(
        db_helper,
        user_id=test_user_id,
        transaction_date=datetime(2099, 7, 1, 12, 0, tzinfo=UTC),
        amount=Decimal("-10.00"),
        note=_unique_value(db_helper.namespace, "expense"),
        category_id=None,
        tags=[tag],
        message_suffix="msg-select-expense",
    )
    income_id = _seed_transaction(
        db_helper,
        user_id=test_user_id,
        transaction_date=datetime(2099, 7, 1, 12, 1, tzinfo=UTC),
        amount=Decimal("10.00"),
        note=_unique_value(db_helper.namespace, "income"),
        category_id=None,
        tags=[tag],
        message_suffix="msg-select-income",
    )
    _seed_transaction(
        db_helper,
        user_id=test_user_id,
        transaction_date=datetime(2099, 7, 1, 12, 2, tzinfo=UTC),
        amount=Decimal("0.00"),
        note=_unique_value(db_helper.namespace, "zero"),
        category_id=None,
        tags=[tag],
        message_suffix="msg-select-zero",
    )

    expenses = _invoke_list_transactions(
        user_id=test_user_id,
        filters={"tags": tag, "flow": "expense", "take": 10},
    )
    incomes = _invoke_list_transactions(
        user_id=test_user_id,
        filters={"tags": tag, "flow": "income", "take": 10},
    )

    assert [transaction.id for transaction in expenses.data] == [expense_id]
    assert expenses.total_count == 1
    assert [transaction.id for transaction in incomes.data] == [income_id]
    assert incomes.total_count == 1


def test_list_transactions_filters_uncategorized_transactions(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    tag = _unique_value(db_helper.namespace, "uncategorized")
    category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    uncategorized_id = _seed_transaction(
        db_helper,
        user_id=test_user_id,
        transaction_date=datetime(2099, 7, 2, 12, 0, tzinfo=UTC),
        amount=Decimal("-10.00"),
        note=_unique_value(db_helper.namespace, "uncategorized"),
        category_id=None,
        tags=[tag],
        message_suffix="msg-select-uncategorized",
    )
    _seed_transaction(
        db_helper,
        user_id=test_user_id,
        transaction_date=datetime(2099, 7, 2, 12, 1, tzinfo=UTC),
        amount=Decimal("-10.00"),
        note=_unique_value(db_helper.namespace, "categorized"),
        category_id=category_id,
        tags=[tag],
        message_suffix="msg-select-categorized",
    )

    result = _invoke_list_transactions(
        user_id=test_user_id,
        filters={"tags": tag, "uncategorized": True, "take": 10},
    )

    assert result.total_count == 1
    assert [transaction.id for transaction in result.data] == [uncategorized_id]
    assert result.data[0].category_id is None
    assert result.data[0].category_name is None
    assert result.data[0].category_type is None


def test_list_transactions_applies_pagination(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    tag = _unique_value(db_helper.namespace, "pagination")
    transaction_ids = [
        _seed_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=datetime(2099, 7, 3, 12, index, tzinfo=UTC),
            amount=Decimal("10.00"),
            note=_unique_value(db_helper.namespace, f"pagination-{index}"),
            category_id=None,
            tags=[tag],
            message_suffix=f"msg-select-pagination-{index}",
        )
        for index in range(3)
    ]

    result = _invoke_list_transactions(
        user_id=test_user_id,
        filters={"tags": tag, "skip": 1, "take": 1},
    )

    assert result.total_count == 3
    assert result.skip == 1
    assert result.take == 1
    assert result.has_more is True
    assert [transaction.id for transaction in result.data] == [transaction_ids[1]]
