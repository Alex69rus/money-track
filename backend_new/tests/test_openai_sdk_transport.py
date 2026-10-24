"""Exercise real SDK 3/Agents adapters with HTTPX2; these tests never use the network."""

from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace

import httpx2
from agents import Agent, OpenAIResponsesModel, RunConfig, Runner
from openai import AsyncOpenAI, DefaultAsyncHttpx2Client

from app.services import category_suggestion, sms_parser


def _response(model: str, text: str) -> dict[str, object]:
    return {
        "id": "resp_transport_test",
        "object": "response",
        "created_at": 0,
        "status": "completed",
        "model": model,
        "output": [
            {
                "type": "message",
                "id": "msg_transport_test",
                "role": "assistant",
                "status": "completed",
                "content": [{"type": "output_text", "text": text, "annotations": []}],
            }
        ],
        "usage": {
            "input_tokens": 10,
            "output_tokens": 5,
            "total_tokens": 15,
            "input_tokens_details": {"cached_tokens": 0},
            "output_tokens_details": {"reasoning_tokens": 0},
        },
    }


def test_sms_parser_uses_sdk3_structured_output_over_native_httpx2(monkeypatch) -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        assert request.url.path == "/v1/responses"
        body = json.loads(request.content)
        assert body["model"] == "gpt-6-luna"
        assert body["reasoning"] == {"effort": "low", "summary": "auto"}
        return httpx2.Response(
            200,
            request=request,
            json=_response(body["model"], '{"amount":-25,"currency":"AED","note":"Coffee"}'),
        )

    async def run() -> None:
        async with AsyncOpenAI(
            api_key="test-key",
            http_client=DefaultAsyncHttpx2Client(transport=httpx2.MockTransport(handler)),
        ) as client:
            monkeypatch.setattr(sms_parser, "get_settings", lambda: SimpleNamespace(openai_api_key="test-key"))
            monkeypatch.setattr(sms_parser, "_get_openai_client", lambda: client)
            parsed = await sms_parser.parse_sms_transaction("Payment of AED 25 at Coffee")
            assert parsed is not None
            assert parsed.amount == -25
            assert parsed.note == "Coffee"

    asyncio.run(run())


def test_category_parser_handles_sdk3_httpx2_status_errors(monkeypatch) -> None:
    def unauthorized(request: httpx2.Request) -> httpx2.Response:
        assert request.url.path == "/v1/decisions"
        return httpx2.Response(
            401, request=request, json={"error": {"message": "Test denial", "type": "invalid_api_key"}}
        )

    async def run() -> None:
        async with AsyncOpenAI(
            api_key="test-key",
            max_retries=0,
            http_client=DefaultAsyncHttpx2Client(transport=httpx2.MockTransport(unauthorized)),
        ) as client:
            monkeypatch.setattr(category_suggestion, "get_settings", lambda: SimpleNamespace(openai_api_key="test-key"))
            monkeypatch.setattr(category_suggestion, "_get_openai_client", lambda: client)
            result = await category_suggestion._call_category_suggestion_llm(
                note="Coffee",
                sms_text="Payment of AED 25 at Coffee",
                amount=-25,
                currency="AED",
                examples=[],
                categories=[{"id": 1, "name": "Eating Out", "type": "Expense"}],
            )
            assert result is None

    asyncio.run(run())


def test_agents_runner_roundtrip_with_sdk3_native_httpx2() -> None:
    def handler(request: httpx2.Request) -> httpx2.Response:
        body = json.loads(request.content)
        assert request.url.path == "/v1/responses"
        return httpx2.Response(200, request=request, json=_response(body["model"], "Transport OK"))

    async def run() -> None:
        async with AsyncOpenAI(
            api_key="test-key",
            http_client=DefaultAsyncHttpx2Client(transport=httpx2.MockTransport(handler)),
        ) as client:
            agent = Agent(
                name="sdk-migration",
                instructions="Answer briefly.",
                model=OpenAIResponsesModel(model="gpt-6-luna", openai_client=client),
            )
            result = await Runner.run(agent, "Check transport", run_config=RunConfig(tracing_disabled=True))
            assert result.final_output == "Transport OK"

    asyncio.run(run())
