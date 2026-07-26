from typing import Annotated

from fastapi import APIRouter, HTTPException, status
from fastapi.param_functions import Depends
from pydantic import BaseModel, ConfigDict, field_validator

from app.api.di_containers.dependencies import get_chat_agent
from app.services.ai_chat.chat_agent import ChatAgent, ChatAgentResponse, ChatAgentUnavailableError

router = APIRouter(prefix="/chat", tags=["AI_Chat"])


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        message = value.strip()
        if not message:
            raise ValueError("message must not be empty")
        return message


@router.post("")
@router.post("/", include_in_schema=False)
async def get_chat_response(
    payload: ChatRequest, service: Annotated[ChatAgent, Depends(get_chat_agent)]
) -> ChatAgentResponse:
    try:
        return await service.get_response(payload.message)
    except ChatAgentUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI chat is temporarily unavailable. Please try again.",
        ) from exc
