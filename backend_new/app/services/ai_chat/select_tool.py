from typing import Literal

from agents.run_context import RunContextWrapper
from agents.tool import function_tool
from pydantic import BaseModel

from app.db.queries import fetch_transactions
from app.schemas.responses import TransactionResponse
from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import TransactionFilter


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
    result = await fetch_transactions(
        user_id=ctx.context.user_id,
        from_date=filters.from_date,
        to_date=filters.to_date,
        min_amount=filters.min_amount,
        max_amount=filters.max_amount,
        category_id=filters.category_id,
        tags=filters.tags,
        tag=None,
        text=filters.text,
        flow=filters.flow,
        uncategorized=filters.uncategorized,
        calculation_currency_only=False,
        skip=filters.skip,
        take=filters.take,
    )

    mapped_transactions = [_map_transaction_to_list_item(trx) for trx in result.data]
    return TransactionsList(
        data=mapped_transactions,
        total_count=result.totalCount,
        skip=result.skip,
        take=result.take,
        has_more=result.hasMore,
    )


def _map_transaction_to_list_item(transaction: TransactionResponse) -> TransactionListItem:
    return TransactionListItem(
        id=transaction.id,
        transaction_date_time=transaction.transactionDate.isoformat(),
        amount=float(transaction.amount),
        note=transaction.note,
        tags=transaction.tags,
        currency=transaction.currency,
        category_id=transaction.category.id if transaction.category else None,
        category_name=transaction.category.name if transaction.category else None,
        category_type=transaction.category.type if transaction.category else None,
    )
