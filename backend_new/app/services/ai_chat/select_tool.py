from agents import RunContextWrapper, function_tool
from agents.tool import ToolOutputText

from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import PaginationSkip, PaginationTake, TransactionFilter
from app.services.ai_chat.query_service import TransactionsList, TransactionSortBy, query_transactions

__all__ = ["TransactionsList", "list_transactions"]


@function_tool()
async def list_transactions(
    ctx: RunContextWrapper[ChatAgentContext],
    filters: TransactionFilter,
    skip: PaginationSkip = 0,
    take: PaginationTake = 10,
    sort_by: TransactionSortBy = "transaction_date_time",
    sort_order_asc: bool = False,
) -> ToolOutputText:
    """Return a user-scoped, paginated transaction list with fixed sorting options."""
    result = await query_transactions(
        user_id=ctx.context.user_id,
        filters=filters,
        skip=skip,
        take=take,
        sort_by=sort_by,
        sort_order_asc=sort_order_asc,
    )
    return ToolOutputText(text=result.model_dump_json())
