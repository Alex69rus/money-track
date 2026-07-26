from datetime import date
from decimal import Decimal
from typing import Literal

from agents import RunContextWrapper, function_tool
from agents.tool import ToolOutputText
from pydantic import BaseModel

from app.core.config import get_settings
from app.models import TransactionsWithCategory
from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import PaginationSkip, PaginationTake, TransactionFilter
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

AggregationField = Literal["amount", "category_id"]

AggregationFunction = Literal["sum", "avg", "min", "max", "count"]

_AGGREGATION_COLUMNS: dict[AggregationField, str] = {
    "amount": '"amount"',
    "category_id": '"category_id"',
}
_AGGREGATION_FUNCTIONS: dict[AggregationFunction, str] = {
    "sum": "SUM",
    "avg": "AVG",
    "min": "MIN",
    "max": "MAX",
    "count": "COUNT",
}
_GROUPING_EXPRESSIONS: dict[GroupByField, str] = {
    "transaction_date_day": '("transaction_date_time" AT TIME ZONE {})::date',
    "transaction_date_month": "DATE_TRUNC('month', \"transaction_date_time\" AT TIME ZONE {})::date",
    "transaction_date_quarter": "DATE_TRUNC('quarter', \"transaction_date_time\" AT TIME ZONE {})::date",
    "transaction_date_year": "DATE_TRUNC('year', \"transaction_date_time\" AT TIME ZONE {})::date",
    "tag": 'transaction_tag."tag"',
    "category_id": '"category_id"',
    "category_type": '"category_type"',
}


class TransactionAggregationResult(BaseModel):
    fields: dict[GroupByField, date | int | str | None]
    value: Decimal | int | None


class PaginatedTransactionAggregations(BaseModel):
    data: list[TransactionAggregationResult]
    total_count: int
    skip: int
    take: int
    has_more: bool


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
    """
    Returns paginated aggregated transaction data based on the provided filters, group-by fields, and aggregation
    function applied to a numeric `aggregation_field`. An empty `group_by_fields` returns a grand total.

    Results are ordered by the aggregation value according to `sort_order_asc`, then by grouping values for stable
    pagination. Date grouping uses the current configured business timezone at query time.
    """
    grouped_sql, parameters = _build_grouped_aggregation_sql(
        user_id=ctx.context.user_id,
        filters=filters,
        group_by_fields=group_by_fields,
        aggregation_function=aggregation_function,
        aggregation_field=aggregation_field,
    )
    count_rows = await TransactionsWithCategory.raw(
        f"WITH grouped_transactions AS ({grouped_sql}) SELECT COUNT(*) AS total_count FROM grouped_transactions",
        *parameters,
    ).run()
    total_count = int(count_rows[0]["total_count"])

    direction = "ASC" if sort_order_asc else "DESC"
    tie_breakers = ", ".join(f'"{field}" ASC NULLS LAST' for field in group_by_fields)
    ordering = f'"value" {direction} NULLS LAST'
    if tie_breakers:
        ordering = f"{ordering}, {tie_breakers}"

    rows = await TransactionsWithCategory.raw(
        f"""\
        WITH grouped_transactions AS ({grouped_sql})
        SELECT *
        FROM grouped_transactions
        ORDER BY {ordering}
        OFFSET {{}} LIMIT {{}}
        """,
        *parameters,
        skip,
        take,
    ).run()
    data = [
        TransactionAggregationResult(
            fields={field: row[field] for field in group_by_fields},
            value=row["value"],
        )
        for row in rows
    ]
    result = PaginatedTransactionAggregations(
        data=data,
        total_count=total_count,
        skip=skip,
        take=take,
        has_more=skip + take < total_count,
    )
    return ToolOutputText(text=result.model_dump_json())


def _build_grouped_aggregation_sql(
    *,
    user_id: int,
    filters: TransactionFilter,
    group_by_fields: list[GroupByField],
    aggregation_function: AggregationFunction,
    aggregation_field: AggregationField,
) -> tuple[str, list[object]]:
    filter_parameters: list[object] = [user_id]
    filtered_scope_sql = build_filtered_transaction_scope_sql(filters, filter_parameters)
    grouping_parameters: list[object] = []
    grouping_selects: list[str] = []
    needs_tag_expansion = "tag" in group_by_fields
    for field in group_by_fields:
        grouping_selects.append(f'{_GROUPING_EXPRESSIONS[field]} AS "{field}"')
        if field.startswith("transaction_date_"):
            grouping_parameters.append(get_settings().business_timezone)

    grouping_sql = ", ".join(grouping_selects)
    grouping_clause = f"{grouping_sql}, " if grouping_sql else ""
    aggregation_sql = f"{_AGGREGATION_FUNCTIONS[aggregation_function]}({_AGGREGATION_COLUMNS[aggregation_field]})"
    group_by_clause = (
        f" GROUP BY {', '.join(str(index) for index in range(1, len(group_by_fields) + 1))}" if group_by_fields else ""
    )
    tag_expansion_sql = ' CROSS JOIN LATERAL UNNEST("tags") AS transaction_tag("tag")' if needs_tag_expansion else ""
    return (
        f"""\
        SELECT {grouping_clause}{aggregation_sql} AS value
        FROM (
            SELECT * {filtered_scope_sql}
        ) AS filtered_transactions{tag_expansion_sql}{group_by_clause}
        """,
        grouping_parameters + filter_parameters,
    )
