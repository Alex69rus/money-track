from datetime import date

from agents import Agent, ModelSettings, Runner, set_default_openai_key
from openai import BaseModel
from openai.types.shared import Reasoning
from pydantic import ConfigDict, Field

from app.core.config import get_settings
from app.models import Category
from app.services.ai_chat.select_tool import ChatAgentContext, list_transactions


class ChatAgentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    response: str = Field(description="Text response for user query")


CHAT_AGENT_PROMPT = """\
You are answerring user questions about their financial transactions.
Be short and concise. Never invent or make up information. If you cannot retrieve information with provided tools, \
state it clearly.

Flow:
1. Analyze tje iser query and determine what data you need to answer
2. Check provided tools and understand how you can retrieve information for the question. You can call several tools \
to gather information if needed.
3. Analyse the retrieved information and provide a short and concise answer.
"""


class ChatAgent:
    def __init__(self, user_id: int) -> None:
        self.current_user_id = user_id

    def _get_chat_agent(self) -> Agent[ChatAgentContext]:
        settings = get_settings()
        set_default_openai_key(settings.openai_api_key)

        return Agent[ChatAgentContext](
            name="ai_chat_agent",
            instructions=CHAT_AGENT_PROMPT,
            model=settings.openai_model,
            model_settings=ModelSettings(reasoning=Reasoning(effort="high", summary="auto")),
            output_type=ChatAgentResponse,
            tools=[list_transactions],
        )

    async def get_response(self, query: str) -> ChatAgentResponse:

        agent = self._get_chat_agent()

        user_categories = (
            await Category.select(Category.id, Category.name).order_by(Category.order_index, Category.name).run()
        )
        adjusted_query = f"""User categories:
            {user_categories}
            Today date: {date.today().isoformat()}
            User query: {query}
            """

        context = ChatAgentContext(user_id=self.current_user_id)
        res = await Runner.run(starting_agent=agent, input=adjusted_query, context=context)

        return res.final_output_as(ChatAgentResponse)
