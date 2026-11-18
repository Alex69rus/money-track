import json
import logging
import re
import sys
from typing import Any
from urllib.parse import quote, quote_plus

from opentelemetry import trace
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs._internal import std_to_otel
from opentelemetry.trace import format_span_id, format_trace_id

_TELEGRAM_BOT_URL_PATTERN = re.compile(r"(https?://api\.telegram\.org/bot)([^/\s]+)")
_TELEGRAM_BOT_TOKEN_PATTERN = re.compile(r"\b(\d{6,12}:)([A-Za-z0-9_-]{20,})\b")
_OPENAI_API_KEY_PATTERN = re.compile(r"\bsk-[A-Za-z0-9_-]{20,}")
_RESERVED_LOG_RECORD_FIELDS = set(logging.makeLogRecord({}).__dict__.keys())
_DERIVED_FORMATTER_FIELDS = {"message", "asctime"}


def _redact_secrets(message: str) -> str:
    redacted = _TELEGRAM_BOT_URL_PATTERN.sub(r"\1***", message)
    redacted = _TELEGRAM_BOT_TOKEN_PATTERN.sub(r"\1***", redacted)
    redacted = _OPENAI_API_KEY_PATTERN.sub("sk-***", redacted)
    return redacted


class SecretRedactor:
    def __init__(self, secrets: tuple[str, ...]) -> None:
        forms: set[str] = set()
        for secret in filter(None, secrets):
            forms.update((secret, quote(secret, safe=""), quote_plus(secret), repr(secret)[1:-1]))
            # Decisions can contain JSON inside JSON, also rendered inside log extras.
            for ensure_ascii in (False, True):
                escaped = secret
                for _ in range(3):
                    escaped = json.dumps(escaped, ensure_ascii=ensure_ascii)[1:-1]
                    forms.add(escaped)
        self._pattern = re.compile("|".join(map(re.escape, sorted(forms, key=len, reverse=True)))) if forms else None

    def redact(self, message: str) -> str:
        if self._pattern is not None:
            message = self._pattern.sub("***", message)
        return _redact_secrets(message)


class RedactingFormatter(logging.Formatter):
    def __init__(
        self, fmt: str | None = None, *, secrets: tuple[str, ...] = (), redactor: SecretRedactor | None = None
    ) -> None:
        super().__init__(fmt=fmt)
        self._redactor = redactor if redactor is not None else SecretRedactor(secrets)

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
        return self._redactor.redact(rendered)


class RedactingStreamHandler(logging.StreamHandler):  # type: ignore[type-arg]
    def handleError(self, record: logging.LogRecord) -> None:  # noqa: N802
        # logging.Handler.handleError can write the original message and arguments.
        sys.stderr.write("Dropped a log record that could not be rendered.\n")


class OpenTelemetryLogHandler(logging.Handler):
    def __init__(self, provider: LoggerProvider, redactor: SecretRedactor) -> None:
        super().__init__()
        self._provider = provider
        self._redactor = redactor
        self.setFormatter(RedactingFormatter(redactor=redactor))

    def emit(self, record: logging.LogRecord) -> None:
        # Keep exporter diagnostics on the console to prevent re-enqueuing failed exports.
        if record.name != "uvicorn" and not record.name.startswith(("app.", "uvicorn.")):
            return
        try:
            name = self._redactor.redact(record.name)
            self._provider.get_logger(name).emit(
                timestamp=int(record.created * 1_000_000_000),
                severity_text=self._redactor.redact(record.levelname),
                severity_number=std_to_otel(record.levelno),
                body=self.format(record),
                attributes={"logger.name": name},
            )
        except Exception:
            sys.stderr.write("Dropped a log record that could not be exported safely.\n")


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


class HealthAccessLogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # Uvicorn passes client, method, target, HTTP version and status as separate arguments.
        args = record.args
        if not isinstance(args, tuple) or len(args) != 5:
            return True
        _, method, target, _, status = args
        return not (
            method in ("GET", "HEAD")
            and isinstance(target, str)
            and target.split("?", 1)[0] == "/health"
            and isinstance(status, int)
            and 200 <= status < 300
        )


_health_access_filter = HealthAccessLogFilter()


def configure_logging(redactor: SecretRedactor, provider: LoggerProvider | None) -> None:
    handler = RedactingStreamHandler()
    handler.addFilter(OpenTelemetryContextFilter())
    handler.setFormatter(
        RedactingFormatter(
            fmt="%(asctime)s %(levelname)s [%(name)s] trace_id=%(trace_id)s span_id=%(span_id)s %(message)s",
            redactor=redactor,
        )
    )
    logging.basicConfig(
        level=logging.INFO,
        handlers=[handler, OpenTelemetryLogHandler(provider, redactor)] if provider is not None else [handler],
        force=True,
    )
    logging.getLogger("uvicorn.access").addFilter(_health_access_filter)
    if provider is not None:
        # Uvicorn configures its own handlers, which otherwise bypass the root logger.
        for name in ("uvicorn", "uvicorn.access"):
            server_logger = logging.getLogger(name)
            server_logger.handlers.clear()
            server_logger.propagate = True
