import logging

from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider

from app.core.logging import OpenTelemetryContextFilter, RedactingFormatter, _redact_secrets


def test_redact_telegram_bot_url_token() -> None:
    message = (
        "HTTP Request: POST "
        "https://api.telegram.org/bot1234567890:TEST_TOKEN_FOR_LOG_REDACTION_123456/sendMessage "
        '"HTTP/1.1 200 OK"'
    )
    redacted = _redact_secrets(message)
    assert "bot***" in redacted
    assert "TEST_TOKEN_FOR_LOG_REDACTION_123456" not in redacted


def test_redact_raw_telegram_bot_token() -> None:
    message = "Token leaked: 1234567890:TEST_TOKEN_FOR_LOG_REDACTION_123456"
    redacted = _redact_secrets(message)
    assert redacted == "Token leaked: 1234567890:***"


def test_opentelemetry_filter_injects_zero_ids_without_active_span() -> None:
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="hello",
        args=(),
        exc_info=None,
    )
    allowed = OpenTelemetryContextFilter().filter(record)
    assert allowed is True
    assert record.trace_id == "0" * 32
    assert record.span_id == "0" * 16


def test_redacting_formatter_includes_trace_and_span_and_extra() -> None:
    provider = TracerProvider(resource=Resource.create({"service.name": "test-logging"}))
    tracer = provider.get_tracer("tests.logging")

    with tracer.start_as_current_span("log-span"):
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg="payload event",
            args=(),
            exc_info=None,
        )
        record.payload = {"a": 1}
        OpenTelemetryContextFilter().filter(record)
        formatter = RedactingFormatter(
            fmt="%(levelname)s trace_id=%(trace_id)s span_id=%(span_id)s %(message)s",
        )
        rendered = formatter.format(record)

    assert "trace_id=" in rendered
    assert "span_id=" in rendered
    assert "extra=" in rendered
    assert '"payload": {"a": 1}' in rendered
