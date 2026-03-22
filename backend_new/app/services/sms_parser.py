from __future__ import annotations

import logging
from decimal import Decimal
from functools import lru_cache

from openai import APIError, APIStatusError, AsyncOpenAI
from pydantic import BaseModel, Field

from app.core.config import get_settings

logger = logging.getLogger(__name__)

SMS_PARSER_SYSTEM_PROMPT = "\n".join(
    [
        "You are an information extraction system for financial SMS alerts.",
        "Your task is to extract only what is explicitly written in the SMS text.",
        (
            "If the SMS lacks any required field or if extraction is uncertain, "
            "return an empty JSON object."
        ),
        "",
        "Extract the following fields:",
        (
            "- amount: A single numerical value, signed. Use a negative value for expenses "
            "(e.g. purchase, debit, payment). Use a positive value for income "
            "(e.g. credit, salary, refund)."
        ),
        '- currency: The currency code (ISO 4217) associated with the amount (e.g., "AED", "USD").',
        (
            "- note: The merchant/shop/entity name involved in the transaction, if clearly "
            "mentioned. If it's not presented in the SMS summarize the sms in few words"
        ),
        "",
        "Strict Rules:",
        (
            "1. Never infer or assume information not explicitly present. Only return what "
            "is clearly stated in the SMS."
        ),
        (
            "2. Always extract ONLY ONE AED amount if SMS contains more that one amount and "
            "currency. amount in AED has the highest priority."
        ),
        "3. Determine the sign of the amount:",
        "- Use a negative sign (-) for expenses like purchases, debits, payments.",
        "- Use a positive sign (+) for credits like refunds, deposits, earnings.",
        "4. If you cannot reliably extract all required fields, return an empty object: {}",
        (
            "5. If the SMS does not clearly match an expense or income, do not guess the "
            "sign — return {}."
        ),
        "",
        "Output format (as JSON):",
        "{",
        '  "amount": -123.45,',
        '  "currency": "AED",',
        '  "note": "Amazon"',
        "}",
        "If parsing fails, return: {}",
    ]
)


class ParsedSmsTransaction(BaseModel):
    amount: Decimal | None = Field(description="Amount of the transaction", default=None)
    currency: str | None = Field(
        description="Currency code (ISO 4217) of the transaction", default=None
    )
    note: str | None = Field(description="Note or description of the transaction", default=None)


@lru_cache(maxsize=1)
def _get_openai_client() -> AsyncOpenAI:
    settings = get_settings()
    return AsyncOpenAI(
        api_key=settings.openai_api_key,
        timeout=20.0,
    )


def _to_amount_fragment(amount: Decimal) -> str:
    as_text = format(amount.copy_abs(), "f")
    if "." in as_text:
        as_text = as_text.rstrip("0").rstrip(".")
    return as_text or "0"


def _get_parse_validation_failure_reason(
    parsed: ParsedSmsTransaction, message_text: str
) -> str | None:
    if parsed.amount is None:
        return "amount is missing"
    if parsed.amount == 0:
        return "amount equals zero"
    if parsed.currency is None or not parsed.currency.strip():
        return "currency is missing"

    amount_fragment = _to_amount_fragment(parsed.amount)
    lower_message_text = message_text.lower()
    if amount_fragment.lower() in lower_message_text:
        return None

    # Keep parity with grouped amount SMS formats like "2,343.00".
    normalized_message_text = lower_message_text.replace(",", "")
    if amount_fragment.lower() in normalized_message_text:
        return None
    return (
        "absolute amount fragment not found in source text "
        f"(fragment={amount_fragment})"
    )


async def parse_sms_transaction(message_text: str) -> ParsedSmsTransaction | None:
    settings = get_settings()
    if not settings.openai_api_key:
        logger.error("OpenAI API key is not configured")
        return None

    client = _get_openai_client()
    try:
        parsed_response = await client.responses.parse(
            model=settings.openai_model,
            temperature=0,
            instructions=SMS_PARSER_SYSTEM_PROMPT,
            input=message_text,
            text_format=ParsedSmsTransaction,
        )
    except APIStatusError as exc:
        logger.error(
            "OpenAI request failed with status %s: %s (%s)",
            exc.status_code,
            exc.response.text if exc.response is not None else "<no-body>",
            exc,
            exc_info=True,
        )
        return None
    except APIError as exc:
        logger.error(
            "Failed to parse SMS via OpenAI SDK: %s",
            exc,
            exc_info=True,
        )
        return None

    parsed = parsed_response.output_parsed
    if not isinstance(parsed, ParsedSmsTransaction):
        logger.info(
            "OpenAI parser returned unexpected output type: %s",
            type(parsed).__name__,
        )
        return None
    validation_failure_reason = _get_parse_validation_failure_reason(parsed, message_text)
    if validation_failure_reason is not None:
        logger.info(
            "SMS parse verification failed: %s (amount=%s currency=%s note=%s text=%r)",
            validation_failure_reason,
            parsed.amount,
            parsed.currency,
            parsed.note,
            message_text,
        )
        return None
    return parsed
