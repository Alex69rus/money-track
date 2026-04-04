from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from functools import lru_cache

from openai import APIError, APIStatusError, AsyncOpenAI
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.db.queries import (
    fetch_categories,
    fetch_similar_category_examples,
    update_transaction_category_for_user,
)
from app.schemas.responses import CategoryResponse, TransactionResponse

logger = logging.getLogger(__name__)

CATEGORY_SUGGESTION_SYSTEM_PROMPT = "\n".join(
    [
        "You classify one financial transaction into existing categories.",
        "Choose only category IDs from the provided list.",
        "Use historical examples as a strong signal, especially note-prefix matches.",
        "If evidence is weak, you may abstain by leaving top_category_id null.",
        "Return valid JSON matching the schema only.",
    ]
)


@dataclass(frozen=True)
class CategoryActionOption:
    category_id: int
    category_name: str


@dataclass(frozen=True)
class CategorySuggestionResult:
    applied_category_id: int | None
    applied_category_name: str | None
    top3_options: list[CategoryActionOption]


class CategorySuggestionLlmOutput(BaseModel):
    top_category_id: int | None = Field(default=None)
    alternatives: list[int] = Field(default_factory=list)
    confidence: float | None = Field(default=None)
    reason: str | None = Field(default=None)


@lru_cache(maxsize=1)
def _get_openai_client() -> AsyncOpenAI:
    settings = get_settings()
    return AsyncOpenAI(
        api_key=settings.openai_api_key,
        timeout=20.0,
    )


def _dedup_keep_order(values: list[int]) -> list[int]:
    deduped: list[int] = []
    seen: set[int] = set()
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)
    return deduped


def _build_top3_ids(
    *,
    seed_ids: list[int],
    fallback_ids: list[int],
) -> list[int]:
    merged = _dedup_keep_order(seed_ids + fallback_ids)
    return merged[:3]


def _build_fallback_priority(
    *,
    amount: float | None,
    categories: list[CategoryResponse],
) -> list[int]:
    ordered_category_ids = [category.id for category in categories]
    if amount is None or amount == 0:
        return ordered_category_ids

    desired_type = "income" if amount > 0 else "expense"
    sign_matched_ids = [category.id for category in categories if category.type.strip().lower() == desired_type]
    if not sign_matched_ids:
        return ordered_category_ids

    return _dedup_keep_order(sign_matched_ids + ordered_category_ids)


async def _call_category_suggestion_llm(
    *,
    note: str | None,
    sms_text: str | None,
    amount: float,
    currency: str,
    examples: list[dict[str, object]],
    categories: list[dict[str, object]],
) -> CategorySuggestionLlmOutput | None:
    settings = get_settings()
    if not settings.openai_api_key:
        logger.error("OpenAI API key is not configured for category suggestion")
        return None

    payload = {
        "transaction": {
            "note": note or "",
            "sms_text": sms_text or "",
            "amount": amount,
            "currency": currency,
        },
        "examples": examples,
        "categories": categories,
    }
    client = _get_openai_client()
    try:
        parsed_response = await client.responses.parse(
            model=settings.openai_model,
            temperature=0,
            instructions=CATEGORY_SUGGESTION_SYSTEM_PROMPT,
            input=json.dumps(payload, ensure_ascii=True),
            text_format=CategorySuggestionLlmOutput,
        )
    except APIStatusError as exc:
        logger.error(
            "Category suggestion OpenAI request failed with status %s: %s (%s)",
            exc.status_code,
            exc.response.text if exc.response is not None else "<no-body>",
            exc,
            exc_info=True,
        )
        return None
    except APIError as exc:
        logger.error(
            "Failed to classify category via OpenAI SDK: %s",
            exc,
            exc_info=True,
        )
        return None

    parsed = parsed_response.output_parsed
    if not isinstance(parsed, CategorySuggestionLlmOutput):
        logger.error(
            "Category suggestion parser returned unexpected output type: %s",
            type(parsed).__name__,
        )
        return None
    return parsed


async def build_default_category_actions(
    *,
    preferred_category_id: int | None = None,
    amount: float | None = None,
) -> CategorySuggestionResult:
    categories = await fetch_categories()
    category_map = {category.id: category for category in categories}
    fallback_ids = _build_fallback_priority(amount=amount, categories=categories)

    seed_ids: list[int] = []
    if preferred_category_id is not None and preferred_category_id in category_map:
        seed_ids.append(preferred_category_id)
    top3_ids = _build_top3_ids(seed_ids=seed_ids, fallback_ids=fallback_ids)

    top3_options = [
        CategoryActionOption(
            category_id=category_id,
            category_name=category_map[category_id].name,
        )
        for category_id in top3_ids
    ]
    applied_category_name = (
        category_map[preferred_category_id].name
        if preferred_category_id is not None and preferred_category_id in category_map
        else None
    )
    return CategorySuggestionResult(
        applied_category_id=preferred_category_id,
        applied_category_name=applied_category_name,
        top3_options=top3_options,
    )


async def suggest_and_apply_transaction_category(
    *,
    user_id: int,
    transaction: TransactionResponse,
) -> CategorySuggestionResult:
    try:
        categories = await fetch_categories()
        if not categories:
            logger.info(
                "event=category_suggestion_skipped_no_candidates user_id=%s transaction_id=%s reason=no_categories",
                user_id,
                transaction.id,
            )
            return CategorySuggestionResult(
                applied_category_id=transaction.categoryId,
                applied_category_name=None,
                top3_options=[],
            )

        category_map = {category.id: category for category in categories}
        fallback_ids = _build_fallback_priority(amount=transaction.amount, categories=categories)

        note_prefix = (transaction.note or "").strip()
        similar_examples = await fetch_similar_category_examples(
            user_id=user_id,
            note_prefix=note_prefix,
            exclude_transaction_id=transaction.id,
            limit=3,
        )

        logger.info(
            "event=category_suggestion_attempted user_id=%s transaction_id=%s examples=%s categories=%s",
            user_id,
            transaction.id,
            len(similar_examples),
            len(categories),
        )

        llm_output = await _call_category_suggestion_llm(
            note=transaction.note,
            sms_text=transaction.smsText,
            amount=transaction.amount,
            currency=transaction.currency,
            examples=[
                {
                    "note": example.note,
                    "amount": float(example.amount),
                    "category_id": example.category_id,
                    "category_name": example.category_name,
                }
                for example in similar_examples
            ],
            categories=[
                {
                    "id": category.id,
                    "name": category.name,
                    "type": category.type,
                }
                for category in categories
            ],
        )

        valid_category_ids = set(category_map.keys())
        llm_seed_ids: list[int] = []
        top_category_id: int | None = None
        if llm_output is not None:
            if llm_output.top_category_id is not None and llm_output.top_category_id in valid_category_ids:
                top_category_id = llm_output.top_category_id
                llm_seed_ids.append(top_category_id)
            llm_seed_ids.extend(
                [category_id for category_id in llm_output.alternatives if category_id in valid_category_ids]
            )
        llm_seed_ids = _dedup_keep_order(llm_seed_ids)

        if not llm_seed_ids:
            logger.info(
                (
                    "event=category_suggestion_skipped_no_candidates "
                    "user_id=%s transaction_id=%s reason=no_valid_llm_suggestions"
                ),
                user_id,
                transaction.id,
            )

        top3_ids = _build_top3_ids(seed_ids=llm_seed_ids, fallback_ids=fallback_ids)
        top3_options = [
            CategoryActionOption(
                category_id=category_id,
                category_name=category_map[category_id].name,
            )
            for category_id in top3_ids
        ]

        applied_category_id = transaction.categoryId
        if top_category_id is not None:
            updated = await update_transaction_category_for_user(
                user_id=user_id,
                transaction_id=transaction.id,
                category_id=top_category_id,
            )
            if updated is not None:
                applied_category_id = updated.categoryId
                logger.info(
                    "event=category_suggestion_applied user_id=%s transaction_id=%s category_id=%s",
                    user_id,
                    transaction.id,
                    applied_category_id,
                )

        applied_category_name = (
            category_map[applied_category_id].name
            if applied_category_id is not None and applied_category_id in category_map
            else None
        )
        return CategorySuggestionResult(
            applied_category_id=applied_category_id,
            applied_category_name=applied_category_name,
            top3_options=top3_options,
        )
    except Exception as exc:
        logger.error(
            "event=category_suggestion_failed user_id=%s transaction_id=%s error=%s",
            user_id,
            transaction.id,
            exc,
            exc_info=True,
        )
        return await build_default_category_actions(
            preferred_category_id=transaction.categoryId,
            amount=transaction.amount,
        )
