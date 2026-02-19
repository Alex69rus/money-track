from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal, InvalidOperation

from app.models import Category, Transaction
from app.schemas.responses import (
    CategoryResponse,
    PaginatedTransactionsResponse,
    TransactionResponse,
)
from app.schemas.transactions import CreateTransactionRequest, UpdateTransactionRequest


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _parse_decimal(value: str) -> Decimal | None:
    try:
        return Decimal(value)
    except InvalidOperation:
        return None


def _map_category(category: Category) -> CategoryResponse:
    return CategoryResponse(
        id=int(category.id),
        name=category.name,
        type=category.type,
        color=category.color,
        icon=category.icon,
        parentCategoryId=category.parent_category_id,
        orderIndex=category.order_index,
        createdAt=category.created_at,
    )


def _map_transaction(transaction: Transaction, category: Category | None) -> TransactionResponse:
    return TransactionResponse(
        id=int(transaction.id),
        userId=int(transaction.user_id),
        transactionDate=transaction.transaction_date,
        amount=float(transaction.amount),
        note=transaction.note,
        categoryId=transaction.category_id,
        tags=transaction.tags or [],
        currency=transaction.currency,
        smsText=transaction.sms_text,
        messageId=transaction.message_id,
        createdAt=transaction.created_at,
        category=_map_category(category) if category is not None else None,
    )


async def _category_lookup() -> dict[int, Category]:
    categories = await Category.objects().run()
    return {int(category.id): category for category in categories}


async def fetch_categories() -> list[CategoryResponse]:
    categories = await Category.objects().run()
    categories.sort(
        key=lambda category: (
            category.order_index is None,
            category.order_index if category.order_index is not None else 2**31 - 1,
            category.name,
        )
    )
    return [_map_category(category) for category in categories]


async def fetch_tags(*, user_id: int) -> list[str]:
    transactions = await Transaction.objects().where(Transaction.user_id == user_id).run()
    return sorted({tag for transaction in transactions for tag in (transaction.tags or [])})


async def fetch_transactions(
    *,
    user_id: int,
    from_date: date | None,
    to_date: date | None,
    min_amount: Decimal | None,
    max_amount: Decimal | None,
    category_id: int | None,
    tags: str | None,
    text: str | None,
    skip: int,
    take: int,
) -> PaginatedTransactionsResponse:
    query = Transaction.objects().where(Transaction.user_id == user_id)

    if from_date is not None:
        from_start = datetime.combine(from_date, time.min, tzinfo=UTC)
        query = query.where(Transaction.transaction_date >= from_start)

    if to_date is not None:
        to_end = datetime.combine(to_date, time.min, tzinfo=UTC) + timedelta(
            days=1, microseconds=-1
        )
        query = query.where(Transaction.transaction_date <= to_end)

    if min_amount is not None:
        query = query.where(Transaction.amount >= min_amount)

    if max_amount is not None:
        query = query.where(Transaction.amount <= max_amount)

    if category_id is not None:
        query = query.where(Transaction.category_id == category_id)

    parsed_tags = [value for value in (tags or "").split(",") if value]
    if parsed_tags:
        tag_condition = Transaction.tags.any(parsed_tags[0])
        for tag in parsed_tags[1:]:
            tag_condition = tag_condition | Transaction.tags.any(tag)  # type: ignore[assignment]
        query = query.where(tag_condition)

    if text:
        category_ids = [
            int(category.id)
            for category in await Category.objects().where(Category.name.ilike(f"%{text}%")).run()
        ]
        text_condition = Transaction.note.ilike(f"%{text}%") | Transaction.tags.any(text)
        if category_ids:
            text_condition = text_condition | Transaction.category_id.is_in(category_ids)
        parsed_amount = _parse_decimal(text)
        if parsed_amount is not None:
            text_condition = text_condition | (Transaction.amount == parsed_amount)
        query = query.where(text_condition)

    total_count = len(await query.run())
    paged = (
        await query.order_by(Transaction.transaction_date, ascending=False)
        .offset(skip)
        .limit(take)
        .run()
    )
    category_map = await _category_lookup()
    data = [
        _map_transaction(
            transaction,
            category_map.get(int(transaction.category_id))
            if transaction.category_id is not None
            else None,
        )
        for transaction in paged
    ]

    return PaginatedTransactionsResponse(
        data=data,
        totalCount=total_count,
        skip=skip,
        take=take,
        hasMore=skip + take < total_count,
    )


async def create_transaction(
    *, user_id: int, payload: CreateTransactionRequest
) -> TransactionResponse:
    transaction = Transaction(
        user_id=user_id,
        transaction_date=_to_utc(payload.transaction_date),
        amount=payload.amount,
        note=payload.note,
        category_id=payload.category_id,
        tags=payload.tags or [],
        currency=payload.currency,
        sms_text=payload.sms_text,
        message_id=payload.message_id,
        created_at=datetime.now(UTC),
    )
    await transaction.save()

    category = None
    if transaction.category_id is not None:
        category = (
            await Category.objects().where(Category.id == transaction.category_id).first().run()
        )

    return _map_transaction(transaction, category)


async def update_transaction(
    *, user_id: int, transaction_id: int, payload: UpdateTransactionRequest
) -> TransactionResponse | None:
    transaction = await Transaction.objects().where(Transaction.id == transaction_id).first().run()
    if transaction is None or int(transaction.user_id) != user_id:
        return None

    transaction.transaction_date = _to_utc(payload.transaction_date)
    transaction.amount = payload.amount
    transaction.note = payload.note
    transaction.category_id = payload.category_id
    transaction.tags = payload.tags or []
    transaction.currency = payload.currency
    await transaction.save()

    category = None
    if transaction.category_id is not None:
        category = (
            await Category.objects().where(Category.id == transaction.category_id).first().run()
        )

    return _map_transaction(transaction, category)


async def delete_transaction(*, user_id: int, transaction_id: int) -> bool:
    transaction = await Transaction.objects().where(Transaction.id == transaction_id).first().run()
    if transaction is None or int(transaction.user_id) != user_id:
        return False
    await transaction.remove()
    return True
