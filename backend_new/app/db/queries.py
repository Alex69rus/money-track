from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from typing import Literal, cast

from piccolo.columns.base import Column
from piccolo.columns.column_types import Varchar
from piccolo.columns.combination import WhereRaw
from piccolo.query.functions.aggregate import Max
from piccolo.query.functions.type_conversion import Cast
from piccolo.query.mixins import OrderByRaw

from app.core.config import get_settings
from app.models import Category, Transaction
from app.schemas.analytics import (
    CategoryBreakdownResponse,
    MonthlyBreakdownResponse,
    TagBreakdownResponse,
    TransactionSummaryResponse,
)
from app.schemas.responses import (
    CategoryResponse,
    PaginatedTransactionsResponse,
    TransactionResponse,
)
from app.schemas.transactions import CreateTransactionRequest, UpdateTransactionRequest
from app.services.transaction_normalization import normalize_currency, normalize_tag

logger = logging.getLogger(__name__)

ANALYTICS_CALCULATION_CURRENCY = "AED"
TransactionFlow = Literal["expense", "income"]


@dataclass(frozen=True)
class SimilarCategoryExample:
    note: str
    amount: Decimal
    category_id: int
    category_name: str


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _date_range_bounds(
    from_date: date | None,
    to_date: date | None,
) -> tuple[datetime | None, datetime | None]:
    business_tz = get_settings().business_tzinfo
    from_start = (
        datetime.combine(from_date, time.min, tzinfo=business_tz).astimezone(UTC) if from_date is not None else None
    )
    to_end_exclusive = (
        datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=business_tz).astimezone(UTC)
        if to_date is not None
        else None
    )
    return from_start, to_end_exclusive


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


def _map_transaction_row(row: dict[str, object]) -> TransactionResponse:
    return TransactionResponse(
        id=int(cast(int | str, row["id"])),
        userId=int(cast(int | str, row["user_id"])),
        transactionDate=cast(datetime, row["transaction_date"]),
        amount=float(cast(Decimal, row["amount"])),
        note=cast(str | None, row["note"]),
        categoryId=cast(int | None, row["category_id"]),
        tags=cast(list[str], row["tags"] or []),
        currency=cast(str, row["currency"]),
        smsText=cast(str | None, row["sms_text"]),
        messageId=cast(str | None, row["message_id"]),
        createdAt=cast(datetime, row["created_at"]),
        category=None,
    )


async def _category_lookup(category_ids: set[int] | None = None) -> dict[int, Category]:
    if category_ids is not None and not category_ids:
        return {}

    query = Category.objects()
    if category_ids is not None:
        query = query.where(Category.id.is_in(sorted(category_ids)))
    categories = await query.run()
    return {int(category.id): category for category in categories}


async def fetch_categories() -> list[CategoryResponse]:
    categories = await Category.objects().order_by(Category.order_index).order_by(Category.name).run()
    return [_map_category(category) for category in categories]


async def fetch_tags(*, user_id: int) -> list[str]:
    rows = await Transaction.raw(
        """
        SELECT tag
        FROM (
            SELECT DISTINCT tag_values.tag COLLATE "C" AS tag
            FROM "transaction" AS t
            CROSS JOIN LATERAL UNNEST(t."tags") AS tag_values(tag)
            WHERE t."user_id" = {}
        ) AS distinct_tags
        ORDER BY tag
        """,
        user_id,
    ).run()
    return [str(row["tag"]) for row in rows]


async def fetch_transactions(
    *,
    user_id: int,
    from_date: date | None,
    to_date: date | None,
    min_amount: Decimal | None,
    max_amount: Decimal | None,
    category_id: int | None,
    tags: str | None,
    tag: str | None,
    text: str | None,
    flow: TransactionFlow | None,
    uncategorized: bool,
    calculation_currency_only: bool,
    skip: int,
    take: int,
) -> PaginatedTransactionsResponse:
    query = Transaction.objects().where(Transaction.user_id == user_id)
    count_query = Transaction.count().where(Transaction.user_id == user_id)
    from_start, to_end_exclusive = _date_range_bounds(from_date, to_date)

    if from_start is not None:
        query = query.where(Transaction.transaction_date >= from_start)
        count_query = count_query.where(Transaction.transaction_date >= from_start)

    if to_end_exclusive is not None:
        query = query.where(Transaction.transaction_date < to_end_exclusive)
        count_query = count_query.where(Transaction.transaction_date < to_end_exclusive)

    if calculation_currency_only:
        query = query.where(Transaction.currency == ANALYTICS_CALCULATION_CURRENCY)
        count_query = count_query.where(Transaction.currency == ANALYTICS_CALCULATION_CURRENCY)

    if flow == "expense":
        query = query.where(Transaction.amount < Decimal("0"))
        count_query = count_query.where(Transaction.amount < Decimal("0"))
    elif flow == "income":
        query = query.where(Transaction.amount > Decimal("0"))
        count_query = count_query.where(Transaction.amount > Decimal("0"))

    if min_amount is not None:
        query = query.where(Transaction.amount >= min_amount)
        count_query = count_query.where(Transaction.amount >= min_amount)

    if max_amount is not None:
        query = query.where(Transaction.amount <= max_amount)
        count_query = count_query.where(Transaction.amount <= max_amount)

    if category_id is not None:
        query = query.where(Transaction.category_id == category_id)
        count_query = count_query.where(Transaction.category_id == category_id)

    if uncategorized:
        query = query.where(Transaction.category_id.is_null())
        count_query = count_query.where(Transaction.category_id.is_null())

    parsed_tags = [normalize_tag(value) for value in (tags or "").split(",") if normalize_tag(value)]
    if parsed_tags:
        query_tag_condition = Transaction.tags.any(parsed_tags[0])
        count_tag_condition = Transaction.tags.any(parsed_tags[0])
        for parsed_tag in parsed_tags[1:]:
            query_tag_condition = query_tag_condition | Transaction.tags.any(parsed_tag)  # type: ignore[assignment]
            count_tag_condition = count_tag_condition | Transaction.tags.any(parsed_tag)  # type: ignore[assignment]
        query = query.where(query_tag_condition)
        count_query = count_query.where(count_tag_condition)

    if tag:
        normalized_tag = normalize_tag(tag)
        if normalized_tag:
            query = query.where(Transaction.tags.any(normalized_tag))
            count_query = count_query.where(Transaction.tags.any(normalized_tag))

    if text:
        text_pattern = f"%{text}%"
        category_ids = [
            int(category.id) for category in await Category.objects().where(Category.name.ilike(text_pattern)).run()
        ]
        text_condition = (
            Transaction.note.ilike(text_pattern)
            | WhereRaw("{} ILIKE {}", Cast(Transaction.tags, Varchar()), text_pattern)
            | WhereRaw("{} ILIKE {}", Cast(Transaction.amount, Varchar()), text_pattern)
        )
        if category_ids:
            text_condition = text_condition | Transaction.category_id.is_in(category_ids)
        query = query.where(text_condition)
        count_query = count_query.where(text_condition)

    total_count = int(await count_query.run())
    paged = await query.order_by(Transaction.transaction_date, ascending=False).offset(skip).limit(take).run()
    category_map = await _category_lookup(
        {int(transaction.category_id) for transaction in paged if transaction.category_id is not None}
    )
    data = [
        _map_transaction(
            transaction,
            category_map.get(int(transaction.category_id)) if transaction.category_id is not None else None,
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


def _analytics_scope_sql(
    *,
    user_id: int,
    from_date: date | None,
    to_date: date | None,
) -> tuple[str, tuple[object, ...]]:
    clauses = ['t."user_id" = {}', 't."currency" = {}']
    parameters: list[object] = [user_id, ANALYTICS_CALCULATION_CURRENCY]
    from_start, to_end_exclusive = _date_range_bounds(from_date, to_date)
    if from_start is not None:
        clauses.append('t."transaction_date" >= {}')
        parameters.append(from_start)
    if to_end_exclusive is not None:
        clauses.append('t."transaction_date" < {}')
        parameters.append(to_end_exclusive)
    return " AND ".join(clauses), tuple(parameters)


async def fetch_transaction_summary(
    *,
    user_id: int,
    from_date: date | None,
    to_date: date | None,
) -> TransactionSummaryResponse:
    where_sql, parameters = _analytics_scope_sql(
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
    )
    rows = await Transaction.raw(
        f"""
        SELECT
            COALESCE(SUM(CASE WHEN t."amount" > 0 THEN t."amount" ELSE 0 END), 0) AS "totalIncome",
            COALESCE(SUM(CASE WHEN t."amount" < 0 THEN -t."amount" ELSE 0 END), 0) AS "totalExpenses",
            COALESCE(SUM(t."amount"), 0) AS "balance",
            COUNT(*) AS "transactionCount"
        FROM "transaction" AS t
        WHERE {where_sql}
        """,
        *parameters,
    ).run()
    return TransactionSummaryResponse.model_validate(rows[0])


async def fetch_transactions_by_categories(
    *,
    user_id: int,
    from_date: date | None,
    to_date: date | None,
) -> CategoryBreakdownResponse:
    where_sql, parameters = _analytics_scope_sql(
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
    )
    rows = await Transaction.raw(
        f"""
        WITH category_totals AS (
            SELECT
                t."category_id",
                SUM(-t."amount") AS amount,
                COUNT(*) AS transaction_count
            FROM "transaction" AS t
            WHERE {where_sql} AND t."amount" < 0
            GROUP BY t."category_id"
        )
        SELECT
            category_totals."category_id" AS "categoryId",
            COALESCE(c."name", 'Uncategorized') AS "categoryName",
            c."icon" AS "categoryIcon",
            c."color" AS "categoryColor",
            category_totals.amount AS amount,
            category_totals.transaction_count AS "transactionCount",
            COALESCE(
                category_totals.amount / NULLIF(SUM(category_totals.amount) OVER (), 0),
                0
            ) AS share
        FROM category_totals
        LEFT JOIN "category" AS c ON c."id" = category_totals."category_id"
        ORDER BY
            category_totals.amount DESC,
            LOWER(COALESCE(c."name", 'Uncategorized')),
            category_totals."category_id" NULLS LAST
        """,
        *parameters,
    ).run()
    return CategoryBreakdownResponse.model_validate({"data": rows})


async def fetch_transactions_by_tags(
    *,
    user_id: int,
    from_date: date | None,
    to_date: date | None,
) -> TagBreakdownResponse:
    where_sql, parameters = _analytics_scope_sql(
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
    )
    rows = await Transaction.raw(
        f"""
        WITH filtered_expenses AS (
            SELECT t."tags", t."amount"
            FROM "transaction" AS t
            WHERE {where_sql} AND t."amount" < 0
        ),
        expense_total AS (
            SELECT COALESCE(SUM(-"amount"), 0) AS amount
            FROM filtered_expenses
        ),
        tag_totals AS (
            SELECT
                tag_values.tag AS tag,
                SUM(-filtered_expenses."amount") AS amount,
                COUNT(*) AS transaction_count
            FROM filtered_expenses
            CROSS JOIN LATERAL UNNEST(filtered_expenses."tags") AS tag_values(tag)
            GROUP BY tag_values.tag
        )
        SELECT
            tag_totals.tag AS tag,
            tag_totals.amount AS amount,
            tag_totals.transaction_count AS "transactionCount",
            COALESCE(tag_totals.amount / NULLIF(expense_total.amount, 0), 0) AS share
        FROM tag_totals
        CROSS JOIN expense_total
        ORDER BY tag_totals.amount DESC, tag_totals.tag
        """,
        *parameters,
    ).run()
    return TagBreakdownResponse.model_validate({"data": rows})


async def fetch_transactions_by_months(
    *,
    user_id: int,
    from_date: date | None,
    to_date: date | None,
) -> MonthlyBreakdownResponse:
    where_sql, parameters = _analytics_scope_sql(
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
    )
    rows = await Transaction.raw(
        f"""
        SELECT
            TO_CHAR(t."transaction_date" AT TIME ZONE {{}}, 'YYYY-MM') AS month,
            COALESCE(SUM(CASE WHEN t."amount" > 0 THEN t."amount" ELSE 0 END), 0) AS income,
            COALESCE(SUM(CASE WHEN t."amount" < 0 THEN -t."amount" ELSE 0 END), 0) AS expenses,
            COALESCE(SUM(t."amount"), 0) AS balance
        FROM "transaction" AS t
        WHERE {where_sql}
        GROUP BY 1
        ORDER BY 1
        """,
        get_settings().business_timezone,
        *parameters,
    ).run()
    return MonthlyBreakdownResponse.model_validate({"data": rows})


async def create_transaction(*, user_id: int, payload: CreateTransactionRequest) -> TransactionResponse:
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

    # Create endpoint returns the saved row without eager-loading category.
    return _map_transaction(transaction, None)


async def update_transaction(
    *, user_id: int, transaction_id: int, payload: UpdateTransactionRequest
) -> TransactionResponse | None:
    transaction = (
        await Transaction.objects()
        .where((Transaction.id == transaction_id) & (Transaction.user_id == user_id))
        .first()
        .run()
    )
    if transaction is None:
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
        category = await Category.objects().where(Category.id == transaction.category_id).first().run()

    return _map_transaction(transaction, category)


async def delete_transaction(*, user_id: int, transaction_id: int) -> bool:
    transaction = (
        await Transaction.objects()
        .where((Transaction.id == transaction_id) & (Transaction.user_id == user_id))
        .first()
        .run()
    )
    if transaction is None:
        return False
    await transaction.remove()
    return True


async def upsert_transaction_by_message_id(
    *,
    user_id: int,
    message_id: str,
    transaction_date: datetime,
    amount: Decimal,
    currency: str,
    note: str | None,
    sms_text: str,
) -> TransactionResponse:
    note_to_save = note.strip() if note and note.strip() else None
    normalized_currency = normalize_currency(currency)
    created_at = datetime.now(UTC)
    conflict_values: list[Column] = [
        Transaction.transaction_date,
        Transaction.amount,
        Transaction.currency,
        Transaction.sms_text,
    ]
    # Preserve existing note on conflict when parser produced empty / blank note.
    if note_to_save is not None:
        conflict_values.append(Transaction.note)

    try:
        rows = (
            await Transaction.insert(
                Transaction(
                    user_id=user_id,
                    transaction_date=_to_utc(transaction_date),
                    amount=amount,
                    note=note_to_save,
                    category_id=None,
                    tags=[],
                    currency=normalized_currency,
                    sms_text=sms_text,
                    message_id=message_id,
                    created_at=created_at,
                )
            )
            .on_conflict(
                target=(Transaction.user_id, Transaction.message_id),
                action="DO UPDATE",
                values=conflict_values,
            )
            .returning(
                Transaction.id,
                Transaction.user_id,
                Transaction.transaction_date,
                Transaction.amount,
                Transaction.note,
                Transaction.category_id,
                Transaction.tags,
                Transaction.currency,
                Transaction.sms_text,
                Transaction.message_id,
                Transaction.created_at,
            )
            .run()
        )
    except Exception as exc:
        logger.error(
            "Failed to upsert transaction by message_id: user_id=%s message_id=%s error=%s",
            user_id,
            message_id,
            exc,
            exc_info=True,
        )
        raise

    if not rows:
        raise RuntimeError("Upsert returned no rows")

    row = rows[0]
    return _map_transaction_row(row)


async def fetch_category_name_by_id(*, category_id: int) -> str | None:
    category = await Category.objects().where(Category.id == category_id).first().run()
    if category is None:
        return None
    return category.name


async def fetch_transaction_by_id_for_user(
    *,
    user_id: int,
    transaction_id: int,
) -> TransactionResponse | None:
    transaction = (
        await Transaction.objects()
        .where((Transaction.id == transaction_id) & (Transaction.user_id == user_id))
        .first()
        .run()
    )
    if transaction is None:
        return None
    category = None
    if transaction.category_id is not None:
        category = await Category.objects().where(Category.id == transaction.category_id).first().run()
    return _map_transaction(transaction, category)


async def update_transaction_category_for_user(
    *,
    user_id: int,
    transaction_id: int,
    category_id: int | None,
) -> TransactionResponse | None:
    transaction = (
        await Transaction.objects()
        .where((Transaction.id == transaction_id) & (Transaction.user_id == user_id))
        .first()
        .run()
    )
    if transaction is None:
        return None

    transaction.category_id = category_id
    await transaction.save()
    category = None
    if category_id is not None:
        category = await Category.objects().where(Category.id == category_id).first().run()
    return _map_transaction(transaction, category)


async def fetch_similar_category_examples(
    *,
    user_id: int,
    note_prefix: str,
    exclude_transaction_id: int,
    limit: int = 3,
) -> list[SimilarCategoryExample]:
    if not note_prefix or limit <= 0:
        return []

    normalized_prefix = note_prefix.strip()
    if not normalized_prefix:
        return []

    pattern = f"{normalized_prefix}%"
    base_condition = (
        (Transaction.user_id == user_id)
        & Transaction.category_id.is_not_null()
        & (Transaction.id != exclude_transaction_id)
        & Transaction.note.ilike(pattern)
    )
    ranked_category_rows = (
        await Transaction.select(
            Transaction.category_id,
            Max(Transaction.transaction_date, alias="latest_transaction_date"),
        )
        .where(base_condition)
        .group_by(Transaction.category_id)
        .order_by(OrderByRaw('MAX("transaction"."transaction_date")'), ascending=False)
        .order_by(Transaction.category_id)
        .limit(limit)
        .run()
    )
    if not ranked_category_rows:
        return []

    ranked_category_ids = [
        int(category_id)
        for category_id in [cast(int | None, row["category_id"]) for row in ranked_category_rows]
        if category_id is not None
    ]
    if not ranked_category_ids:
        return []

    category_rank = {category_id: rank for rank, category_id in enumerate(ranked_category_ids)}
    rows = (
        await Transaction.select(
            Transaction.note,
            Transaction.amount,
            Transaction.category_id,
        )
        .where(base_condition & Transaction.category_id.is_in(ranked_category_ids))
        .distinct(on=[Transaction.category_id])
        .order_by(Transaction.category_id)
        .order_by(Transaction.transaction_date, ascending=False)
        .run()
    )
    if not rows:
        return []

    rows.sort(key=lambda row: category_rank.get(int(cast(int, row["category_id"])), len(category_rank)))

    category_map = await _category_lookup(set(ranked_category_ids))
    examples: list[SimilarCategoryExample] = []
    for row in rows:
        category_id = cast(int | None, row["category_id"])
        if category_id is None:
            continue
        category = category_map.get(category_id)
        if category is None:
            continue
        examples.append(
            SimilarCategoryExample(
                note=cast(str | None, row["note"]) or "",
                amount=cast(Decimal, row["amount"]),
                category_id=category_id,
                category_name=category.name,
            )
        )
    return examples
