from typing import Any, Literal

from agents import RunContextWrapper, function_tool
from openai import BaseModel

from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import TransactionFilter
from app.services.transaction_normalization import normalize_tag

# fields
# id: int
# transaction_date: str
# amount: float
# note: str
# tags: list
# currency: str
# category_id: int
# category_name: str
# category_type: str

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


class TransactionAggregationResult(BaseModel):
    fields: list[AggregationFiled]
    value: Any


def _build_filters(filters: TransactionFilter, parameters_array: list[Any]) -> str:
    filter_clauses: list[str] = []
    if filters.from_date is not None:
        filter_clauses.append('trx."transaction_date" >= {}')
        parameters_array.append(filters.from_date)
    if filters.to_date is not None:
        filter_clauses.append('trx."transaction_date" < {}')
        parameters_array.append(filters.to_date)
    if filters.min_amount is not None:
        filter_clauses.append('trx."amount" >= {}')
        parameters_array.append(filters.min_amount)
    if filters.max_amount is not None:
        filter_clauses.append('trx."amount" <= {}')
        parameters_array.append(filters.max_amount)
    if filters.category_id is not None:
        filter_clauses.append('trx."category_id" = {}')
        parameters_array.append(filters.category_id)

    normalized_tags = [
        normalized_tag
        for tag in (filters.tags or "").split(",")
        if (normalized_tag := normalize_tag(tag))
    ]
    if normalized_tags:
        filter_clauses.append('trx."tags" && {}::text[]')
        parameters_array.append(normalized_tags)

    if filters.text:
        text_pattern = f"%{filters.text}%"
        filter_clauses.append(
            "("
            'trx."note" ILIKE {} '
            'OR array_to_string(trx."tags", \',\') ILIKE {} '
            'OR trx."amount"::text ILIKE {} '
            'OR c."name" ILIKE {}'
            ")"
        )
        parameters_array.extend([text_pattern] * 4)

    if filters.flow == "expense":
        filter_clauses.append('trx."amount" < 0')
    elif filters.flow == "income":
        filter_clauses.append('trx."amount" > 0')

    if filters.uncategorized is True:
        filter_clauses.append('trx."category_id" IS NULL')

    return " AND ".join(filter_clauses) if filter_clauses else "1=1"


@function_tool()
async def aggregate_transactions(
    ctx: RunContextWrapper[ChatAgentContext],
    filters: TransactionFilter,
    group_by_fields: list[str],
    aggregation_function: Literal["sum", "avg", "min", "max", "count"],
    aggregation_field: AggregationFiled,
    order_asc: bool = True,
) -> TransactionAggregationResult:
    """
    Returns aggregated transaction data based on the provided filters, group by fields, and aggregation function \
    applied to the specified `aggregation_field`;
    results are sorted by the aggregation result according to `order_asc` parameter.
    """

    parameters_array : list[Any] = [ctx.context.user_id]
    additional_where_clause = _build_filters(filters, parameters_array)

    transactions_sql = """\
    SELECT
        trx.id                                  AS id,
        trx.transaction_date                    AS transaction_date_time,
        date_trunc('day', transaction_date)     AS transaction_date_day,
        date_trunc('month', transaction_date)   AS transaction_date_month,
        date_trunc('quarter', transaction_date) AS transaction_date_quarter,
        date_trunc('year', transaction_date)    AS transaction_date_year,
        trx.amount                              AS amount,
        trx.note                                AS note,
        trx.tags                                AS tags,
        trx.currency                            AS currency,
        c.id                                    AS category_id,
        c.name                                  AS category_name,
        c.type                                  AS category_type
    FROM transaction trx
    LEFT JOIN category c ON trx.category_id = c.id
    WHERE user_id = {}
    """ + additional_where_clause



    base_sql = f"""\
    WITH filtered_transactions AS (
    SELECT
        trx.transaction_date                    AS transaction_date_time,
        date_trunc('day', transaction_date)     AS transaction_date_day,
        date_trunc('month', transaction_date)   AS transaction_date_month,
        date_trunc('quarter', transaction_date) AS transaction_date_quarter
        date_trunc('year', transaction_date)    AS transaction_date_year
        trx.amount                              AS amount
        trx.tags                                AS tags
        trx.currency                            AS currency
        trx.category_id                         AS category_id
        c.type                                  AS category_type
    FROM transaction trx
    LEFT JOIN category c ON trx.category_id = c.id
    WHERE user_id = {ctx.context.user_id}
    )

    SELECT {group_by_fields}, {aggregation_function}({aggregation_field}) as value
    FROM transactions trx
    WHERE user_id = {ctx.context.user_id}

    """

    return TransactionAggregationResult(fields=["category_type"], value=0)
