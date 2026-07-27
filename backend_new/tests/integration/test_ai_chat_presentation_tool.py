from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from agents.tool import ToolOutputText
from pydantic import ValidationError

from app.services.ai_chat.common import current_business_date
from app.services.ai_chat.contracts import AgentDirective, ChatResponseV1
from app.services.ai_chat.presentation_tool import present_analysis
from tests.fixtures import DbHelper
from tests.fixtures.ai_chat import invoke_ai_chat_tool, seed_ai_chat_transaction, unique_value


def _present(*, user_id: int, arguments: dict[str, object]) -> ChatResponseV1:
    result = asyncio.run(invoke_ai_chat_tool(tool=present_analysis, user_id=user_id, arguments=arguments))
    assert isinstance(result, ToolOutputText)
    return ChatResponseV1.model_validate_json(result.text)


def test_present_analysis_scopes_summary_visual_and_transaction_table_to_authenticated_user(
    db_helper: DbHelper,
    test_user_id: int,
    test_other_user_id: int,
) -> None:
    tag = unique_value(db_helper.namespace, "presentation-scope")
    category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    for user_id, amount, suffix in [
        (test_user_id, Decimal("-25.00"), "owned"),
        (test_other_user_id, Decimal("-999.00"), "other"),
    ]:
        asyncio.run(
            seed_ai_chat_transaction(
                db_helper,
                user_id=user_id,
                transaction_date=datetime(2099, 1, 10, 9, 0, tzinfo=UTC),
                amount=amount,
                note=unique_value(db_helper.namespace, suffix),
                category_id=category_id,
                tags=[tag],
                message_suffix=f"presentation-scope-{suffix}",
            )
        )

    asyncio.run(
        seed_ai_chat_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=datetime(2099, 1, 10, 10, 0, tzinfo=UTC),
            amount=Decimal("50.00"),
            note=unique_value(db_helper.namespace, "unrelated-usd-income"),
            category_id=category_id,
            tags=[tag],
            currency="USD",
            message_suffix="presentation-scope-unrelated-usd-income",
        )
    )

    summary = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "spending_summary",
            "presentation": "summary",
            "filters": {"tags": tag, "from_date": "2099-01-01", "to_date": "2099-12-31"},
        },
    )
    table = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "transactions",
            "presentation": "table",
            "filters": {"tags": tag, "from_date": "2099-01-01", "to_date": "2099-12-31"},
        },
    )

    assert summary.message == "Spending for 2099-01-01 to 2099-12-31 was AED 25.00."
    assert summary.visual is not None
    assert summary.visual.kind == "summary"
    assert summary.visual.metrics[0].money is not None
    assert summary.visual.metrics[0].money.amount == "25.00"
    assert table.visual is not None
    assert table.visual.kind == "table"
    assert table.visual.table_kind == "transactions"
    assert len(table.visual.rows) == 2
    assert "999" not in table.model_dump_json()


def test_present_analysis_defaults_to_current_year_and_preserves_explicit_all_time_period(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    tag = unique_value(db_helper.namespace, "presentation-current-year")
    category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    current_year = current_business_date().year
    for transaction_date, amount, suffix in [
        (datetime(current_year, 6, 10, 9, 0, tzinfo=UTC), Decimal("-10.00"), "current-year"),
        (datetime(current_year - 1, 6, 10, 9, 0, tzinfo=UTC), Decimal("-999.00"), "previous-year"),
    ]:
        asyncio.run(
            seed_ai_chat_transaction(
                db_helper,
                user_id=test_user_id,
                transaction_date=transaction_date,
                amount=amount,
                note=unique_value(db_helper.namespace, suffix),
                category_id=category_id,
                tags=[tag],
                message_suffix=f"presentation-current-year-{suffix}",
            )
        )

    response = _present(
        user_id=test_user_id,
        arguments={"analysis": "spending_summary", "presentation": "summary", "filters": {"tags": tag}},
    )
    all_time_response = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "spending_summary",
            "presentation": "summary",
            "filters": {"tags": tag},
            "period_scope": "all_time",
        },
    )

    expected_period = f"{current_year}-01-01 to {current_year}-12-31"
    assert response.kind == "answer"
    assert response.message == f"Spending for {expected_period} was AED 10.00."
    assert response.visual is not None and response.visual.kind == "summary"
    assert response.visual.period.label == expected_period
    assert response.visual.metrics[0].money is not None
    assert response.visual.metrics[0].money.amount == "10.00"
    assert all_time_response.kind == "answer"
    assert all_time_response.message == "Spending for All time was AED 1009.00."
    assert all_time_response.visual is not None and all_time_response.visual.kind == "summary"
    assert all_time_response.visual.period.label == "All time"


def test_present_analysis_aggregates_same_flow_amounts_without_a_currency_limitation(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    tag = unique_value(db_helper.namespace, "presentation-single-currency-assumption")
    category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    for amount, currency, suffix in [
        (Decimal("-10.00"), "AED", "aed-expense"),
        (Decimal("-5.00"), "USD", "usd-expense"),
    ]:
        asyncio.run(
            seed_ai_chat_transaction(
                db_helper,
                user_id=test_user_id,
                transaction_date=datetime(2099, 6, 10, 9, 0, tzinfo=UTC),
                amount=amount,
                note=unique_value(db_helper.namespace, suffix),
                category_id=category_id,
                tags=[tag],
                currency=currency,
                message_suffix=f"presentation-single-currency-assumption-{suffix}",
            )
        )

    response = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "spending_summary",
            "presentation": "summary",
            "filters": {"tags": tag, "from_date": "2099-06-01", "to_date": "2099-06-30"},
        },
    )

    assert response.kind == "answer"
    assert response.visual is not None and response.visual.kind == "summary"
    assert response.visual.metrics[0].money is not None
    assert response.visual.metrics[0].money.amount == "15.00"


def test_present_analysis_supports_grounded_breakdown_trend_share_and_comparison(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    tag = unique_value(db_helper.namespace, "presentation-visuals")
    category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    for transaction_date, amount, suffix in [
        (datetime(2099, 1, 10, 9, 0, tzinfo=UTC), Decimal("-10.00"), "previous-expense"),
        (datetime(2099, 1, 12, 9, 0, tzinfo=UTC), Decimal("20.00"), "previous-income"),
        (datetime(2099, 2, 10, 9, 0, tzinfo=UTC), Decimal("-30.00"), "current-expense"),
        (datetime(2099, 2, 12, 9, 0, tzinfo=UTC), Decimal("40.00"), "current-income"),
    ]:
        asyncio.run(
            seed_ai_chat_transaction(
                db_helper,
                user_id=test_user_id,
                transaction_date=transaction_date,
                amount=amount,
                note=unique_value(db_helper.namespace, suffix),
                category_id=category_id,
                tags=[tag],
                message_suffix=f"presentation-visuals-{suffix}",
            )
        )

    bar = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "category_spending",
            "presentation": "bar",
            "filters": {"tags": tag, "from_date": "2099-01-01", "to_date": "2099-02-28"},
        },
    )
    trend = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "trend",
            "presentation": "line",
            "filters": {"tags": tag, "from_date": "2099-01-01", "to_date": "2099-02-28"},
        },
    )
    share = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "tag_share",
            "presentation": "category_share",
            "filters": {"tags": tag, "from_date": "2099-01-01", "to_date": "2099-02-28"},
        },
    )
    comparison = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "comparison_summary",
            "presentation": "summary",
            "filters": {"tags": tag},
            "comparison": {
                "current_from_date": "2099-02-01",
                "current_to_date": "2099-02-28",
                "previous_from_date": "2099-01-01",
                "previous_to_date": "2099-01-31",
            },
        },
    )

    assert bar.visual is not None and bar.visual.kind == "bar"
    assert trend.visual is not None and trend.visual.kind == "line"
    assert len(trend.visual.points) == 2
    assert share.visual is not None and share.visual.kind == "category_share"
    assert share.visual.items[0].share.display == "100.0%"
    assert comparison.visual is not None and comparison.visual.kind == "summary"
    assert comparison.visual.metrics[2].money is not None
    assert comparison.visual.metrics[2].money.amount == "20.00"
    assert comparison.visual.metrics[3].percentage is not None
    assert comparison.visual.metrics[3].percentage.display == "+200.0%"
    assert "2099-02-01 to 2099-02-28 compared with 2099-01-01 to 2099-01-31" in comparison.message

    zero_baseline_tag = unique_value(db_helper.namespace, "presentation-zero-baseline")
    asyncio.run(
        seed_ai_chat_transaction(
            db_helper,
            user_id=test_user_id,
            transaction_date=datetime(2099, 3, 10, 9, 0, tzinfo=UTC),
            amount=Decimal("-15.00"),
            note=unique_value(db_helper.namespace, "zero-baseline"),
            category_id=category_id,
            tags=[zero_baseline_tag],
            message_suffix="presentation-zero-baseline",
        )
    )
    zero_baseline = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "comparison_summary",
            "presentation": "summary",
            "filters": {"tags": zero_baseline_tag},
            "comparison": {
                "current_from_date": "2099-03-01",
                "current_to_date": "2099-03-31",
                "previous_from_date": "2099-02-01",
                "previous_to_date": "2099-02-28",
            },
        },
    )

    assert zero_baseline.visual is not None and zero_baseline.visual.kind == "summary"
    assert zero_baseline.visual.metrics[3].percentage is None
    assert "Percentage change is unavailable because the previous period was zero." in zero_baseline.message


def test_agent_directive_rejects_model_authored_fact_fields() -> None:
    with pytest.raises(ValidationError):
        AgentDirective.model_validate({"directive": "presented", "message": "You spent AED 999."})


def test_present_analysis_orders_expense_magnitudes_and_supports_income_and_balance_breakdowns(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    tag = unique_value(db_helper.namespace, "presentation-breakdown-measures")
    home_category_id = asyncio.run(db_helper.get_category_id_by_name("Home"))
    car_category_id = asyncio.run(db_helper.get_category_id_by_name("Car"))
    for category_id, amount, suffix in [
        (home_category_id, Decimal("-100.00"), "home-expense"),
        (car_category_id, Decimal("-10.00"), "car-expense"),
        (home_category_id, Decimal("50.00"), "home-income"),
    ]:
        asyncio.run(
            seed_ai_chat_transaction(
                db_helper,
                user_id=test_user_id,
                transaction_date=datetime(2101, 4, 10, 9, 0, tzinfo=UTC),
                amount=amount,
                note=unique_value(db_helper.namespace, suffix),
                category_id=category_id,
                tags=[tag],
                message_suffix=f"presentation-breakdown-measures-{suffix}",
            )
        )

    spending = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "category_spending",
            "presentation": "bar",
            "filters": {"tags": tag, "from_date": "2101-01-01", "to_date": "2101-12-31"},
        },
    )
    income = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "category_income",
            "presentation": "bar",
            "filters": {"tags": tag, "from_date": "2101-01-01", "to_date": "2101-12-31"},
        },
    )
    balance = _present(
        user_id=test_user_id,
        arguments={
            "analysis": "category_balance",
            "presentation": "table",
            "filters": {"tags": tag, "from_date": "2101-01-01", "to_date": "2101-12-31"},
        },
    )

    assert spending.visual is not None and spending.visual.kind == "bar"
    assert [(item.label, item.value.amount) for item in spending.visual.items] == [
        ("Home", "100.00"),
        ("Car", "10.00"),
    ]
    assert income.visual is not None and income.visual.kind == "bar"
    assert [(item.label, item.value.amount) for item in income.visual.items] == [("Home", "50.00")]
    assert balance.visual is not None and balance.visual.kind == "table"
    assert balance.visual.table_kind == "breakdown"
    assert [(row.label, row.value.amount) for row in balance.visual.rows] == [
        ("Home", "-50.00"),
        ("Car", "-10.00"),
    ]
