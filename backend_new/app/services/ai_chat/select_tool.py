from datetime import datetime
from decimal import Decimal
from typing import Literal, cast

from agents.run_context import RunContextWrapper
from agents.tool import ToolOutputText, function_tool
from pydantic import BaseModel

from app.models import TransactionsWithCategory
from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import PaginationSkip, PaginationTake, TransactionFilter
from app.services.ai_chat.transaction_scope import build_filtered_transaction_scope_sql


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


TransactionSortBy = Literal["transaction_date_time", "amount"]
_SORT_COLUMNS: dict[TransactionSortBy, str] = {
    "transaction_date_time": '"transaction_date_time"',
    "amount": '"amount"',
}


@function_tool()
async def list_transactions(
    ctx: RunContextWrapper[ChatAgentContext],
    filters: TransactionFilter,
    skip: PaginationSkip = 0,
    take: PaginationTake = 10,
    sort_by: TransactionSortBy = "transaction_date_time",
    sort_order_asc: bool = False,
) -> ToolOutputText:
    """
    Returns paginated list of transactions according to the specified filters.
    Each transaction includes its details and associated category information.

    Response fields:
    data: List of transactions with details and category information (the model listed below).
    total_count: Total number of transactions matching the filters.
    skip: Number of transactions skipped (for pagination, default: 0).
    take: Number of transactions returned (for pagination, default: 10, maximum: 100).
    has_more: Boolean indicating if there are more transactions available beyond the current page.

    Data model for each transaction:
    id: Transaction ID.
    transaction_date_time: Date and time of the transaction.
    amount: Amount of the transaction.
    note: Transaction noe (if any).
    tags: List of tags associated with the transaction.
    currency: Currency of the transaction.
    category_id: ID of the associated category (if any).
    category_name: Name of the associated category (if any).
    category_type: Type of the associated category (if any).
    """

    parameters: list[object] = [ctx.context.user_id]
    from_and_where_sql = build_filtered_transaction_scope_sql(filters, parameters)

    count_rows = await TransactionsWithCategory.raw(
        f"SELECT COUNT(*) AS total_count {from_and_where_sql}", *parameters
    ).run()
    total_count = int(cast(int | str, count_rows[0]["total_count"]))

    direction = "ASC" if sort_order_asc else "DESC"
    sort_column = _SORT_COLUMNS[sort_by]
    transactions_sql = (
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
    """
    )

    rows = await TransactionsWithCategory.raw(transactions_sql, *parameters, skip, take).run()
    data = [_map_transaction_row(row) for row in rows]

    result = TransactionsList(
        data=data,
        total_count=total_count,
        skip=skip,
        take=take,
        has_more=skip + take < total_count,
    )
    return ToolOutputText(text=result.model_dump_json())


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
