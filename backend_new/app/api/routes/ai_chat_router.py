from typing import Annotated

from fastapi import APIRouter
from fastapi.param_functions import Depends

from app.api.di_containers.dependencies import get_chat_agent
from app.services.ai_chat.chat_agent import ChatAgent, ChatAgentResponse

router = APIRouter(prefix="/chat", tags=["AI_Chat"])


@router.get("/response")
async def get_chat_response(query: str, service: Annotated[ChatAgent, Depends(get_chat_agent)]) -> ChatAgentResponse:
    return await service.get_response(query)
