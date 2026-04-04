from __future__ import annotations

from app.core.config import get_settings
from app.services.telegram_callback_data import (
    ACTION_REMOVE,
    ACTION_SET,
    decode_category_callback_data,
    encode_category_callback_data,
)


def test_callback_data_roundtrip_for_set(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres:password@127.0.0.1:5432/moneytrack")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "secret-value")
    get_settings.cache_clear()

    encoded = encode_category_callback_data(
        user_id=123456,
        transaction_id=987,
        action=ACTION_SET,
        category_id=44,
    )
    decoded = decode_category_callback_data(encoded)

    assert decoded is not None
    assert decoded.user_id == 123456
    assert decoded.transaction_id == 987
    assert decoded.action == ACTION_SET
    assert decoded.category_id == 44


def test_callback_data_roundtrip_for_remove(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres:password@127.0.0.1:5432/moneytrack")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "secret-value")
    get_settings.cache_clear()

    encoded = encode_category_callback_data(
        user_id=123456,
        transaction_id=987,
        action=ACTION_REMOVE,
        category_id=None,
    )
    decoded = decode_category_callback_data(encoded)

    assert decoded is not None
    assert decoded.user_id == 123456
    assert decoded.transaction_id == 987
    assert decoded.action == ACTION_REMOVE
    assert decoded.category_id is None


def test_callback_data_rejects_signature_tampering(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql://postgres:password@127.0.0.1:5432/moneytrack")
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", "secret-value")
    get_settings.cache_clear()

    encoded = encode_category_callback_data(
        user_id=123456,
        transaction_id=987,
        action=ACTION_SET,
        category_id=44,
    )
    tampered = encoded[:-1] + ("0" if encoded[-1] != "0" else "1")
    decoded = decode_category_callback_data(tampered)

    assert decoded is None
