from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass

from app.core.config import get_settings

CALLBACK_VERSION = "cs1"
ACTION_SET = "s"
ACTION_REMOVE = "r"


@dataclass(frozen=True)
class CategoryCallbackPayload:
    user_id: int
    transaction_id: int
    action: str
    category_id: int | None


def _to_base36(value: int) -> str:
    if value < 0:
        raise ValueError("value must be non-negative")
    if value == 0:
        return "0"
    alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
    result = ""
    current = value
    while current:
        current, remainder = divmod(current, 36)
        result = alphabet[remainder] + result
    return result


def _from_base36(value: str) -> int:
    return int(value, 36)


def _sign(raw_payload: str) -> str:
    secret = get_settings().telegram_webhook_secret.encode("utf-8")
    digest = hmac.new(secret, raw_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return digest[:16]


def encode_category_callback_data(
    *,
    user_id: int,
    transaction_id: int,
    action: str,
    category_id: int | None,
) -> str:
    if action not in {ACTION_SET, ACTION_REMOVE}:
        raise ValueError("unsupported callback action")
    if action == ACTION_SET and category_id is None:
        raise ValueError("category_id is required for set action")
    if action == ACTION_REMOVE:
        category_fragment = "0"
    else:
        if category_id is None:
            raise ValueError("category_id is required for set action")
        category_fragment = _to_base36(category_id)

    parts = [
        CALLBACK_VERSION,
        _to_base36(user_id),
        _to_base36(transaction_id),
        action,
        category_fragment,
    ]
    raw_payload = ":".join(parts)
    signature = _sign(raw_payload)
    return f"{raw_payload}:{signature}"


def decode_category_callback_data(payload: str) -> CategoryCallbackPayload | None:
    parts = payload.split(":")
    if len(parts) != 6:
        return None
    version, user_fragment, tx_fragment, action, category_fragment, signature = parts
    if version != CALLBACK_VERSION:
        return None
    if action not in {ACTION_SET, ACTION_REMOVE}:
        return None

    raw_payload = ":".join(parts[:-1])
    expected_signature = _sign(raw_payload)
    if not hmac.compare_digest(expected_signature, signature):
        return None

    try:
        user_id = _from_base36(user_fragment)
        transaction_id = _from_base36(tx_fragment)
    except ValueError:
        return None

    category_id: int | None
    if action == ACTION_REMOVE:
        if category_fragment != "0":
            return None
        category_id = None
    else:
        try:
            category_id = _from_base36(category_fragment)
        except ValueError:
            return None
        if category_id <= 0:
            return None

    return CategoryCallbackPayload(
        user_id=user_id,
        transaction_id=transaction_id,
        action=action,
        category_id=category_id,
    )
