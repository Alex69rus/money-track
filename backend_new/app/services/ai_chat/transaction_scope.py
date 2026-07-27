from datetime import UTC, datetime, time, timedelta

from app.core.config import get_settings
from app.models import TransactionsWithCategory
from app.services.ai_chat.common import TransactionFilter
from app.services.transaction_normalization import normalize_tag


def build_transaction_filter_where(filters: TransactionFilter, parameters: list[object]) -> str:
    filter_clauses: list[str] = []
    if filters.from_date is not None:
        from_start = datetime.combine(filters.from_date, time.min, tzinfo=get_settings().business_tzinfo).astimezone(
            UTC
        )
        filter_clauses.append('"transaction_date_time" >= {}')
        parameters.append(from_start)
    if filters.to_date is not None:
        to_end_exclusive = datetime.combine(
            filters.to_date + timedelta(days=1), time.min, tzinfo=get_settings().business_tzinfo
        ).astimezone(UTC)
        filter_clauses.append('"transaction_date_time" < {}')
        parameters.append(to_end_exclusive)
    if filters.min_amount is not None:
        filter_clauses.append('"amount" >= {}')
        parameters.append(filters.min_amount)
    if filters.max_amount is not None:
        filter_clauses.append('"amount" <= {}')
        parameters.append(filters.max_amount)
    if filters.category_id is not None:
        filter_clauses.append('"category_id" = {}')
        parameters.append(filters.category_id)

    normalized_tags = [
        normalized_tag for tag in (filters.tags or "").split(",") if (normalized_tag := normalize_tag(tag))
    ]
    if normalized_tags:
        filter_clauses.append('"tags" && {}::text[]')
        parameters.append(normalized_tags)

    if filters.text:
        text_pattern = f"%{filters.text}%"
        filter_clauses.append(
            "("
            '"note" ILIKE {} '
            "OR array_to_string(\"tags\", ',') ILIKE {} "
            'OR "amount"::text ILIKE {} '
            'OR "category_name" ILIKE {}'
            ")"
        )
        parameters.extend([text_pattern] * 4)

    if filters.flow == "expense":
        filter_clauses.append('"amount" < 0')
    elif filters.flow == "income":
        filter_clauses.append('"amount" > 0')

    if filters.uncategorized is True:
        filter_clauses.append('"category_id" IS NULL')

    return " AND ".join(filter_clauses) if filter_clauses else "1=1"


def build_filtered_transaction_scope_sql(filters: TransactionFilter, parameters: list[object]) -> str:
    where_clause = build_transaction_filter_where(filters, parameters)
    return f'''\
    FROM "{TransactionsWithCategory._meta.tablename}"
    WHERE "user_id" = {{}} AND ({where_clause})
    '''
