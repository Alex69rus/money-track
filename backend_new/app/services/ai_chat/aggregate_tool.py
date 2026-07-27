from agents import RunContextWrapper, function_tool
from agents.tool import ToolOutputText

from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import PaginationSkip, PaginationTake, TransactionFilter
from app.services.ai_chat.query_service import (
    AggregationField,
    AggregationFunction,
    GroupByField,
    PaginatedTransactionAggregations,
    query_aggregations,
)

__all__ = ["PaginatedTransactionAggregations", "aggregate_transactions"]


@function_tool()
async def aggregate_transactions(
    ctx: RunContextWrapper[ChatAgentContext],
    filters: TransactionFilter,
    group_by_fields: list[GroupByField],
    aggregation_function: AggregationFunction,
    aggregation_field: AggregationField,
    sort_order_asc: bool = True,
    skip: PaginationSkip = 0,
    take: PaginationTake = 10,
) -> ToolOutputText:
    """Return user-scoped, paginated aggregate data using only fixed query expressions."""
    result = await query_aggregations(
        user_id=ctx.context.user_id,
        filters=filters,
        group_by_fields=group_by_fields,
        aggregation_function=aggregation_function,
        aggregation_field=aggregation_field,
        sort_order_asc=sort_order_asc,
        skip=skip,
        take=take,
    )
    return ToolOutputText(text=result.model_dump_json())
