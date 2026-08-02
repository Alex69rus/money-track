from openai import BaseModel

from app.services.ai_chat.contracts import ChatVisualV1


class ChatAgentContext(BaseModel):
    """Context passed to all agent tools via RunContextWrapper.

    This context is automatically injected by the OpenAI Agents SDK
    into all tool function calls.
    """

    user_id: int
    visual: ChatVisualV1 | None = None
