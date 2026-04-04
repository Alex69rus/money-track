from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from decimal import Decimal

from app.db.queries import SimilarCategoryExample
from app.schemas.responses import CategoryResponse, TransactionResponse
from app.services.category_suggestion import (
    CategorySuggestionLlmOutput,
    build_default_category_actions,
    suggest_and_apply_transaction_category,
)


def _category(
    *,
    category_id: int,
    name: str,
    order_index: int,
    category_type: str = "Expense",
) -> CategoryResponse:
    return CategoryResponse(
        id=category_id,
        name=name,
        type=category_type,
        color=None,
        icon=None,
        parentCategoryId=None,
        orderIndex=order_index,
        createdAt=datetime(2025, 9, 19, tzinfo=UTC),
    )


def _transaction(
    *,
    category_id: int | None = None,
    amount: float = 107.68,
    sms_text: str = "Payment of AED 107.68 was done at Amazon",
) -> TransactionResponse:
    return TransactionResponse(
        id=77,
        userId=123,
        transactionDate=datetime(2025, 9, 19, tzinfo=UTC),
        amount=amount,
        note="Amazon",
        categoryId=category_id,
        tags=[],
        currency="AED",
        smsText=sms_text,
        messageId="15",
        createdAt=datetime(2025, 9, 19, tzinfo=UTC),
        category=None,
    )


def test_build_default_category_actions_prefers_current_category(monkeypatch) -> None:
    categories = [
        _category(category_id=1, name="Groceries", order_index=1),
        _category(category_id=2, name="Eating Out", order_index=2),
        _category(category_id=3, name="Home", order_index=3),
        _category(category_id=4, name="Travel", order_index=4),
    ]

    async def _fetch_categories():
        return categories

    monkeypatch.setattr("app.services.category_suggestion.fetch_categories", _fetch_categories)

    result = asyncio.run(build_default_category_actions(preferred_category_id=3))

    assert result.applied_category_id == 3
    assert result.applied_category_name == "Home"
    assert [option.category_id for option in result.top3_options] == [3, 1, 2]


def test_suggestion_filters_invalid_llm_ids_and_uses_fallback(monkeypatch) -> None:
    categories = [
        _category(category_id=1, name="Groceries", order_index=1),
        _category(category_id=2, name="Eating Out", order_index=2),
        _category(category_id=3, name="Home", order_index=3),
        _category(category_id=4, name="Travel", order_index=4),
    ]

    async def _fetch_categories():
        return categories

    async def _fetch_examples(**_kwargs):
        return [
            SimilarCategoryExample(
                note="Amazon",
                amount=Decimal("-12.30"),
                category_id=1,
                category_name="Groceries",
            )
        ]

    async def _call_llm(**_kwargs):
        return CategorySuggestionLlmOutput(
            top_category_id=999,
            alternatives=[2, 2, 333],
            confidence=0.6,
            reason="test",
        )

    update_calls = 0

    async def _update(**_kwargs):
        nonlocal update_calls
        update_calls += 1
        return None

    monkeypatch.setattr("app.services.category_suggestion.fetch_categories", _fetch_categories)
    monkeypatch.setattr("app.services.category_suggestion.fetch_similar_category_examples", _fetch_examples)
    monkeypatch.setattr("app.services.category_suggestion._call_category_suggestion_llm", _call_llm)
    monkeypatch.setattr("app.services.category_suggestion.update_transaction_category_for_user", _update)

    result = asyncio.run(
        suggest_and_apply_transaction_category(
            user_id=123,
            transaction=_transaction(),
        )
    )

    assert result.applied_category_id is None
    assert [option.category_id for option in result.top3_options] == [2, 1, 3]
    assert update_calls == 0


def test_suggestion_applies_valid_top_category(monkeypatch) -> None:
    categories = [
        _category(category_id=1, name="Groceries", order_index=1),
        _category(category_id=2, name="Eating Out", order_index=2),
        _category(category_id=3, name="Home", order_index=3),
        _category(category_id=4, name="Travel", order_index=4),
    ]

    async def _fetch_categories():
        return categories

    async def _fetch_examples(**_kwargs):
        return []

    async def _call_llm(**_kwargs):
        return CategorySuggestionLlmOutput(
            top_category_id=3,
            alternatives=[3, 1, 2],
            confidence=0.9,
            reason="test",
        )

    async def _update(**_kwargs):
        return _transaction(category_id=3)

    monkeypatch.setattr("app.services.category_suggestion.fetch_categories", _fetch_categories)
    monkeypatch.setattr("app.services.category_suggestion.fetch_similar_category_examples", _fetch_examples)
    monkeypatch.setattr("app.services.category_suggestion._call_category_suggestion_llm", _call_llm)
    monkeypatch.setattr("app.services.category_suggestion.update_transaction_category_for_user", _update)

    result = asyncio.run(
        suggest_and_apply_transaction_category(
            user_id=123,
            transaction=_transaction(),
        )
    )

    assert result.applied_category_id == 3
    assert result.applied_category_name == "Home"
    assert [option.category_id for option in result.top3_options] == [3, 1, 2]


def test_build_default_category_actions_prioritizes_income_for_positive_amount(monkeypatch) -> None:
    categories = [
        _category(category_id=1, name="Groceries", order_index=1, category_type="Expense"),
        _category(category_id=2, name="Salary", order_index=2, category_type="Income"),
        _category(category_id=3, name="Home", order_index=3, category_type="Expense"),
        _category(category_id=4, name="Bonus", order_index=4, category_type="Income"),
    ]

    async def _fetch_categories():
        return categories

    monkeypatch.setattr("app.services.category_suggestion.fetch_categories", _fetch_categories)

    result = asyncio.run(build_default_category_actions(amount=120.0))

    assert [option.category_id for option in result.top3_options] == [2, 4, 1]


def test_suggestion_sends_sms_text_to_llm(monkeypatch) -> None:
    categories = [
        _category(category_id=1, name="Groceries", order_index=1),
        _category(category_id=2, name="Eating Out", order_index=2),
        _category(category_id=3, name="Home", order_index=3),
    ]

    async def _fetch_categories():
        return categories

    async def _fetch_examples(**_kwargs):
        return []

    captured_sms_text: dict[str, str] = {}

    async def _call_llm(**kwargs):
        captured_sms_text["value"] = str(kwargs["sms_text"])
        return CategorySuggestionLlmOutput(
            top_category_id=None,
            alternatives=[],
            confidence=0.0,
            reason="test",
        )

    monkeypatch.setattr("app.services.category_suggestion.fetch_categories", _fetch_categories)
    monkeypatch.setattr("app.services.category_suggestion.fetch_similar_category_examples", _fetch_examples)
    monkeypatch.setattr("app.services.category_suggestion._call_category_suggestion_llm", _call_llm)

    sms_text = "Payment of AED 50 was done at Grocery"
    asyncio.run(
        suggest_and_apply_transaction_category(
            user_id=123,
            transaction=_transaction(sms_text=sms_text),
        )
    )

    assert captured_sms_text["value"] == sms_text
