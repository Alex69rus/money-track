from app.core.logging import _redact_secrets


def test_redact_telegram_bot_url_token() -> None:
    message = (
        'HTTP Request: POST '
        'https://api.telegram.org/bot1234567890:TEST_TOKEN_FOR_LOG_REDACTION_123456/sendMessage '
        '"HTTP/1.1 200 OK"'
    )
    redacted = _redact_secrets(message)
    assert "bot***" in redacted
    assert "TEST_TOKEN_FOR_LOG_REDACTION_123456" not in redacted


def test_redact_raw_telegram_bot_token() -> None:
    message = "Token leaked: 1234567890:TEST_TOKEN_FOR_LOG_REDACTION_123456"
    redacted = _redact_secrets(message)
    assert redacted == "Token leaked: 1234567890:***"
