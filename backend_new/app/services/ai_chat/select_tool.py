from datetime import datetime
from decimal import Decimal
from typing import Literal, cast

from agents.run_context import RunContextWrapper
from agents.tool import function_tool
from pydantic import BaseModel

from app.models import TransactionsWithCategory
from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import TransactionFilter
from app.services.ai_chat.transaction_scope import build_filtered_transaction_scope_sql


class TransactionListItem(BaseModel):
    id: int
    transaction_date_time: str
    amount: float
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


TransactionFlow = Literal["expense", "income"]

@function_tool()
async def list_transactions(
    ctx: RunContextWrapper[ChatAgentContext],
    filters: TransactionFilter,
) -> TransactionsList:
    """
    Returns paginated list of transactions according to the specified filters.
    Each transaction includes its details and associated category information.

    Response fields:
    data: List of transactions with details and category information (the model listed below).
    total_count: Total number of transactions matching the filters.
    skip: Number of transactions skipped (for pagination).
    take: Number of transactions returned (for pagination).
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
        + """
    ORDER BY "transaction_date_time" DESC, "id" DESC
    OFFSET {} LIMIT {}
    """
    )

    rows = await TransactionsWithCategory.raw(transactions_sql, *parameters, filters.skip, filters.take).run()
    data = [_map_transaction_row(row) for row in rows]

    return TransactionsList(
        data=data,
        total_count=total_count,
        skip=filters.skip,
        take=filters.take,
        has_more=filters.skip + filters.take < total_count,
    )


def _map_transaction_row(row: dict[str, object]) -> TransactionListItem:
    return TransactionListItem(
        id=int(cast(int | str, row["id"])),
        transaction_date_time=cast(datetime, row["transaction_date_time"]).isoformat(),
        amount=float(cast(Decimal, row["amount"])),
        note=cast(str | None, row["note"]),
        tags=cast(list[str], row["tags"] or []),
        currency=cast(str, row["currency"]),
        category_id=int(cast(int | str, row["category_id"])) if row["category_id"] is not None else None,
        category_name=cast(str | None, row["category_name"]),
        category_type=cast(str | None, row["category_type"]),
    )
