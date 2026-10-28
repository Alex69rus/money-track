import asyncio
import json
from datetime import UTC, datetime
from unittest.mock import AsyncMock, patch

from openai.types.decision import Decision

from app.schemas.responses import CategoryResponse, TransactionResponse
from app.services import category_suggestion as s

catalog = [
    (69, "Apique salary", "Income"),
    (50, "Groceries", "Expense"),
    (51, "Eating Out", "Expense"),
    (55, "Clothing & Shoes", "Expense"),
    (74, "Other income", "Income"),
]
candidates = [dict(id=i, name=n, type=t) for i, n, t in catalog]
usage = dict(
    input_tokens=100,
    output_tokens=0,
    total_tokens=100,
    input_tokens_details=dict(cached_tokens=0, cache_write_tokens=0),
    output_tokens_details=dict(reasoning_tokens=0),
)


def decode(scores):
    return s._decode_category_decision(
        Decision.model_validate(
            dict(
                model=s.CATEGORY_SUGGESTION_MODEL,
                answers=[
                    dict(
                        type="choice",
                        name="category",
                        choice="55",
                        confidence=scores[55],
                        probabilities=[dict(value=str(i), probability=scores[i]) for i, _, _ in catalog]
                        + [dict(value="abstain", probability=0.0)],
                    )
                ],
                usage=usage,
            )
        ),
        candidates,
    )


async def main():
    output = decode({55: 0.999, 74: 0.0006, 69: 0.0003, 50: 0.00006, 51: 0.00004})
    now = datetime(2026, 10, 27, 16, 22, 13, tzinfo=UTC)
    categories = [
        CategoryResponse(
            id=i, name=n, type=t, color=None, icon=None, parentCategoryId=None, orderIndex=idx, createdAt=now
        )
        for idx, (i, n, t) in enumerate(catalog)
    ]
    transaction = TransactionResponse(
        id=999,
        userId=123,
        messageId="999",
        transactionDate=now,
        amount=-50,
        currency="AED",
        note="Clothes",
        smsText="-50 AED for clothes",
        categoryId=None,
        tags=[],
        createdAt=now,
        category=None,
    )
    with (
        patch.object(s, "fetch_categories", AsyncMock(return_value=categories)),
        patch.object(s, "fetch_similar_category_examples", AsyncMock(return_value=[])),
        patch.object(s, "_call_category_suggestion_llm", AsyncMock(return_value=output)),
        patch.object(
            s,
            "update_transaction_category_for_user",
            AsyncMock(return_value=transaction.model_copy(update=dict(categoryId=55))),
        ),
    ):
        result = await s.suggest_and_apply_transaction_category(user_id=123, transaction=transaction)
    assert [x.category_name for x in result.top3_options] == ["Clothing & Shoes", "Groceries", "Eating Out"]
    print(
        json.dumps(
            dict(
                synthetic_distribution=True,
                confidence=output.confidence,
                applied_category=result.applied_category_name,
                buttons=[x.category_name for x in result.top3_options],
            ),
            indent=2,
        )
    )
    tied = decode({55: 1.0, 74: 0.0, 69: 0.0, 50: 0.0, 51: 0.0})
    assert tied.alternatives == [69, 50]
    print(json.dumps(dict(zero_probability_alternatives=tied.alternatives)))


asyncio.run(main())
