from __future__ import annotations

import asyncio
import json
import logging
from types import SimpleNamespace

import httpx2
import pytest
from openai import AsyncOpenAI, DefaultAsyncHttpx2Client

from app.core.logging import RedactingFormatter
from app.services import category_suggestion
from tests.test_category_suggestion import _CATALOG, _decision


def _invoke(monkeypatch, handler):
    async def run():
        async with AsyncOpenAI(
            api_key="test-key-NOT-FOR-LOGS",
            max_retries=0,
            http_client=DefaultAsyncHttpx2Client(transport=httpx2.MockTransport(handler)),
        ) as client:
            monkeypatch.setattr(
                category_suggestion, "get_settings", lambda: SimpleNamespace(openai_api_key="configured")
            )
            monkeypatch.setattr(category_suggestion, "_get_openai_client", lambda: client)
            return await category_suggestion._call_category_suggestion_llm(
                note="Кофе\n" + "x" * 3000,
                sms_text="Payment at Coffee — اختبار",
                amount=-10,
                currency="AED",
                examples=[{"note": "Previous Coffee", "amount": -15, "category_id": 50}],
                categories=_CATALOG,
                user_id=123,
                transaction_id=3400,
            )

    return asyncio.run(run())


def _records(caplog):
    return [record for record in caplog.records if record.name == category_suggestion.__name__]


def test_decision_logs_full_input_output_usage_and_correlation(monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger=category_suggestion.__name__)
    wire_requests = []
    output = _decision()

    def handler(request):
        wire_requests.append(json.loads(request.content))
        return httpx2.Response(
            200,
            request=request,
            json=output,
            headers={"x-request-id": "req_log_success", "set-cookie": "NOT-FOR-LOGS"},
        )

    result = _invoke(monkeypatch, handler)
    assert result.top_category_id == 50
    requested, response, decoded = _records(caplog)
    assert requested.getMessage() == "event=category_decision_requested"
    assert requested.request == wire_requests[0]
    assert json.loads(requested.request["input"])["transaction"]["note"] == "Кофе\n" + "x" * 3000
    assert response.response == output
    assert response.request_id == decoded.request_id == "req_log_success"
    assert decoded.result == result.model_dump(mode="json")
    assert decoded.result["alternatives"] == [69]
    assert response.response["usage"]["total_tokens"] == 100
    assert response.elapsed_ms >= 0
    assert len({record.decision_call_id for record in _records(caplog)}) == 1
    assert all(record.transaction_id == 3400 and record.user_id == 123 for record in _records(caplog))
    assert all(record.endpoint == "/v1/decisions" for record in _records(caplog))

    # Validate the actual production formatter, not just caplog's plain message.
    rendered = RedactingFormatter("%(message)s").format(requested)
    assert "\n" not in rendered
    fields = json.loads(rendered.split(" | extra=", 1)[1])
    assert fields["request"] == wire_requests[0]
    assert all("NOT-FOR-LOGS" not in RedactingFormatter().format(record) for record in _records(caplog))


@pytest.mark.parametrize("choice", ["unknown", category_suggestion.CATEGORY_ABSTAIN, "refusal"])
def test_invalid_abstained_or_refused_decision_preserves_full_response(monkeypatch, caplog, choice):
    caplog.set_level(logging.INFO, logger=category_suggestion.__name__)
    output = _decision(choice)
    if choice == "refusal":
        output["answers"] = [{"type": "refusal", "name": "category"}]

    def handler(request):
        return httpx2.Response(200, request=request, json=output, headers={"x-request-id": "req_log_invalid"})

    result = _invoke(monkeypatch, handler)
    requested, response, final = _records(caplog)
    assert response.response == output
    assert response.request_id == "req_log_invalid"
    assert requested.decision_call_id == response.decision_call_id == final.decision_call_id
    if choice == category_suggestion.CATEGORY_ABSTAIN:
        assert result.top_category_id is None
        assert final.result["top_category_id"] is None
    else:
        assert result is None
        assert final.getMessage().startswith("event=category_decision_invalid")
        assert final.exc_info


@pytest.mark.parametrize("status", [401, 429, 500])
def test_api_error_logs_status_body_request_id_and_input(monkeypatch, caplog, status):
    caplog.set_level(logging.INFO, logger=category_suggestion.__name__)
    output = {"error": {"message": "Synthetic API error", "type": "test_error", "code": "test_code"}}

    def handler(request):
        return httpx2.Response(
            status,
            request=request,
            json=output,
            headers={"x-request-id": "req_log_error", "set-cookie": "NOT-FOR-LOGS"},
        )

    assert _invoke(monkeypatch, handler) is None
    requested, failed = _records(caplog)
    assert failed.getMessage().startswith("event=category_decision_failed")
    assert requested.decision_call_id == failed.decision_call_id
    assert failed.status_code == status
    assert failed.request_id == "req_log_error"
    assert json.loads(failed.response) == output
    assert failed.elapsed_ms >= 0
    assert failed.error_type
    assert failed.exc_info
    assert all("NOT-FOR-LOGS" not in RedactingFormatter().format(record) for record in _records(caplog))


def test_connection_failure_is_logged_without_inventing_response(monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger=category_suggestion.__name__)

    def handler(request):
        raise httpx2.ConnectError("Synthetic connection failure", request=request)

    assert _invoke(monkeypatch, handler) is None
    requested, failed = _records(caplog)
    assert requested.decision_call_id == failed.decision_call_id
    assert failed.response is None
    assert failed.request_id is None
    assert failed.status_code is None
    assert failed.error_type == "APIConnectionError"


def test_provider_echo_of_runtime_key_is_redacted_from_complete_error_log(monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger=category_suggestion.__name__)
    secret = "test-key-NOT-FOR-LOGS"

    def handler(request):
        return httpx2.Response(
            401,
            request=request,
            json={"error": {"message": f"Incorrect API key provided: {secret}"}},
        )

    assert _invoke(monkeypatch, handler) is None
    formatter = RedactingFormatter(secrets=(secret,))
    requested, failed = _records(caplog)
    rendered = formatter.format(failed)
    assert secret not in rendered
    assert "NOT-FOR-LOGS" not in rendered
    assert "Incorrect API key provided: ***" in rendered
    assert "Traceback" in rendered
    assert json.loads(requested.request["input"])["transaction"]["sms_text"] == "Payment at Coffee — اختبار"


def test_each_decision_call_has_a_distinct_log_id(monkeypatch, caplog):
    caplog.set_level(logging.INFO, logger=category_suggestion.__name__)

    def handler(request):
        return httpx2.Response(200, request=request, json=_decision())

    _invoke(monkeypatch, handler)
    _invoke(monkeypatch, handler)
    ids = [record.decision_call_id for record in _records(caplog) if hasattr(record, "request")]
    assert len(ids) == len(set(ids)) == 2
