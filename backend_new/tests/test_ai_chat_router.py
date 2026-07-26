from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.di_containers.dependencies import get_chat_agent
from app.api.routes.ai_chat_router import router as ai_chat_router
from app.services.ai_chat.chat_agent import ChatAgentResponse, ChatAgentUnavailableError
from app.services.auth import get_current_user_id


class _RecordingChatAgent:
    created_for_user_ids: list[int] = []
    received_messages: list[str] = []

    def __init__(self, user_id: int) -> None:
        self.created_for_user_ids.append(user_id)

    async def get_response(self, message: str) -> ChatAgentResponse:
        self.received_messages.append(message)
        return ChatAgentResponse(response="grounded response")


class _UnavailableChatAgent:
    async def get_response(self, message: str) -> ChatAgentResponse:
        raise ChatAgentUnavailableError("provider unavailable")


def _build_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(ai_chat_router, prefix="/api")
    return app


def test_chat_post_uses_authenticated_identity_and_ignores_client_identity(monkeypatch) -> None:
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
                "userId": 999,
                "sessionId": "untrusted-client-session",
                "timestamp": "2099-01-01T00:00:00Z",
            },
        )

    assert response.status_code == 200
    assert response.json() == {"response": "grounded response"}
    assert _RecordingChatAgent.created_for_user_ids == [123]
    assert _RecordingChatAgent.received_messages == ["What did I spend?"]


def test_chat_post_rejects_missing_or_blank_messages() -> None:
    test_app = _build_test_app()
    test_app.dependency_overrides[get_current_user_id] = lambda: 123

    with TestClient(test_app) as client:
        missing = client.post("/api/chat", json={})
        blank = client.post("/api/chat", json={"message": "   "})

    assert missing.status_code == 422
    assert blank.status_code == 422


def test_chat_post_returns_retryable_provider_failure() -> None:
    test_app = _build_test_app()
    test_app.dependency_overrides[get_chat_agent] = _UnavailableChatAgent

    with TestClient(test_app) as client:
        response = client.post("/api/chat", json={"message": "What did I spend?"})

    assert response.status_code == 503
    assert response.json() == {"detail": "AI chat is temporarily unavailable. Please try again."}
