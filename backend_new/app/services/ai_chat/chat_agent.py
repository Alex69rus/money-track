from datetime import date

from agents import Agent, ModelSettings, Runner, set_default_openai_key
from openai import BaseModel
from openai.types.shared import Reasoning
from pydantic import ConfigDict, Field

from app.core.config import get_settings
from app.models import Category
from app.services.ai_chat.aggregate_tool import aggregate_transactions
from app.services.ai_chat.select_tool import ChatAgentContext, list_transactions
from app.services.ai_chat.tags_tool import get_user_tags


class ChatAgentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    response: str = Field(description="Text response for user query")


CHAT_AGENT_PROMPT = """\
You are answerring user questions about their financial transactions.
Be short and concise. Never invent or make up information. If you cannot retrieve information with provided tools, \
state it clearly.

Highlights:
- Expences have negative amounts, incomes have positive amounts
- Each transaction has a single category, but can have multiple tags
- User has only single currency, so you never face different currencies, and free to to aggregations ignoring currency
- Never try to do aggregations on your own using list_transactions tool, always use aggregate_transactions tool for that

Flow:
1. Analyze the user query and determine what data you need to answer
2. Understand if user query is about category or tags (if mentioned); Retrieve user available tags if you don't see \
requested attribute among categories
3. Check provided tools and understand how you can retrieve information for the question. You can call several tools \
to gather information if needed
4. Analyse the retrieved information and provide a short and concise answer
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
            model="gpt-5-mini",
            model_settings=ModelSettings(reasoning=Reasoning(effort="medium", summary="auto")),
            output_type=ChatAgentResponse,
            tools=[list_transactions, aggregate_transactions, get_user_tags],
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
