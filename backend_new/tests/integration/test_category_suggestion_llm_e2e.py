from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from pathlib import Path

import pytest

from app.core.config import get_settings
from app.services.category_suggestion import (
    CategorySuggestionLlmOutput,
    _call_category_suggestion_llm,
    _get_openai_client,
)


@dataclass(frozen=True)
class CategorySuggestionE2ECase:
    name: str
    source_response_id: str | None
    note: str
    sms_text: str
    amount: float
    currency: str
    expected_top_category_id: int | None
    examples: tuple[dict[str, object], ...] = ()
    categories: tuple[dict[str, object], ...] | None = None


# Real production category-suggestion requests recovered from the OpenAI Platform
# logs on 2026-08-27. Local and CI calls with categories prefixed `it_` are excluded.
PRODUCTION_CATEGORIES: list[dict[str, object]] = [
    {"id": 69, "name": "Apique salary", "type": "Income"},
    {"id": 50, "name": "Groceries", "type": "Expense"},
    {"id": 51, "name": "Eating Out", "type": "Expense"},
    {"id": 70, "name": "Luda's income", "type": "Income"},
    {"id": 52, "name": "Entertainment", "type": "Expense"},
    {"id": 71, "name": "Savings interests", "type": "Income"},
    {"id": 72, "name": "Apique salary Transfer from USD", "type": "Income"},
    {"id": 53, "name": "Luda's job", "type": "Expense"},
    {"id": 54, "name": "Beauty", "type": "Expense"},
    {"id": 73, "name": "Rus transfer", "type": "Income"},
    {"id": 55, "name": "Clothing & Shoes", "type": "Expense"},
    {"id": 74, "name": "Other income", "type": "Income"},
    {"id": 56, "name": "Home", "type": "Expense"},
    {"id": 75, "name": "Furniture", "type": "Expense"},
    {"id": 76, "name": "Household Goods", "type": "Expense"},
    {"id": 77, "name": "Maintenance & Renovation", "type": "Expense"},
    {"id": 78, "name": "Rent", "type": "Expense"},
    {"id": 79, "name": "Utility", "type": "Expense"},
    {"id": 57, "name": "Car", "type": "Expense"},
    {"id": 80, "name": "Fuel", "type": "Expense"},
    {"id": 81, "name": "Car Wash", "type": "Expense"},
    {"id": 82, "name": "Parking & Toll roads", "type": "Expense"},
    {"id": 58, "name": "Kids", "type": "Expense"},
    {"id": 83, "name": "Toys", "type": "Expense"},
    {"id": 84, "name": "Classes", "type": "Expense"},
    {"id": 85, "name": "Baby Clothes", "type": "Expense"},
    {"id": 59, "name": "Healthcare", "type": "Expense"},
    {"id": 86, "name": "Medical Services", "type": "Expense"},
    {"id": 87, "name": "Medicines", "type": "Expense"},
    {"id": 60, "name": "Communication", "type": "Expense"},
    {"id": 88, "name": "Cellular", "type": "Expense"},
    {"id": 89, "name": "Internet-Services", "type": "Expense"},
    {"id": 61, "name": "Alcohol", "type": "Expense"},
    {"id": 62, "name": "Transport", "type": "Expense"},
    {"id": 90, "name": "Public transport", "type": "Expense"},
    {"id": 91, "name": "Taxis", "type": "Expense"},
    {"id": 92, "name": "Carsharing", "type": "Expense"},
    {"id": 63, "name": "Pets", "type": "Expense"},
    {"id": 93, "name": "Pet Food", "type": "Expense"},
    {"id": 94, "name": "Veterinary Services", "type": "Expense"},
    {"id": 95, "name": "Accessories & Toys", "type": "Expense"},
    {"id": 64, "name": "Education", "type": "Expense"},
    {"id": 65, "name": "Travel", "type": "Expense"},
    {"id": 96, "name": "Tickets", "type": "Expense"},
    {"id": 97, "name": "Hotel", "type": "Expense"},
    {"id": 66, "name": "Etc.", "type": "Expense"},
    {"id": 98, "name": "Gifts", "type": "Expense"},
    {"id": 99, "name": "Charity", "type": "Expense"},
    {"id": 67, "name": "Hardware", "type": "Expense"},
    {"id": 68, "name": "Legalisation", "type": "Expense"},
]


CATEGORY_SUGGESTION_E2E_CASES: list[CategorySuggestionE2ECase] = [
    CategorySuggestionE2ECase(
        name="carrefour_exact_history",
        source_response_id="resp_0a61640558561301006a90472f513487d09091e9c5de44cafe",
        note="Carrefour",
        sms_text="Payment of AED 69.47 was done at Carrefour using your Wio Personal card 9759 with Credit money",
        amount=-69.47,
        currency="AED",
        expected_top_category_id=50,
        examples=({"note": "Carrefour", "amount": -41.98, "category_id": 50, "category_name": "Groceries"},),
    ),
    CategorySuggestionE2ECase(
        name="mcdonalds_exact_history",
        source_response_id="resp_083f7769fefae3f4006a9023e28a6487d0bae751e930ffff4c",
        note="McDonalds",
        sms_text="Payment of AED 8 was done at McDonalds using your Wio Personal card 9759 with Credit money",
        amount=-8.0,
        currency="AED",
        expected_top_category_id=51,
        examples=({"note": "McDonalds", "amount": -14.0, "category_id": 51, "category_name": "Eating Out"},),
    ),
    CategorySuggestionE2ECase(
        name="stradivarius_exact_history",
        source_response_id="resp_042d61e5712fe647006a902f64627487d0958758bdd42a5287",
        note="Stradivarius",
        sms_text="Payment of AED 199 was done at Stradivarius using your Wio Personal card 9759 with Credit money",
        amount=-199.0,
        currency="AED",
        expected_top_category_id=55,
        examples=({"note": "Stradivarius", "amount": -26.0, "category_id": 55, "category_name": "Clothing & Shoes"},),
    ),
    CategorySuggestionE2ECase(
        name="lefties_exact_history",
        source_response_id="resp_0234609c161a6fab006a902f578bb487d0a43e507d76d42f10",
        note="Lefties",
        sms_text="Payment of AED 104 was done at Lefties using your Wio Personal card 9759 with Credit money",
        amount=-104.0,
        currency="AED",
        expected_top_category_id=55,
        examples=({"note": "Lefties", "amount": -49.0, "category_id": 55, "category_name": "Clothing & Shoes"},),
    ),
    CategorySuggestionE2ECase(
        name="new_yorker_exact_history",
        source_response_id="resp_0448482bc2312b45006a9023e9bfc487d09643516defc6be5c",
        note="New Yorker",
        sms_text="Payment of AED 35 was done at New Yorker using your Wio Personal card 9759 with Credit money",
        amount=-35.0,
        currency="AED",
        expected_top_category_id=55,
        examples=({"note": "New Yorker", "amount": -60.0, "category_id": 55, "category_name": "Clothing & Shoes"},),
    ),
    CategorySuggestionE2ECase(
        name="katrina_conflicting_history",
        source_response_id="resp_07fb2827422500c8006a902374e5d887d0a404df9db862b70d",
        note="Katrina Sweet Confectionery",
        sms_text=(
            "Payment of AED 44.96 was done at Katrina Sweet Confectionery using your Wio Personal card 9759 "
            "with Credit money"
        ),
        amount=-44.96,
        currency="AED",
        expected_top_category_id=51,
        examples=(
            {
                "note": "Katrina Sweet Confectionery",
                "amount": -58.0,
                "category_id": 51,
                "category_name": "Eating Out",
            },
            {
                "note": "Katrina Sweet Confectionery",
                "amount": -12.5,
                "category_id": 50,
                "category_name": "Groceries",
            },
        ),
    ),
    CategorySuggestionE2ECase(
        name="enoc_conflicting_history",
        source_response_id="resp_09124f469a3cd5e3006a9023be211c87d0a177b873aa79080a",
        note="ENOC",
        sms_text="Payment of AED 142.82 was done at ENOC using your Wio Personal card 9759 with Credit money",
        amount=-142.82,
        currency="AED",
        expected_top_category_id=80,
        examples=(
            {"note": "ENOC", "amount": -240.7, "category_id": 80, "category_name": "Fuel"},
            {"note": "ENOC", "amount": -4.0, "category_id": 50, "category_name": "Groceries"},
            {"note": "ENOC", "amount": -38.0, "category_id": 81, "category_name": "Car Wash"},
        ),
    ),
    CategorySuggestionE2ECase(
        name="bath_body_conflicting_history",
        source_response_id="resp_0768d7f9dd55157f006a9023c4414087d0a4dc3f5795f73a24",
        note="Bath body d",
        sms_text="Payment of AED 38 was done at Bath body d using your Wio Personal card 9759 with Credit money",
        amount=-38.0,
        currency="AED",
        expected_top_category_id=76,
        examples=(
            {"note": "Bath body d", "amount": -64.0, "category_id": 66, "category_name": "Etc."},
            {
                "note": "Bath body d",
                "amount": -45.0,
                "category_id": 76,
                "category_name": "Household Goods",
            },
        ),
    ),
]


# Synthetic cases cover new merchants and abstention when the catalog is incomplete.
_RESTRICTED_CATEGORIES = tuple(c for c in PRODUCTION_CATEGORIES if c["id"] in {50, 69})
CATEGORY_SUGGESTION_E2E_CASES += [
    CategorySuggestionE2ECase(
        name="fuel_without_history",
        source_response_id=None,
        note="ENOC petrol station",
        sms_text="Payment of AED 150 for petrol at ENOC.",
        amount=-150,
        currency="AED",
        expected_top_category_id=80,
    ),
    CategorySuggestionE2ECase(
        name="pharmacy_without_history",
        source_response_id=None,
        note="City Pharmacy",
        sms_text="Purchase of prescription medicines at City Pharmacy for AED 75.",
        amount=-75,
        currency="AED",
        expected_top_category_id=87,
    ),
    CategorySuggestionE2ECase(
        name="internet_without_history",
        source_response_id=None,
        note="FiberNet",
        sms_text="Payment of AED 300 to FiberNet for the monthly home internet subscription.",
        amount=-300,
        currency="AED",
        expected_top_category_id=89,
    ),
    CategorySuggestionE2ECase(
        name="salary_with_history",
        source_response_id=None,
        note="Example Employer",
        sms_text="Salary of AED 12000 credited by Example Employer.",
        amount=12000,
        currency="AED",
        expected_top_category_id=69,
        examples=(
            {"note": "Example Employer", "amount": 12000.0, "category_id": 69, "category_name": "Apique salary"},
        ),
    ),
    CategorySuggestionE2ECase(
        name="medicine_outside_catalog",
        source_response_id=None,
        note="City Pharmacy",
        sms_text="Purchase of prescription medicines at City Pharmacy for AED 75.",
        amount=-75,
        currency="AED",
        expected_top_category_id=None,
        categories=_RESTRICTED_CATEGORIES,
    ),
    CategorySuggestionE2ECase(
        name="rent_outside_catalog",
        source_response_id=None,
        note="Apartment rent",
        sms_text="Payment of AED 6000 to the landlord for monthly apartment rent.",
        amount=-6000,
        currency="AED",
        expected_top_category_id=None,
        categories=_RESTRICTED_CATEGORIES,
    ),
]


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
    return os.getenv(key) or _read_env_file_values().get(key)


def _seed_required_runtime_env() -> None:
    for key, value in _read_env_file_values().items():
        os.environ[key] = value
    get_settings.cache_clear()


def _require_llm_e2e_enabled() -> None:
    _seed_required_runtime_env()
    run_llm_e2e = _env_value("RUN_LLM_E2E")
    if run_llm_e2e not in {"1", "true", "TRUE", "yes", "YES"}:
        pytest.skip("Set RUN_LLM_E2E=1 (env or backend_new/.env) to run real LLM category tests.")
    if not _env_value("OPENAI_API_KEY"):
        pytest.skip("Set OPENAI_API_KEY (env or backend_new/.env) to run real LLM category tests.")
    if not CATEGORY_SUGGESTION_E2E_CASES:
        pytest.skip("No production category-suggestion e2e cases configured yet.")


async def _suggest_with_test_client(case: CategorySuggestionE2ECase) -> CategorySuggestionLlmOutput | None:
    # The test's loop must also own the lifetime of the pooled SDK client.
    _get_openai_client.cache_clear()
    try:
        async with _get_openai_client():
            return await _call_category_suggestion_llm(
                note=case.note,
                sms_text=case.sms_text,
                amount=case.amount,
                currency=case.currency,
                examples=list(case.examples),
                categories=list(case.categories) if case.categories is not None else PRODUCTION_CATEGORIES,
            )
    finally:
        _get_openai_client.cache_clear()


@pytest.mark.parametrize("case", CATEGORY_SUGGESTION_E2E_CASES, ids=lambda case: case.name)
def test_category_suggestion_real_llm(case: CategorySuggestionE2ECase) -> None:
    _require_llm_e2e_enabled()
    result = asyncio.run(_suggest_with_test_client(case))

    assert result is not None, f"No parsed category output for {case.name} (source={case.source_response_id})"
    assert result.top_category_id == case.expected_top_category_id, (
        f"Unexpected top category for {case.name} (source={case.source_response_id}): "
        f"actual={result.top_category_id} expected={case.expected_top_category_id}"
    )
