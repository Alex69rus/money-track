from __future__ import annotations

import hashlib
import hmac
import json
import logging
from urllib.parse import parse_qsl

from fastapi import Header

from app.core.config import get_settings
from app.core.exceptions import UnauthorizedError

logger = logging.getLogger(__name__)


def _extract_user_id(init_data: str) -> int | None:
    try:
        data = dict(parse_qsl(init_data, keep_blank_values=True))
        user_raw = data.get("user")
        if not user_raw:
            return None
        payload = json.loads(user_raw)
        user_id = payload.get("id")
        return int(user_id) if user_id is not None else None
    except (ValueError, json.JSONDecodeError, TypeError):
        return None


def _validate_init_data(init_data: str, bot_token: str) -> bool:
    pairs = parse_qsl(init_data, keep_blank_values=True)
    values = {key: value for key, value in pairs}
    recv_hash = values.get("hash")
    if not recv_hash:
        logger.warning("No hash found in Telegram init data")
        return False

    check_items = [f"{key}={value}" for key, value in sorted(pairs) if key != "hash"]
    data_check_string = "\n".join(check_items)
    secret = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    expected = hmac.new(secret, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, recv_hash)


def get_current_user_id(x_telegram_init_data: str | None = Header(default=None)) -> int:
    settings = get_settings()
    if settings.environment == "Development":
        logger.info("Development mode: Skipping Telegram authentication, using test user ID")
        return 123456789

    if not x_telegram_init_data:
        raise UnauthorizedError("Missing Telegram authentication data")

    if not _validate_init_data(x_telegram_init_data, settings.telegram_bot_token):
        raise UnauthorizedError("Invalid Telegram authentication data")

    user_id = _extract_user_id(x_telegram_init_data)
    if user_id is None:
        raise UnauthorizedError("Invalid user data in Telegram authentication")

    return user_id
