from __future__ import annotations

import asyncio
import gzip
import json
import logging
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from types import SimpleNamespace
from unittest.mock import AsyncMock

import asyncpg
import httpx
import httpx2
import pytest
from agents import Agent, OpenAIResponsesModel, function_tool
from agents import trace as agent_trace
from openai import AsyncOpenAI, DefaultAsyncHttpx2Client
from opentelemetry import trace
from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor
from opentelemetry.instrumentation.genai.openai import OpenAIInstrumentor
from opentelemetry.instrumentation.genai.openai_agents import OpenAIAgentsInstrumentor
from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import ExportLogsServiceRequest
from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import ExportTraceServiceRequest
from opentelemetry.proto.trace.v1.trace_pb2 import Span
from piccolo.engine.postgres import PostgresEngine
from telegram import Bot

from app.api.di_containers.dependencies import get_chat_agent
from app.core.config import Settings, get_settings
from app.core.tracing import configure_telemetry
from app.services import category_suggestion, sms_parser, telegram_ingestion, telegram_runtime
from app.services.ai_chat import chat_agent
from app.services.ai_chat.chat_agent import ChatAgent
from app.services.ai_chat.contracts import AgentResponse
from tests.test_category_suggestion import _CATALOG, _decision, _transaction
from tests.test_openai_sdk_transport import _response

_OPENAI_KEY = 'synthetic-openai-key-with-"quotes"'
_INGEST_KEY = "synthetic-new-relic-ingest-key"
_SMS = "Payment of AED 25 at Coffee"
_CHAT_PROMPT = "chat prompt retained"
_CHAT_HISTORY = "chat history retained"
_CHAT_ANSWER = "chat answer retained"
_DB_PARAMETER = "synthetic-transaction-note"
_DB_QUERY = "SELECT $1::text"


@pytest.fixture
def openai_traces(monkeypatch):
    payloads = []

    def receive(_client, *, url, headers, json, **_kwargs):
        assert url == "https://api.openai.com/v1/traces/ingest"
        assert headers["Authorization"] == f"Bearer {_OPENAI_KEY}"
        payloads.extend(json["data"])
        return httpx2.Response(204)

    monkeypatch.setattr(httpx2.Client, "post", receive)
    return payloads


@pytest.fixture
def receiver():
    batches = []

    class Receiver(BaseHTTPRequestHandler):
        def do_POST(self):
            assert self.headers["Content-Encoding"] == "gzip"
            payload = gzip.decompress(self.rfile.read(int(self.headers["Content-Length"])))
            batches.append((self.path, self.headers["api-key"], payload))
            self.send_response(200)
            self.end_headers()

        def log_message(self, *_args):
            pass

    with ThreadingHTTPServer(("127.0.0.1", 0), Receiver) as server:
        worker = Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            yield f"http://127.0.0.1:{server.server_port}", batches
        finally:
            server.shutdown()
            worker.join()


def _mock_openai(requests_seen):
    tool_response_sent = False

    def respond(request):
        nonlocal tool_response_sent
        requests_seen.append(request.url.path)
        assert request.headers["authorization"] == f"Bearer {_OPENAI_KEY}"
        body = json.loads(request.content)
        if request.url.path == "/v1/decisions":
            if "decline" in body["input"]:
                return httpx2.Response(401, json={"error": {"message": _OPENAI_KEY, "type": "invalid_api_key"}})
            return httpx2.Response(200, json=_decision())
        assert request.url.path == "/v1/responses"
        if body["input"] == _SMS:
            return httpx2.Response(
                200, json=_response(body["model"], '{"amount":-25,"currency":"AED","note":"Coffee"}')
            )
        if body["input"] == _SMS + " decline":
            return httpx2.Response(401, json={"error": {"message": _OPENAI_KEY, "type": "invalid_api_key"}})
        if not tool_response_sent:
            tool_response_sent = True
            result = _response(body["model"], "")
            result["output"] = [
                {
                    "id": "fc_telemetry",
                    "call_id": "call_telemetry",
                    "type": "function_call",
                    "name": "lookup",
                    "arguments": json.dumps({"query": "tool argument retained"}),
                    "status": "completed",
                }
            ]
        else:
            result = _response(body["model"], json.dumps({"kind": "answer", "message": _CHAT_ANSWER}))
        return httpx2.Response(200, json=result)

    return AsyncOpenAI(
        api_key=_OPENAI_KEY,
        max_retries=0,
        http_client=DefaultAsyncHttpx2Client(transport=httpx2.MockTransport(respond)),
    )


def _post_telegram(client, update_id, sms):
    return client.post(
        "/api/telegram/webhook",
        headers={"X-Telegram-Bot-Api-Secret-Token": "webhook-secret"},
        json={
            "update_id": update_id,
            "message": {
                "message_id": update_id,
                "date": 1758301908,
                "from": {"id": 123, "is_bot": False, "first_name": "Test"},
                "chat": {"id": 123, "type": "private"},
                "text": sms,
            },
        },
    )


def _assert_telemetry(batches):
    spans, logs = [], []
    for path, key, payload in batches:
        assert key == _INGEST_KEY
        if path == "/v1/traces":
            request = ExportTraceServiceRequest.FromString(payload)
            for resource in request.resource_spans:
                assert any(
                    attr.key == "service.name" and attr.value.string_value == "money-track-backend"
                    for attr in resource.resource.attributes
                )
                spans.extend(span for scope in resource.scope_spans for span in scope.spans)
        else:
            assert path == "/v1/logs"
            request = ExportLogsServiceRequest.FromString(payload)
            logs.extend(
                record
                for resource in request.resource_logs
                for scope in resource.scope_logs
                for record in scope.log_records
            )
        for secret in (_OPENAI_KEY, _INGEST_KEY, "synthetic-openai-key-with-", "header-marker", _DB_PARAMETER):
            assert secret.encode() not in payload

    by_id = {span.span_id: span for span in spans}
    assert not any(span.name.endswith((" http receive", " http send")) for span in spans)
    assert not any(span.name == "GET /health" for span in spans)
    messages = [record.body.string_value for record in logs]
    assert not any('GET /health?probe=ready HTTP/1.1" 200' in message for message in messages)
    assert any('GET /health HTTP/1.1" 503' in message for message in messages)

    def children(parent):
        return [span for span in spans if span.parent_span_id == parent.span_id]

    (chat,) = [span for span in spans if span.name == "POST /api/chat"]
    (chat_query,) = [span for span in children(chat) if span.name == "SELECT"]
    (workflow,) = [span for span in children(chat) if span.name != "SELECT"]
    assert chat_query.trace_id == chat.trace_id
    assert chat_query.kind == Span.SPAN_KIND_CLIENT
    assert any(
        attr.key in {"db.statement", "db.query.text"} and attr.value.string_value == _DB_QUERY
        for attr in chat_query.attributes
    )
    (agent,) = children(workflow)
    chat_children = children(agent)
    assert len(chat_children) == 3
    assert any(span.name.startswith("execute_tool") for span in chat_children)
    assert all(span.trace_id == chat.trace_id for span in [workflow, agent, *chat_children])
    chat_payload = b"".join(span.SerializeToString() for span in chat_children)
    for marker in (_CHAT_PROMPT, _CHAT_HISTORY, _CHAT_ANSWER, "tool argument retained", "tool result retained"):
        assert marker.encode() in chat_payload

    jobs = [span for span in spans if span.name == "telegram.update.process"]
    assert len(jobs) == 2
    assert jobs[0].trace_id != jobs[1].trace_id
    for job in jobs:
        webhook = by_id[job.parent_span_id]
        server = by_id[webhook.parent_span_id]
        assert webhook.name == "telegram.webhook.receive"
        assert server.name == "POST /api/telegram/webhook"
        assert server.trace_id == webhook.trace_id == job.trace_id
        (db_query,) = [span for span in children(job) if span.name == "SELECT"]
        assert db_query.trace_id == job.trace_id
        (parser,) = [span for span in children(job) if span.name == "sms.parse"]
        (model,) = children(parser)
        assert parser.trace_id == model.trace_id == job.trace_id
        assert any(
            record.trace_id == job.trace_id and record.span_id == parser.span_id and _SMS in record.body.string_value
            for record in logs
        )

    (failed_query,) = [span for span in spans if span.name == "SELECT" and span.status.code == 2]
    assert not failed_query.status.message
    (db_exception,) = [event for event in failed_query.events if event.name == "exception"]
    assert [attr.key for attr in db_exception.attributes] == ["exception.type"]

    decisions = [span for span in spans if span.name == "category_suggestion.llm_call"]
    assert sorted(span.status.code for span in decisions) == [1, 2]
    assert any(
        span.parent_span_id == job.span_id and span.trace_id == job.trace_id for span in decisions for job in jobs
    )
    assert any(b"decision.token_count.input" in span.SerializeToString() for span in decisions)
    assert any(b"***" in span.SerializeToString() for span in spans if span.status.code == 2)
    assert any("401" in record.body.string_value and "***" in record.body.string_value for record in logs)


def test_application_exports_correlated_telemetry_without_provider_credentials(monkeypatch, receiver, openai_traces):
    endpoint, batches = receiver
    for key, value in {
        "ENVIRONMENT": "Test",
        "DATABASE_URL": "postgresql://test:test@127.0.0.1/test",
        "TELEGRAM_BOT_TOKEN": "123456:testtoken",
        "TELEGRAM_WEBHOOK_SECRET": "webhook-secret",
        "OPENAI_API_KEY": _OPENAI_KEY,
        "OTEL_EXPORTER_OTLP_ENDPOINT": endpoint,
        "NEW_RELIC_LICENSE_KEY": _INGEST_KEY,
        "OTEL_TRACES_EXPORTER": "otlp",
        "OTEL_LOGS_EXPORTER": "otlp",
        "OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT": "span_only",
        "OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_REQUEST": ".*",
        "OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT": "8",
        "OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT": "8",
    }.items():
        monkeypatch.setenv(key, value)
    get_settings.cache_clear()
    monkeypatch.setattr(PostgresEngine, "check_version", AsyncMock())
    connection = object.__new__(asyncpg.Connection)
    connection._aborted = True  # The test replaces fetch and never opens a socket.

    async def fetch(_connection, _query, value, *, fail=False):
        if fail:
            raise asyncpg.DataError(f"Invalid value: {value}")
        return []

    async def claim_update(**_kwargs):
        await connection.fetch(_DB_QUERY, _DB_PARAMETER)
        return True

    monkeypatch.setattr(asyncpg.Connection, "fetch", fetch)

    @function_tool
    def lookup(query: str) -> str:
        assert query == "tool argument retained"
        return f"tool result retained {_OPENAI_KEY}"

    async def run(main):
        requests_seen = []
        async with _mock_openai(requests_seen) as openai_client:
            monkeypatch.setattr(sms_parser, "_get_openai_client", lambda: openai_client)
            monkeypatch.setattr(category_suggestion, "_get_openai_client", lambda: openai_client)
            monkeypatch.setattr(
                chat_agent.Category, "select", lambda *_args: SimpleNamespace(order_by=lambda *_: query)
            )
            monkeypatch.setattr(
                ChatAgent,
                "_get_chat_agent",
                lambda _self: Agent(
                    name="telemetry-test",
                    model=OpenAIResponsesModel(model="gpt-6-luna", openai_client=openai_client),
                    output_type=AgentResponse,
                    tools=[lookup],
                ),
            )
            main.app.dependency_overrides[get_chat_agent] = lambda: ChatAgent(123)
            telegram_application = SimpleNamespace(bot=Bot("123456:testtoken"), update_queue=asyncio.Queue())

            async def start(runtime):
                runtime._application = telegram_application

            async def suggest(**kwargs):
                result = await category_suggestion._call_category_suggestion_llm(
                    note=kwargs["transaction"].note,
                    sms_text=_SMS,
                    amount=-25,
                    currency="AED",
                    examples=[],
                    categories=_CATALOG,
                )
                assert result is not None
                return result

            query = SimpleNamespace(run=lambda: connection.fetch(_DB_QUERY, _DB_PARAMETER))
            monkeypatch.setattr(
                main,
                "get_engine",
                lambda: SimpleNamespace(start_connection_pool=AsyncMock(), close_connection_pool=AsyncMock()),
            )
            monkeypatch.setattr(main.TelegramBotRuntime, "is_enabled", True)
            monkeypatch.setattr(main.TelegramBotRuntime, "start", start)
            monkeypatch.setattr(main.TelegramBotRuntime, "stop", AsyncMock())
            monkeypatch.setattr(telegram_ingestion, "claim_telegram_update", claim_update)
            monkeypatch.setattr(
                telegram_ingestion, "upsert_transaction_by_message_id", AsyncMock(return_value=_transaction())
            )
            monkeypatch.setattr(telegram_ingestion, "suggest_and_apply_transaction_category", suggest)
            monkeypatch.setattr(telegram_ingestion, "_send_create_reply", AsyncMock())
            monkeypatch.setattr(telegram_ingestion, "_send_unparsed", AsyncMock())

            async def worker():
                for _ in range(2):
                    queued = await telegram_application.update_queue.get()
                    await telegram_runtime.handle_queued_telegram_update(
                        queued, SimpleNamespace(bot=telegram_application.bot)
                    )
                    assert not trace.get_current_span().get_span_context().is_valid

            async with main.app.router.lifespan_context(main.app):
                async with httpx.AsyncClient(
                    transport=httpx.ASGITransport(app=main.app), base_url="http://test"
                ) as client:
                    assert (await client.get("/health?probe=ready")).text == "OK"
                    # ASGITransport bypasses Uvicorn, so send its access records through the configured logger.
                    access_logger = logging.getLogger("uvicorn.access")
                    access_logger.info('%s - "%s %s HTTP/%s" %d', "test", "GET", "/health?probe=ready", "1.1", 200)
                    access_logger.info('%s - "%s %s HTTP/%s" %d', "test", "GET", "/health", "1.1", 503)
                    response = await client.post(
                        "/api/chat",
                        headers={"Authorization": "Bearer header-marker"},
                        json={
                            "message": _CHAT_PROMPT,
                            "history": [
                                {"role": "user", "content": _CHAT_HISTORY},
                                {"role": "assistant", "content": "Earlier answer"},
                            ],
                        },
                    )
                    assert response.status_code == 200
                    assert response.json()["message"] == _CHAT_ANSWER
                    job = asyncio.create_task(worker())
                    for update_id, sms in enumerate((_SMS, _SMS + " decline"), start=1):
                        response = await _post_telegram(client, update_id, sms)
                        assert response.text == "OK"
                    await asyncio.wait_for(job, timeout=3)

                with pytest.raises(asyncpg.DataError):
                    await connection.fetch(_DB_QUERY, _DB_PARAMETER, fail=True)
                await category_suggestion._call_category_suggestion_llm(
                    note=_OPENAI_KEY,
                    sms_text="decline",
                    amount=-25,
                    currency="AED",
                    examples=[],
                    categories=_CATALOG,
                )
            assert requests_seen.count("/v1/responses") == 4
            assert requests_seen.count("/v1/decisions") == 2

    # Configure the production entry point with only synthetic credentials and restore
    # logging handlers for the remaining tests in this process.
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    try:
        from app import main

        asyncio.run(run(main))
        assert any(item["object"] == "trace" for item in openai_traces)
        native_payload = json.dumps(openai_traces)
        assert "tool result retained" in native_payload
        assert "synthetic-openai-key-with-" not in native_payload
        assert _INGEST_KEY not in native_payload
        _assert_telemetry(batches)
    finally:
        AsyncPGInstrumentor().uninstrument()
        OpenAIInstrumentor().uninstrument()
        OpenAIAgentsInstrumentor().uninstrument()
        root.handlers[:] = handlers
        root.setLevel(level)
        get_settings.cache_clear()


@pytest.mark.parametrize("logs_mode", ["none", "otlp"])
def test_health_works_when_log_export_is_disabled_or_unavailable(monkeypatch, logs_mode, openai_traces):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from requests import ConnectionError, Session

    from app.api.routes.health_router import router as health_router

    attempted_exports = []

    def unavailable(_session, request, **_kwargs):
        attempted_exports.append(request.url)
        raise ConnectionError("synthetic OTLP outage")

    monkeypatch.setattr(Session, "send", unavailable)
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    settings = Settings(
        ENVIRONMENT="Test",
        DATABASE_URL="postgresql://test:test@127.0.0.1/test",
        TELEGRAM_BOT_TOKEN="123456:testtoken",
        OPENAI_API_KEY=_OPENAI_KEY,
        OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:14318",
        NEW_RELIC_LICENSE_KEY=_INGEST_KEY,
        OTEL_TRACES_EXPORTER="none",
        OTEL_LOGS_EXPORTER=logs_mode,
    )
    try:
        telemetry = configure_telemetry(settings)
        app = FastAPI()
        app.include_router(health_router)
        logging.getLogger("app.test").warning("Test outage")
        with TestClient(app) as client:
            assert client.get("/health").text == "OK"
        with agent_trace("Native tracing without OTLP traces"):
            pass
        asyncio.run(telemetry.shutdown())
        assert bool(attempted_exports) == (logs_mode == "otlp")
        assert any(item.get("workflow_name") == "Native tracing without OTLP traces" for item in openai_traces)
    finally:
        root.handlers[:] = handlers
        root.setLevel(level)
