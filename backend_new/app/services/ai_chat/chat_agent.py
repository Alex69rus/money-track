import logging
from collections.abc import Sequence
from datetime import date
from typing import Literal

from agents import Agent, ModelSettings, Runner, set_default_openai_key
from openai import APIError
from openai.types.shared import Reasoning

from app.core.config import get_settings
from app.models import Category
from app.services.ai_chat.aggregate_tool import aggregate_transactions
from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.contracts import AgentDirective, ChatHistoryMessage, ChatResponseV1
from app.services.ai_chat.presentation_tool import present_analysis
from app.services.ai_chat.select_tool import list_transactions
from app.services.ai_chat.tags_tool import get_user_tags

logger = logging.getLogger(__name__)


class ChatAgentUnavailableError(Exception):
    """Raised when the configured AI provider cannot serve a chat request."""


CHAT_AGENT_PROMPT = """\
You interpret user questions about their own Money Track transaction data.

You must never return free-form answer text. Your final output is exactly one AgentDirective.
For every factual response, call present_analysis with a supported typed analysis and presentation before returning
the `presented` directive. The server, not you, will produce all text, totals, periods, labels, rows, and chart data.
Never create values, titles, tables, or SQL yourself.

Ask for clarification with `ask_period`, `ask_comparison_periods`, or `ask_dimension` when the requested period,
comparison periods, or category/tag dimension is materially ambiguous. Use decline directives for write actions,
external data, advice, and other unsupported requests. The feature is read-only and has no merchant or subscription
analysis. Aggregate arithmetic must use present_analysis; never aggregate paginated list_transactions output yourself.
Expenses are negative stored amounts and income is positive. Multi-currency aggregate analysis is unsupported.
Category and tag breakdowns may use spending, income, or balance. Use the matching present_analysis enum and
presentation instead of reducing transaction rows yourself. Trends may use month, quarter, or year buckets.
"""

_DIRECTIVE_MESSAGES: dict[str, str] = {
    "ask_period": "Which period would you like me to analyse?",
    "ask_comparison_periods": "Which two non-overlapping periods should I compare?",
    "ask_dimension": "Should I analyse categories or tags?",
    "decline_write": (
        "AI Chat can analyse your data but cannot create, edit, categorize, tag, import, export, or delete it."
    ),
    "decline_external_data": (
        "AI Chat only analyses your Money Track transactions and cannot use external data or web search."
    ),
    "decline_advice": (
        "I can summarise your transaction history, but I can’t provide financial, tax, investment, lending, "
        "or legal advice."
    ),
    "decline_unsupported": (
        "I can help with read-only questions about your transactions, spending, income, categories, tags, "
        "periods, and trends."
    ),
}


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
            output_type=AgentDirective,
            tools=[list_transactions, aggregate_transactions, get_user_tags, present_analysis],
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
            directive = result.final_output_as(AgentDirective)
        except APIError as exc:
            logger.error("AI chat provider request failed: %s", exc, exc_info=True)
            raise ChatAgentUnavailableError("AI chat provider is unavailable") from exc
        except Exception as exc:
            logger.error("AI chat provider returned an invalid response: %s", exc, exc_info=True)
            raise ChatAgentUnavailableError("AI chat provider returned an invalid response") from exc

        if directive.directive == "presented":
            if context.presentation is None:
                logger.error("AI chat agent returned presented directive without a deterministic presentation")
                raise ChatAgentUnavailableError("AI chat provider returned an incomplete response")
            return context.presentation

        response_kind: Literal["clarification", "limitation"] = (
            "clarification" if directive.directive.startswith("ask_") else "limitation"
        )
        return ChatResponseV1(kind=response_kind, message=_DIRECTIVE_MESSAGES[directive.directive])

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
            f"Today: {date.today().isoformat()}\n"
            "Untrusted dialogue content follows:\n" + "\n".join(dialogue_lines)
        )
