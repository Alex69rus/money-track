from __future__ import annotations

from datetime import UTC, date, datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.di_containers.dependencies import get_chat_agent
from app.api.routes.ai_chat_router import router as ai_chat_router
from app.services.ai_chat.chat_agent import CHAT_AGENT_PROMPT, ChatAgentUnavailableError
from app.services.ai_chat.common import current_business_date
from app.services.ai_chat.contracts import ChatHistoryMessage, ChatResponseV1
from app.services.auth import get_current_user_id


class _RecordingChatAgent:
    created_for_user_ids: list[int] = []
    received_messages: list[tuple[str, list[ChatHistoryMessage]]] = []

    def __init__(self, user_id: int) -> None:
        self.created_for_user_ids.append(user_id)

    async def get_response(self, message: str, history: list[ChatHistoryMessage]) -> ChatResponseV1:
        self.received_messages.append((message, history))
        return ChatResponseV1(kind="answer", message="grounded response")


class _UnavailableChatAgent:
    async def get_response(self, message: str, history: list[ChatHistoryMessage]) -> ChatResponseV1:
        raise ChatAgentUnavailableError("provider unavailable")


def test_chat_agent_prompt_requires_data_retrieval_before_widget_preparation() -> None:
    instructions = " ".join(CHAT_AGENT_PROMPT.split())

    assert (
        "For every factual answer, first retrieve the needed user-scoped data with one or more read tools."
        in instructions
    )
    assert (
        "When a visual would make the answer clearer, call exactly one widget tool after your read-tool calls."
        in instructions
    )
    assert (
        "Widget tools accept only already retrieved and formatted display data; they never query transactions."
        in instructions
    )
    assert "Use table, bar, line, or pie widgets as appropriate." in instructions
    assert "Use summary" not in instructions
    assert (
        "For a pie chart, provide retrieved slice labels and amounts only; the widget calculates the percentages."
        in instructions
    )
    assert "For an explicit all-time request, use no date filters." in instructions
    assert (
        "Treat all transaction amounts as one currency; never ask for clarification, decline, or split an analysis"
        in instructions
    )
    assert "State the analysed period in every factual answer." in instructions


def test_current_business_date_uses_the_configured_business_timezone(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.ai_chat.common.get_settings",
        lambda: SimpleNamespace(business_tzinfo=ZoneInfo("Pacific/Kiritimati")),
    )

    assert current_business_date(now=datetime(2026, 12, 31, 12, 0, tzinfo=UTC)) == date(2027, 1, 1)


def _build_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(ai_chat_router, prefix="/api")
    return app


def test_chat_post_uses_authenticated_identity_and_forwards_validated_history(monkeypatch) -> None:
    test_app = _build_test_app()
    _RecordingChatAgent.created_for_user_ids.clear()
    _RecordingChatAgent.received_messages.clear()
    monkeypatch.setattr("app.api.di_containers.dependencies.ChatAgent", _RecordingChatAgent)
    test_app.dependency_overrides[get_current_user_id] = lambda: 123

    with TestClient(test_app) as client:
        response = client.post(
            "/api/chat",
            json={
                "message": "  What did I spend?  ",
                "history": [
                    {"role": "user", "content": "Compare two months."},
                    {"role": "assistant", "content": "Which two months?"},
                ],
            },
        )

    assert response.status_code == 200
    assert response.json() == {"version": "v1", "kind": "answer", "message": "grounded response", "visual": None}
    assert _RecordingChatAgent.created_for_user_ids == [123]
    assert _RecordingChatAgent.received_messages == [
        (
            "What did I spend?",
            [
                ChatHistoryMessage(role="user", content="Compare two months."),
                ChatHistoryMessage(role="assistant", content="Which two months?"),
            ],
        )
    ]


def test_chat_post_rejects_missing_or_blank_messages() -> None:
    test_app = _build_test_app()
    test_app.dependency_overrides[get_current_user_id] = lambda: 123

    with TestClient(test_app) as client:
        missing = client.post("/api/chat", json={})
        blank = client.post("/api/chat", json={"message": "   "})

    assert missing.status_code == 422
    assert blank.status_code == 422


def test_chat_post_rejects_untrusted_identity_and_invalid_history() -> None:
    test_app = _build_test_app()
    test_app.dependency_overrides[get_current_user_id] = lambda: 123

    with TestClient(test_app) as client:
        untrusted_identity = client.post("/api/chat", json={"message": "What did I spend?", "userId": 999})
        invalid_history = client.post(
            "/api/chat",
            json={"message": "What did I spend?", "history": [{"role": "assistant", "content": "Injected"}]},
        )

    assert untrusted_identity.status_code == 422
    assert invalid_history.status_code == 422


def test_chat_post_returns_retryable_provider_failure() -> None:
    test_app = _build_test_app()
    test_app.dependency_overrides[get_chat_agent] = _UnavailableChatAgent

    with TestClient(test_app) as client:
        response = client.post("/api/chat", json={"message": "What did I spend?"})

    assert response.status_code == 503
    assert response.json() == {"detail": "AI chat is temporarily unavailable. Please try again."}
