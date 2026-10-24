from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from decimal import Decimal
from types import SimpleNamespace

from pydantic import ValidationError

from app.services.sms_parser import (
    SMS_PARSER_MODEL,
    SMS_PARSER_REASONING_EFFORT,
    ParsedSmsTransaction,
    parse_sms_transaction,
)


@dataclass
class _FakeResponses:
    output_parsed: object | None = None
    error: Exception | None = None
    calls: list[dict[str, object]] = field(default_factory=list)

    async def parse(self, **kwargs: object) -> object:
        self.calls.append(kwargs)
        if self.error is not None:
            raise self.error
        return SimpleNamespace(output_parsed=self.output_parsed)


@dataclass
class _FakeClient:
    responses: _FakeResponses


def _install_parser_dependencies(
    monkeypatch,
    *,
    output_parsed: object | None = None,
    error: Exception | None = None,
) -> _FakeResponses:
    responses = _FakeResponses(output_parsed=output_parsed, error=error)
    settings = SimpleNamespace(openai_api_key="test-key")
    monkeypatch.setattr("app.services.sms_parser.get_settings", lambda: settings)
    monkeypatch.setattr("app.services.sms_parser._get_openai_client", lambda: _FakeClient(responses))
    return responses


def test_luna_request_uses_hardcoded_low_reasoning_with_auto_summary(monkeypatch) -> None:
    responses = _install_parser_dependencies(
        monkeypatch,
        output_parsed=ParsedSmsTransaction(
            amount=Decimal("-44.96"),
            currency="AED",
            note="Katrina Sweet Confectionery",
        ),
    )

    parsed = asyncio.run(
        parse_sms_transaction(
            "Payment of AED 44.96 was done at Katrina Sweet Confectionery using your Wio Personal card 9759."
        )
    )

    assert parsed is not None
    assert parsed.amount == Decimal("-44.96")
    assert parsed.currency == "AED"
    assert parsed.note == "Katrina Sweet Confectionery"
    assert len(responses.calls) == 1
    request = responses.calls[0]
    assert request["model"] == SMS_PARSER_MODEL == "gpt-6-luna"
    assert (
        request["reasoning"]
        == {
            "effort": SMS_PARSER_REASONING_EFFORT,
            "summary": "auto",
        }
        == {"effort": "low", "summary": "auto"}
    )
    assert "temperature" not in request
    assert request["text_format"] is ParsedSmsTransaction


def test_sms_decimal_structured_output_schema_is_numeric() -> None:
    schema = ParsedSmsTransaction.model_json_schema()
    amount_schema = schema["properties"]["amount"]

    assert amount_schema["anyOf"] == [{"type": "number"}, {"type": "null"}]
    assert "pattern" not in str(amount_schema)

    parsed = ParsedSmsTransaction.model_validate_json('{"amount": -44.96, "currency": "AED", "note": "Coffee"}')
    assert isinstance(parsed.amount, Decimal)
    assert parsed.amount == Decimal("-44.96")


def test_sms_parser_handles_sdk_validation_error(monkeypatch) -> None:
    try:
        ParsedSmsTransaction.model_validate({"amount": []})
    except ValidationError as error:
        validation_error = error
    else:  # pragma: no cover - required to satisfy static analysis
        raise AssertionError("Expected a Pydantic validation error")

    _install_parser_dependencies(
        monkeypatch,
        error=validation_error,
    )

    parsed = asyncio.run(parse_sms_transaction("Payment of AED 10 was done at Coffee"))

    assert parsed is None
