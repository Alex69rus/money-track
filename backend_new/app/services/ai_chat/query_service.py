from datetime import date, datetime
from decimal import Decimal
from typing import Literal, cast

from pydantic import BaseModel

from app.core.config import get_settings
from app.models import TransactionsWithCategory
from app.services.ai_chat.common import PaginationSkip, PaginationTake, TransactionFilter
from app.services.ai_chat.transaction_scope import build_filtered_transaction_scope_sql

GroupByField = Literal[
    "transaction_date_day",
    "transaction_date_month",
    "transaction_date_quarter",
    "transaction_date_year",
    "tag",
    "category_id",
    "category_name",
    "category_type",
]
AggregationField = Literal["amount", "category_id"]
AggregationFunction = Literal["sum", "avg", "min", "max", "count"]
TransactionSortBy = Literal["transaction_date_time", "amount"]

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
    "category_name": '"category_name"',
    "category_type": '"category_type"',
}
_SORT_COLUMNS: dict[TransactionSortBy, str] = {
    "transaction_date_time": '"transaction_date_time"',
    "amount": '"amount"',
}


class TransactionListItem(BaseModel):
    id: int
    transaction_date_time: str
    amount: Decimal
    note: str | None
    tags: list[str]
    currency: str
    category_id: int | None
    category_name: str | None
    category_type: str | None


class TransactionsList(BaseModel):
    data: list[TransactionListItem]
    total_count: int
    skip: int
    take: int
    has_more: bool


class TransactionAggregationResult(BaseModel):
    fields: dict[GroupByField, date | int | str | None]
    value: Decimal | int | None


class PaginatedTransactionAggregations(BaseModel):
    data: list[TransactionAggregationResult]
    total_count: int
    skip: int
    take: int
    has_more: bool


async def query_transactions(
    *,
    user_id: int,
    filters: TransactionFilter,
    skip: PaginationSkip = 0,
    take: PaginationTake = 10,
    sort_by: TransactionSortBy = "transaction_date_time",
    sort_order_asc: bool = False,
) -> TransactionsList:
    parameters: list[object] = [user_id]
    from_and_where_sql = build_filtered_transaction_scope_sql(filters, parameters)
    count_rows = await TransactionsWithCategory.raw(
        f"SELECT COUNT(*) AS total_count {from_and_where_sql}", *parameters
    ).run()
    total_count = int(cast(int | str, count_rows[0]["total_count"]))

    direction = "ASC" if sort_order_asc else "DESC"
    sort_column = _SORT_COLUMNS[sort_by]
    rows = await TransactionsWithCategory.raw(
        """\
        SELECT
            "id"                    AS id,
            "transaction_date_time" AS transaction_date_time,
            "amount"                AS amount,
            "note"                  AS note,
            "tags"                  AS tags,
            "currency"              AS currency,
            "category_id"           AS category_id,
            "category_name"         AS category_name,
            "category_type"         AS category_type
        """
        + from_and_where_sql
        + f"""
        ORDER BY {sort_column} {direction}, "id" {direction}
        OFFSET {{}} LIMIT {{}}
        """,
        *parameters,
        skip,
        take,
    ).run()
    data = [_map_transaction_row(row) for row in rows]
    return TransactionsList(
        data=data,
        total_count=total_count,
        skip=skip,
        take=take,
        has_more=skip + take < total_count,
    )


async def query_aggregations(
    *,
    user_id: int,
    filters: TransactionFilter,
    group_by_fields: list[GroupByField],
    aggregation_function: AggregationFunction,
    aggregation_field: AggregationField,
    sort_order_asc: bool = True,
    sort_by_absolute_value: bool = False,
    sort_by_group_field: GroupByField | None = None,
    skip: PaginationSkip = 0,
    take: PaginationTake = 10,
) -> PaginatedTransactionAggregations:
    grouped_sql, parameters = build_grouped_aggregation_sql(
        user_id=user_id,
        filters=filters,
        group_by_fields=group_by_fields,
        aggregation_function=aggregation_function,
        aggregation_field=aggregation_field,
    )
    count_rows = await TransactionsWithCategory.raw(
        f"WITH grouped_transactions AS ({grouped_sql}) SELECT COUNT(*) AS total_count FROM grouped_transactions",
        *parameters,
    ).run()
    total_count = int(cast(int | str, count_rows[0]["total_count"]))

    direction = "ASC" if sort_order_asc else "DESC"
    tie_breakers = ", ".join(f'"{field}" ASC NULLS LAST' for field in group_by_fields if field != sort_by_group_field)
    if sort_by_group_field is not None:
        if sort_by_group_field not in group_by_fields:
            raise ValueError("sort_by_group_field must be included in group_by_fields")
        ordering = f'"{sort_by_group_field}" {direction} NULLS LAST'
    elif sort_by_absolute_value:
        ordering = f'ABS("value") {direction} NULLS LAST'
    else:
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
            value=cast(Decimal | int | None, row["value"]),
        )
        for row in rows
    ]
    return PaginatedTransactionAggregations(
        data=data,
        total_count=total_count,
        skip=skip,
        take=take,
        has_more=skip + take < total_count,
    )


def build_grouped_aggregation_sql(
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


def _map_transaction_row(row: dict[str, object]) -> TransactionListItem:
    return TransactionListItem(
        id=int(cast(int | str, row["id"])),
        transaction_date_time=cast(datetime, row["transaction_date_time"]).isoformat(),
        amount=cast(Decimal, row["amount"]),
        note=cast(str | None, row["note"]),
        tags=cast(list[str], row["tags"] or []),
        currency=cast(str, row["currency"]),
        category_id=int(cast(int | str, row["category_id"])) if row["category_id"] is not None else None,
        category_name=cast(str | None, row["category_name"]),
        category_type=cast(str | None, row["category_type"]),
    )
