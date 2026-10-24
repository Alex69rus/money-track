from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest
from openai.types.decision import Decision

from app.db.queries import SimilarCategoryExample
from app.schemas.responses import CategoryResponse, TransactionResponse
from app.services.category_suggestion import (
    CATEGORY_ABSTAIN,
    CATEGORY_DECISION_INSTRUCTIONS,
    CATEGORY_SUGGESTION_MODEL,
    CategorySuggestionLlmOutput,
    _call_category_suggestion_llm,
    _decode_category_decision,
    build_default_category_actions,
    suggest_and_apply_transaction_category,
)


@dataclass
class _FakeCategoryDecisions:
    output: object | None = None
    calls: list[dict[str, object]] = field(default_factory=list)

    async def create(self, **kwargs: object) -> object:
        self.calls.append(kwargs)
        return self.output


@dataclass
class _FakeCategoryClient:
    decisions: _FakeCategoryDecisions


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


def test_category_suggestion_uses_decisions_with_luna6(monkeypatch) -> None:
    decisions = _FakeCategoryDecisions(output=Decision.model_validate(_decision()))
    monkeypatch.setattr(
        "app.services.category_suggestion.get_settings", lambda: SimpleNamespace(openai_api_key="test-key")
    )
    monkeypatch.setattr("app.services.category_suggestion._get_openai_client", lambda: _FakeCategoryClient(decisions))
    result = asyncio.run(
        _call_category_suggestion_llm(
            note="Coffee",
            sms_text="Payment of AED 10 at Coffee",
            amount=-10.0,
            currency="AED",
            examples=[],
            categories=_CATALOG,
        )
    )
    assert result is not None
    assert result.top_category_id == 50
    (request,) = decisions.calls
    assert request["model"] == CATEGORY_SUGGESTION_MODEL == "gpt-6-luna"
    assert "reasoning" not in request
    assert "temperature" not in request
    assert json.loads(request["input"]) == {
        "transaction": {
            "note": "Coffee",
            "sms_text": "Payment of AED 10 at Coffee",
            "amount": -10.0,
            "currency": "AED",
        },
        "examples": [],
    }
    assert request["questions"] == [
        {
            "type": "choice",
            "name": "category",
            "instructions": CATEGORY_DECISION_INSTRUCTIONS,
            "choices": [{"value": str(c["id"]), "description": f"{c['name']} ({c['type']})"} for c in _CATALOG]
            + [{"value": CATEGORY_ABSTAIN, "description": "No supplied category is supported by sufficient evidence."}],
        }
    ]


_CATALOG = [{"id": 50, "name": "Groceries", "type": "Expense"}, {"id": 69, "name": "Salary", "type": "Income"}]


def _decision(choice: str = "50") -> dict[str, object]:
    return {
        "model": CATEGORY_SUGGESTION_MODEL,
        "answers": [
            {
                "type": "choice",
                "name": "category",
                "choice": choice,
                "confidence": 0.8,
                "probabilities": [
                    {"value": "50", "probability": 0.8},
                    {"value": "69", "probability": 0.1},
                    {"value": CATEGORY_ABSTAIN, "probability": 0.1},
                ],
            }
        ],
        "usage": {
            "input_tokens": 100,
            "output_tokens": 0,
            "total_tokens": 100,
            "input_tokens_details": {"cached_tokens": 0, "cache_write_tokens": 0},
            "output_tokens_details": {"reasoning_tokens": 0},
        },
    }


def test_decision_ranks_valid_alternatives_without_inventing_an_explanation() -> None:
    output = _decode_category_decision(Decision.model_validate(_decision()), _CATALOG)
    assert output.top_category_id == 50
    assert output.alternatives == [69]
    assert output.reason is None
    assert output.confidence == 0.8


def test_abstention_stays_null_and_can_still_offer_category_alternatives() -> None:
    output = _decode_category_decision(Decision.model_validate(_decision(CATEGORY_ABSTAIN)), _CATALOG)
    assert output.top_category_id is None
    assert output.alternatives == [50, 69]


@pytest.mark.parametrize("mutation", ["unknown_choice", "unknown_probability", "missing_probability", "duplicate"])
def test_malformed_decision_never_becomes_a_valid_category(mutation: str) -> None:
    payload = _decision()
    answer = payload["answers"][0]
    if mutation == "unknown_choice":
        answer["choice"] = "999999"
    elif mutation == "unknown_probability":
        answer["probabilities"][0]["value"] = "999999"
    elif mutation == "missing_probability":
        answer["probabilities"].pop()
    else:
        answer["probabilities"].append(answer["probabilities"][0])
    with pytest.raises(ValueError):
        _decode_category_decision(Decision.model_validate(payload), _CATALOG)


def test_decision_refusal_does_not_count_as_ordinary_abstention() -> None:
    payload = _decision()
    payload["answers"] = [{"type": "refusal", "name": "category", "refusal": "Unavailable"}]
    with pytest.raises(ValueError):
        _decode_category_decision(Decision.model_validate(payload), _CATALOG)


@pytest.mark.parametrize("count", [0, 255])
def test_category_catalog_outside_decision_limits_uses_fallback(monkeypatch, count) -> None:
    monkeypatch.setattr(
        "app.services.category_suggestion.get_settings", lambda: SimpleNamespace(openai_api_key="test-key")
    )

    def unexpected_client():
        pytest.fail("Invalid catalog must not call OpenAI")

    monkeypatch.setattr("app.services.category_suggestion._get_openai_client", unexpected_client)
    assert (
        asyncio.run(
            _call_category_suggestion_llm(
                note="Coffee",
                sms_text="Coffee",
                amount=-10,
                currency="AED",
                examples=[],
                categories=[{"id": i, "name": "Category", "type": "Expense"} for i in range(count)],
            )
        )
        is None
    )


@pytest.mark.parametrize("count", [1, 254])
def test_category_catalog_accepts_decision_boundaries(monkeypatch, count) -> None:
    catalog = [{"id": i, "name": f"Category {i}", "type": "Expense"} for i in range(count)]
    payload = _decision("0")
    payload["answers"][0]["probabilities"] = [
        {"value": str(i), "probability": 1.0 if i == 0 else 0.0} for i in range(count)
    ] + [{"value": CATEGORY_ABSTAIN, "probability": 0.0}]
    decisions = _FakeCategoryDecisions(output=Decision.model_validate(payload))
    monkeypatch.setattr(
        "app.services.category_suggestion.get_settings", lambda: SimpleNamespace(openai_api_key="test-key")
    )
    monkeypatch.setattr("app.services.category_suggestion._get_openai_client", lambda: _FakeCategoryClient(decisions))
    result = asyncio.run(
        _call_category_suggestion_llm(
            note="Coffee",
            sms_text="Coffee",
            amount=-10,
            currency="AED",
            examples=[],
            categories=catalog,
        )
    )
    assert result is not None
    assert result.top_category_id == 0
    assert len(decisions.calls[0]["questions"][0]["choices"]) == count + 1


def test_invalid_decision_returns_none_for_existing_fallback(monkeypatch) -> None:
    payload = _decision("unknown")
    decisions = _FakeCategoryDecisions(output=Decision.model_validate(payload))
    monkeypatch.setattr(
        "app.services.category_suggestion.get_settings", lambda: SimpleNamespace(openai_api_key="test-key")
    )
    monkeypatch.setattr("app.services.category_suggestion._get_openai_client", lambda: _FakeCategoryClient(decisions))
    assert (
        asyncio.run(
            _call_category_suggestion_llm(
                note="Coffee",
                sms_text="Coffee",
                amount=-10,
                currency="AED",
                examples=[],
                categories=_CATALOG,
            )
        )
        is None
    )
