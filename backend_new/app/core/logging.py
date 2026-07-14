import json
import logging
import re
from typing import Any

from opentelemetry import trace
from opentelemetry.trace import format_span_id, format_trace_id

_TELEGRAM_BOT_URL_PATTERN = re.compile(r"(https?://api\.telegram\.org/bot)([^/\s]+)")
_TELEGRAM_BOT_TOKEN_PATTERN = re.compile(r"\b(\d{6,12}:)([A-Za-z0-9_-]{20,})\b")
_RESERVED_LOG_RECORD_FIELDS = set(logging.makeLogRecord({}).__dict__.keys())
_DERIVED_FORMATTER_FIELDS = {"message", "asctime"}


def _redact_secrets(message: str) -> str:
    redacted = _TELEGRAM_BOT_URL_PATTERN.sub(r"\1***", message)
    redacted = _TELEGRAM_BOT_TOKEN_PATTERN.sub(r"\1***", redacted)
    return redacted


class RedactingFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        rendered = super().format(record)
        extra_fields: dict[str, Any] = {
            key: value
            for key, value in record.__dict__.items()
            if key not in _RESERVED_LOG_RECORD_FIELDS
            and key not in _DERIVED_FORMATTER_FIELDS
            and key not in {"trace_id", "span_id"}
            and not key.startswith("_")
        }
        if extra_fields:
            serialized = json.dumps(extra_fields, ensure_ascii=False, default=str, sort_keys=True)
            rendered = f"{rendered} | extra={serialized}"
        return _redact_secrets(rendered)


class OpenTelemetryContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        span_context = trace.get_current_span().get_span_context()
        if span_context.is_valid:
            record.trace_id = format_trace_id(span_context.trace_id)
            record.span_id = format_span_id(span_context.span_id)
            return True

        record.trace_id = "0" * 32
        record.span_id = "0" * 16
        return True


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.addFilter(OpenTelemetryContextFilter())
    handler.setFormatter(
        RedactingFormatter(
            fmt="%(asctime)s %(levelname)s [%(name)s] trace_id=%(trace_id)s span_id=%(span_id)s %(message)s",
        )
    )
    logging.basicConfig(
        level=logging.INFO,
        handlers=[handler],
        force=True,
    )
