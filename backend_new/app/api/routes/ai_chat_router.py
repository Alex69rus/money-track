from typing import Annotated

from fastapi import APIRouter, HTTPException, status
from fastapi.param_functions import Depends
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.api.di_containers.dependencies import get_chat_agent
from app.services.ai_chat.chat_agent import ChatAgent, ChatAgentUnavailableError
from app.services.ai_chat.contracts import ChatHistoryMessage, ChatResponseV1

router = APIRouter(prefix="/chat", tags=["AI_Chat"])


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(max_length=2000)
    history: list[ChatHistoryMessage] = Field(default_factory=list, max_length=12)

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        message = value.strip()
        if not message:
            raise ValueError("message must not be empty")
        return message

    @model_validator(mode="after")
    def validate_history(self) -> "ChatRequest":
        if sum(len(item.content) for item in self.history) > 12000:
            raise ValueError("history must not exceed 12000 characters")
        expected_role = "user"
        for item in self.history:
            if item.role != expected_role:
                raise ValueError("history must alternate user and assistant messages")
            expected_role = "assistant" if expected_role == "user" else "user"
        if self.history and self.history[-1].role != "assistant":
            raise ValueError("history must end with an assistant message")
        return self


@router.post("", response_model=ChatResponseV1)
@router.post("/", include_in_schema=False)
async def get_chat_response(
    payload: ChatRequest, service: Annotated[ChatAgent, Depends(get_chat_agent)]
) -> ChatResponseV1:
    try:
        return await service.get_response(payload.message, payload.history)
    except ChatAgentUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI chat is temporarily unavailable. Please try again.",
        ) from exc
