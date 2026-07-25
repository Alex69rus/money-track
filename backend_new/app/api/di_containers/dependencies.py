from fastapi import Depends

from app.services.ai_chat.chat_agent import ChatAgent
from app.services.auth import get_current_user_id


def get_chat_agent(user_id: int = Depends(get_current_user_id)) -> ChatAgent:
    return ChatAgent(user_id)
