from __future__ import annotations

import logging
from dataclasses import dataclass

from app.db.queries import (
    fetch_category_name_by_id,
    fetch_transaction_by_id_for_user,
    update_transaction_category_for_user,
)
from app.services.telegram_callback_data import (
    ACTION_REMOVE,
    ACTION_SET,
    CategoryCallbackPayload,
)

logger = logging.getLogger(__name__)

REMOVE_CONFIRMATION_TEXT = "Category removed. You can set it manually in app."
GENERIC_UPDATE_ERROR_TEXT = "Could not update category. Please try again."


@dataclass(frozen=True)
class CategoryActionResult:
    success: bool
    message: str


async def apply_category_callback_action(
    *,
    actor_user_id: int,
    payload: CategoryCallbackPayload,
) -> CategoryActionResult:
    if actor_user_id != payload.user_id:
        return CategoryActionResult(success=False, message=GENERIC_UPDATE_ERROR_TEXT)

    transaction = await fetch_transaction_by_id_for_user(
        user_id=actor_user_id,
        transaction_id=payload.transaction_id,
    )
    if transaction is None:
        return CategoryActionResult(success=False, message=GENERIC_UPDATE_ERROR_TEXT)

    if payload.action == ACTION_SET:
        if payload.category_id is None:
            return CategoryActionResult(success=False, message=GENERIC_UPDATE_ERROR_TEXT)

        category_name = await fetch_category_name_by_id(category_id=payload.category_id)
        if category_name is None:
            return CategoryActionResult(success=False, message=GENERIC_UPDATE_ERROR_TEXT)

        if transaction.categoryId != payload.category_id:
            updated = await update_transaction_category_for_user(
                user_id=actor_user_id,
                transaction_id=payload.transaction_id,
                category_id=payload.category_id,
            )
            if updated is None:
                return CategoryActionResult(success=False, message=GENERIC_UPDATE_ERROR_TEXT)
            logger.info(
                "event=category_overridden_by_user user_id=%s transaction_id=%s category_id=%s",
                actor_user_id,
                payload.transaction_id,
                payload.category_id,
            )

        return CategoryActionResult(
            success=True,
            message=f"Category updated to: {category_name}",
        )

    if payload.action == ACTION_REMOVE:
        if transaction.categoryId is None:
            return CategoryActionResult(success=True, message=REMOVE_CONFIRMATION_TEXT)

        updated = await update_transaction_category_for_user(
            user_id=actor_user_id,
            transaction_id=payload.transaction_id,
            category_id=None,
        )
        if updated is None:
            return CategoryActionResult(success=False, message=GENERIC_UPDATE_ERROR_TEXT)

        logger.info(
            "event=category_removed_by_user user_id=%s transaction_id=%s",
            actor_user_id,
            payload.transaction_id,
        )
        return CategoryActionResult(success=True, message=REMOVE_CONFIRMATION_TEXT)

    return CategoryActionResult(success=False, message=GENERIC_UPDATE_ERROR_TEXT)
