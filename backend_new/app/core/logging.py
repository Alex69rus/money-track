import logging
import re

_TELEGRAM_BOT_URL_PATTERN = re.compile(r"(https?://api\.telegram\.org/bot)([^/\s]+)")
_TELEGRAM_BOT_TOKEN_PATTERN = re.compile(r"\b(\d{6,12}:)([A-Za-z0-9_-]{20,})\b")


def _redact_secrets(message: str) -> str:
    redacted = _TELEGRAM_BOT_URL_PATTERN.sub(r"\1***", message)
    redacted = _TELEGRAM_BOT_TOKEN_PATTERN.sub(r"\1***", redacted)
    return redacted


class RedactingFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        rendered = super().format(record)
        return _redact_secrets(rendered)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(
        RedactingFormatter(
            fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        )
    )
    logging.basicConfig(
        level=logging.INFO,
        handlers=[handler],
        force=True,
    )
