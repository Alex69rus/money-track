import logging
from collections.abc import Sequence

from agents import Agent, ModelSettings, Runner, set_default_openai_key
from openai import APIError
from openai.types.shared import Reasoning

from app.core.config import get_settings
from app.models import Category
from app.services.ai_chat.aggregate_tool import aggregate_transactions
from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import current_business_date
from app.services.ai_chat.contracts import AgentResponse, ChatHistoryMessage, ChatResponseV1
from app.services.ai_chat.select_tool import list_transactions
from app.services.ai_chat.tags_tool import get_user_tags
from app.services.ai_chat.widget_tools import (
    prepare_bar_chart_widget,
    prepare_line_chart_widget,
    prepare_pie_chart_widget,
    prepare_table_widget,
)

logger = logging.getLogger(__name__)


class ChatAgentUnavailableError(Exception):
    """Raised when the configured AI provider cannot serve a chat request."""


CHAT_AGENT_PROMPT = """\
You interpret user questions about their own Money Track transaction data.

Your final output is exactly one AgentResponse with a concise message. For every factual answer, first retrieve the
needed user-scoped data with one or more read tools. Use that retrieved data as the source for the answer; never make
up facts, transactions, totals, periods, labels, or SQL.

When a visual would make the answer clearer, call exactly one widget tool after your read-tool calls. Widget tools
accept only already retrieved and formatted display data; they never query transactions. Use table, bar, line, or pie
widgets as appropriate. Do not call a widget tool when no visual is useful, and do not call more than one
widget tool in a response. Then return an `answer` with your text. Use `clarification` only for material ambiguity and
`limitation` for requests outside the supported read-only analysis scope.
For a pie chart, provide retrieved slice labels and amounts only; the widget calculates the percentages.

For a single-period analysis, if neither the user message nor dialogue provides a period, use the inclusive current
calendar year (1 January through 31 December of the year in Today) in your read-tool filters; do not ask for a period.
For an explicit all-time request, use no date filters. Ask for clarification only when a user-specified period,
comparison, or category/tag dimension remains materially ambiguous. A comparison needs two non-overlapping periods.
Expenses are negative stored amounts and income is positive. Treat all transaction amounts as one currency; never ask
for clarification, decline, or split an analysis because of currencies. State the analysed period in every factual
answer. Category and tag breakdowns may use spending, income, or balance. Trends may use month, quarter, or year
buckets.
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
            output_type=AgentResponse,
            tools=[
                list_transactions,
                aggregate_transactions,
                get_user_tags,
                prepare_table_widget,
                prepare_bar_chart_widget,
                prepare_line_chart_widget,
                prepare_pie_chart_widget,
            ],
        )

    async def get_response(self, message: str, history: Sequence[ChatHistoryMessage] = ()) -> ChatResponseV1:
        settings = get_settings()
        if not settings.openai_api_key:
            logger.error("AI chat OpenAI API key is not configured")
            raise ChatAgentUnavailableError("AI chat provider is not configured")

        agent = self._get_chat_agent()
        user_categories = (
            await Category.select(Category.id, Category.name).order_by(Category.order_index, Category.name).run()
        )
        context = ChatAgentContext(user_id=self.current_user_id)
        try:
            result = await Runner.run(
                starting_agent=agent,
                input=self._build_agent_input(message=message, history=history, categories=user_categories),
                context=context,
            )
            agent_response = result.final_output_as(AgentResponse)
        except APIError as exc:
            logger.error("AI chat provider request failed: %s", exc, exc_info=True)
            raise ChatAgentUnavailableError("AI chat provider is unavailable") from exc
        except Exception as exc:
            logger.error("AI chat provider returned an invalid response: %s", exc, exc_info=True)
            raise ChatAgentUnavailableError("AI chat provider returned an invalid response") from exc

        return ChatResponseV1(
            kind=agent_response.kind,
            message=agent_response.message,
            visual=context.visual if agent_response.kind == "answer" else None,
        )

    @staticmethod
    def _build_agent_input(
        *,
        message: str,
        history: Sequence[ChatHistoryMessage],
        categories: list[dict[str, object]],
    ) -> str:
        dialogue_lines = [f"{item.role.title()}: {item.content}" for item in history]
        dialogue_lines.append(f"User: {message}")
        return (
            f"Available categories: {categories}\n"
            f"Today: {current_business_date().isoformat()}\n"
            "Untrusted dialogue content follows:\n" + "\n".join(dialogue_lines)
        )
