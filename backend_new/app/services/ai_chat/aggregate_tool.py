from datetime import datetime
from decimal import Decimal
from typing import Literal

from agents import RunContextWrapper, function_tool
from openai import BaseModel

from app.models import TransactionsWithCategory
from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import TransactionFilter
from app.services.ai_chat.transaction_scope import build_filtered_transaction_scope_sql

GroupByField = Literal[
    "transaction_date_day",
    "transaction_date_month",
    "transaction_date_quarter",
    "transaction_date_year",
    "tag",
    "category_id",
    "category_type",
]

AggregationFiled = Literal[
    "asterisk",
    "transaction_date_time",
    "amount",
    "currency",
    "category_id",
    "category_type",
]

AggregationFunction = Literal["sum", "avg", "min", "max", "count"]


class TransactionAggregationResult(BaseModel):
    fields: dict[GroupByField, datetime | int | str | None]
    value: Decimal | datetime | int | str | None


@function_tool()
async def aggregate_transactions(
    ctx: RunContextWrapper[ChatAgentContext],
    filters: TransactionFilter,
    group_by_fields: list[GroupByField],
    aggregation_function: AggregationFunction,
    aggregation_field: AggregationFiled,
    sort_order_asc: bool = True,
) -> list[TransactionAggregationResult]:
    """
    Returns aggregated transaction data based on the provided filters, group by fields, and aggregation function \
    applied to the specified `aggregation_field`;
    results are sorted by the aggregation result according to `order_asc` parameter.

    Allows to calculate aggregated values (sum, average, min, max, count) for transactions grouped by specified fields \
    filtered by the provided criteria.
    """

    parameters: list[object] = [ctx.context.user_id]

    transactions_sql = f"""\
    SELECT *
    {build_filtered_transaction_scope_sql(filters, parameters)}
    """

    # unfold the "tags" into "tag" for grouping, because it is an array and we need to group by each tag separately
    prepared_groupping_fields = ['unnest("tags") as tag' if gf == "tag" else gf for gf in group_by_fields]

    aggregating_fields = aggregation_field if aggregation_field != "asterisk" else "*"

    base_sql = f"""\
    WITH filtered_transactions AS (
    {transactions_sql}
    )

    SELECT {", ".join(prepared_groupping_fields)}, {aggregation_function}({aggregating_fields}) as value
    FROM filtered_transactions
    WHERE user_id = {ctx.context.user_id}
    GROUP BY {", ".join(group_by_fields)}
    ORDER BY value {"ASC" if sort_order_asc else "DESC"}
    """

    rows = await TransactionsWithCategory.raw(base_sql, *parameters).run()

    return [
        TransactionAggregationResult(
            fields={field: row[field] for field in group_by_fields},
            value=row["value"],
        )
        for row in rows
    ]
