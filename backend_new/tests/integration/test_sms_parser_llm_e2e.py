from __future__ import annotations

import asyncio
import os
import re
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

import pytest
from rapidfuzz import fuzz

from app.core.config import get_settings
from app.services.sms_parser import parse_sms_transaction


@dataclass(frozen=True)
class SmsParserE2ECase:
    name: str
    input_text: str
    expected_amount: Decimal | None
    expected_currency: str | None
    expected_note: str | None


SMS_PARSER_E2E_CASES: list[SmsParserE2ECase] = [
    SmsParserE2ECase(
        name="wio_usd_with_aed_converted_amount",
        input_text=(
            "Payment of USD 10 (AED 37) was done at Github inc using your Wio Personal card 1234 with Credit money"
        ),
        expected_amount=Decimal("-37"),
        expected_currency="AED",
        expected_note="Github inc",
    ),
    SmsParserE2ECase(
        name="loan_installment_with_grouped_amount",
        input_text=(
            "AED 2,343.00 has been debited from your account 123XXX45XXX67 "
            "for loan installment. The available balance is AED 658.63"
        ),
        expected_amount=Decimal("-2343"),
        expected_currency="AED",
        expected_note="loan installment",
    ),
    SmsParserE2ECase(
        name="apple_purchase_with_balance",
        input_text=(
            "Purchase of AED 27.99 with Debit Card ending 5854 at APPLE.COM/BILL, CORK. "
            "Avl Balance is AED 5,096.69.  Pls refer stmt"
        ),
        expected_amount=Decimal("-27.99"),
        expected_currency="AED",
        expected_note="APPLE.COM/BILL",
    ),
    SmsParserE2ECase(
        name="wio_purchase_with_grouped_amount",
        input_text=(
            "Payment of AED 3,345.3 was done at Sukoon insurance using your Wio Personal card 1234 with Credit money"
        ),
        expected_amount=Decimal("-3345.3"),
        expected_currency="AED",
        expected_note="Sukoon insurance",
    ),
    SmsParserE2ECase(
        name="short_investment_line",
        input_text="-377.75 AED investments",
        expected_amount=Decimal("-377.75"),
        expected_currency="AED",
        expected_note="investments",
    ),
    # SmsParserE2ECase(
    #     name="russian_dirham_text",
    #     input_text="-340 дирхам на носочки",
    #     expected_amount=Decimal("-340"),
    #     expected_currency="AED",
    #     expected_note="на носочки",
    # ),
    SmsParserE2ECase(
        name="cbd_loan_installment_compact_aed",
        input_text=("A loan installment of AED5211.56 for LMF*****3355 is debited from CBD account #xxx1234"),
        expected_amount=Decimal("-5211.56"),
        expected_currency="AED",
        expected_note="loan installment for LMF*****3355",
    ),
    SmsParserE2ECase(
        name="salary_credit",
        input_text=(
            "AED 12,000.00 has been credited to your account no. 101XXX34XXX02 DTB "
            "SALARY SPBZXC122345Z7X8 BY ORCHID DEVELOPMENT LIMITEDSalary"
        ),
        expected_amount=Decimal("12000.00"),
        expected_currency="AED",
        expected_note="ORCHID DEVELOPMENT LIMITEDSalary",
    ),
]

NEGATIVE_SMS_PARSER_CASES = ["Hello!", "/"]
NOTE_FUZZY_THRESHOLD = 90.0


def _read_env_value(key: str) -> str | None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return None

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip()
    return None


def _read_env_file_values() -> dict[str, str]:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def _env_value(key: str) -> str | None:
    return os.getenv(key) or _read_env_value(key)


def _seed_required_runtime_env() -> None:
    env_values = _read_env_file_values()
    for key, value in env_values.items():
        os.environ[key] = value

    get_settings.cache_clear()


def _require_llm_e2e_enabled() -> None:
    _seed_required_runtime_env()

    run_llm_e2e = _env_value("RUN_LLM_E2E")
    if run_llm_e2e not in {"1", "true", "TRUE", "yes", "YES"}:
        pytest.skip("Set RUN_LLM_E2E=1 (env or backend_new/.env) to run real LLM parser tests.")
    if not _env_value("OPENAI_API_KEY"):
        pytest.skip("Set OPENAI_API_KEY (env or backend_new/.env) to run real LLM parser tests.")
    if not SMS_PARSER_E2E_CASES:
        pytest.skip("No SMS parser e2e cases configured yet.")


def _normalize_note(value: str) -> str:
    lowered = value.lower().strip()
    alnum_only = re.sub(r"[^\w\s]", " ", lowered)
    return " ".join(alnum_only.split())


@pytest.mark.parametrize("case", SMS_PARSER_E2E_CASES, ids=lambda case: case.name)
def test_sms_parser_real_llm(case: SmsParserE2ECase) -> None:
    _require_llm_e2e_enabled()

    parsed = asyncio.run(parse_sms_transaction(case.input_text))

    if case.expected_amount is None and case.expected_currency is None and case.expected_note is None:
        assert parsed is None
        return

    assert parsed is not None
    assert parsed.amount == case.expected_amount
    assert parsed.currency == case.expected_currency
    assert parsed.note is not None

    actual_note = _normalize_note(parsed.note)
    expected_note = _normalize_note(case.expected_note or "")
    similarity = fuzz.ratio(actual_note, expected_note)
    assert similarity >= NOTE_FUZZY_THRESHOLD, (
        f"Note similarity too low: actual={parsed.note!r} expected={case.expected_note!r} "
        f"score={similarity:.2f} threshold={NOTE_FUZZY_THRESHOLD:.2f}"
    )


@pytest.mark.parametrize("input_text", NEGATIVE_SMS_PARSER_CASES)
def test_sms_parser_real_llm_negative(input_text: str) -> None:
    _require_llm_e2e_enabled()
    parsed = asyncio.run(parse_sms_transaction(input_text))
    assert parsed is None
