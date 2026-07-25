from openai import BaseModel


class ChatAgentContext(BaseModel):
    """Context passed to all agent tools via RunContextWrapper.

    This context is automatically injected by the OpenAI Agents SDK
    into all tool function calls.
    """

    user_id: int
