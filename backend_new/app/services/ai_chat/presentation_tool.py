from __future__ import annotations

from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal, cast

from agents import RunContextWrapper, function_tool
from agents.tool import ToolOutputText
from pydantic import BaseModel, ConfigDict, model_validator

from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.common import PaginationTake, TransactionFilter
from app.services.ai_chat.contracts import (
    BarVisualItemV1,
    BarVisualV1,
    BreakdownTableRowV1,
    CategoryShareItemV1,
    CategoryShareVisualV1,
    ChatResponseV1,
    ChatVisualV1,
    ComparisonTableRowV1,
    LinePointV1,
    LineVisualV1,
    MoneyV1,
    PercentageV1,
    PeriodV1,
    SummaryMetricV1,
    SummaryVisualV1,
    TableRowV1,
    TableVisualV1,
    TransactionTableRowV1,
)
from app.services.ai_chat.query_service import (
    PaginatedTransactionAggregations,
    TransactionAggregationResult,
    query_aggregations,
    query_distinct_currencies,
    query_transactions,
)

AnalysisKind = Literal[
    "spending_summary",
    "income_summary",
    "balance_summary",
    "transactions",
    "category_spending",
    "tag_spending",
    "category_income",
    "tag_income",
    "category_balance",
    "tag_balance",
    "category_share",
    "tag_share",
    "trend",
    "comparison_summary",
    "category_growth",
    "tag_growth",
]
SinglePeriodAnalysisKind = Literal[
    "spending_summary",
    "income_summary",
    "balance_summary",
    "transactions",
    "category_spending",
    "tag_spending",
    "category_income",
    "tag_income",
    "category_balance",
    "tag_balance",
    "category_share",
    "tag_share",
    "trend",
]
PresentationKind = Literal["summary", "table", "bar", "line", "category_share"]
TrendGranularity = Literal["month", "quarter", "year"]
_TREND_GROUPINGS: dict[
    TrendGranularity, Literal["transaction_date_month", "transaction_date_quarter", "transaction_date_year"]
] = {
    "month": "transaction_date_month",
    "quarter": "transaction_date_quarter",
    "year": "transaction_date_year",
}


class ComparisonPeriods(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_from_date: date
    current_to_date: date
    previous_from_date: date
    previous_to_date: date

    @model_validator(mode="after")
    def validate_ranges(self) -> ComparisonPeriods:
        if self.current_from_date > self.current_to_date or self.previous_from_date > self.previous_to_date:
            raise ValueError("comparison dates must be ordered")
        if not (self.current_to_date < self.previous_from_date or self.previous_to_date < self.current_from_date):
            raise ValueError("comparison periods must not overlap")
        return self


def _money(value: Decimal, currency: str, *, absolute: bool = False) -> MoneyV1:
    safe_value = abs(value) if absolute else value
    amount = format(safe_value, "f")
    return MoneyV1(amount=amount, currency=currency, display=f"{currency} {amount}")


def _percentage(value: Decimal, *, signed: bool = False) -> PercentageV1:
    rounded = value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    raw = format(rounded, "f")
    prefix = "+" if signed and rounded > 0 else ""
    return PercentageV1(value=raw, display=f"{prefix}{raw}%")


def _period(filters: TransactionFilter) -> PeriodV1:
    from_date = filters.from_date.isoformat() if filters.from_date else None
    to_date = filters.to_date.isoformat() if filters.to_date else None
    if from_date and to_date:
        label = f"{from_date} to {to_date}"
    elif from_date:
        label = f"From {from_date}"
    elif to_date:
        label = f"Until {to_date}"
    else:
        label = "All time"
    return PeriodV1(label=label, from_date=from_date, to_date=to_date)


def _comparison_period(current: TransactionFilter, previous: TransactionFilter) -> PeriodV1:
    return PeriodV1(
        label=f"{_period(current).label} compared with {_period(previous).label}",
        from_date=None,
        to_date=None,
    )


def _with_dates(filters: TransactionFilter, from_date: date, to_date: date) -> TransactionFilter:
    return filters.model_copy(update={"from_date": from_date, "to_date": to_date})


def _with_flow(filters: TransactionFilter, flow: Literal["expense", "income"] | None) -> TransactionFilter:
    return filters.model_copy(update={"flow": flow})


def _trend_label(bucket: str, granularity: TrendGranularity) -> str:
    bucket_date = date.fromisoformat(bucket)
    if granularity == "month":
        return bucket_date.strftime("%Y-%m")
    if granularity == "quarter":
        return f"Q{(bucket_date.month - 1) // 3 + 1} {bucket_date.year}"
    return str(bucket_date.year)


async def _currency_or_limitation(
    *, user_id: int, filters: list[TransactionFilter]
) -> tuple[str | None, ChatResponseV1 | None]:
    currencies = sorted(
        {
            currency
            for current_filters in filters
            for currency in await query_distinct_currencies(user_id=user_id, filters=current_filters)
        }
    )
    if len(currencies) > 1:
        return None, ChatResponseV1(
            kind="limitation",
            message="I can’t combine multiple currencies until converted analytics values are available.",
        )
    return (currencies[0] if currencies else None), None


async def _sum_amount(*, user_id: int, filters: TransactionFilter) -> Decimal | None:
    result = await query_aggregations(
        user_id=user_id,
        filters=filters,
        group_by_fields=[],
        aggregation_function="sum",
        aggregation_field="amount",
        take=1,
    )
    value = result.data[0].value if result.data else None
    return value if isinstance(value, Decimal) else None


def _no_data(period: PeriodV1) -> ChatResponseV1:
    return ChatResponseV1(kind="answer", message=f"I found no matching transactions for {period.label}.")


async def _breakdown(
    *, user_id: int, filters: TransactionFilter, group_by: Literal["category_name", "tag"], take: PaginationTake = 10
) -> PaginatedTransactionAggregations:
    return await query_aggregations(
        user_id=user_id,
        filters=filters,
        group_by_fields=[group_by],
        aggregation_function="sum",
        aggregation_field="amount",
        sort_order_asc=False,
        sort_by_absolute_value=True,
        take=take,
    )


def _group_label(row: TransactionAggregationResult, field: Literal["category_name", "tag"]) -> str:
    value = row.fields.get(field)
    return str(value) if value else "Uncategorized"


async def _present_single_period(
    *,
    user_id: int,
    analysis: SinglePeriodAnalysisKind,
    presentation: PresentationKind,
    filters: TransactionFilter,
    trend_granularity: TrendGranularity,
) -> ChatResponseV1:
    period = _period(filters)

    if analysis == "transactions":
        if presentation != "table":
            return _unsupported_presentation()
        transactions = await query_transactions(user_id=user_id, filters=filters, take=20)
        if not transactions.data:
            return _no_data(period)
        rows: list[TableRowV1] = [
            TransactionTableRowV1(
                id=item.id,
                date_time=item.transaction_date_time,
                category=item.category_name,
                tags=item.tags,
                note=item.note,
                amount=_money(item.amount, item.currency),
            )
            for item in transactions.data
        ]
        transaction_visual = TableVisualV1(
            kind="table", title="Matching transactions", period=period, table_kind="transactions", rows=rows
        )
        return ChatResponseV1(
            kind="answer",
            message=f"I found {transactions.total_count} matching transactions for {period.label}.",
            visual=transaction_visual,
        )

    if analysis in {"spending_summary", "income_summary", "balance_summary"}:
        if presentation != "summary":
            return _unsupported_presentation()
        if analysis == "spending_summary":
            metric_key: Literal["spending", "income", "balance"] = "spending"
            metric_filters = _with_flow(filters, "expense")
        elif analysis == "income_summary":
            metric_key = "income"
            metric_filters = _with_flow(filters, "income")
        else:
            metric_key = "balance"
            metric_filters = _with_flow(filters, None)
        currency, limitation = await _currency_or_limitation(user_id=user_id, filters=[metric_filters])
        if limitation:
            return limitation
        amount = await _sum_amount(user_id=user_id, filters=metric_filters)
        if amount is None or currency is None:
            return _no_data(period)
        value = _money(amount, currency, absolute=metric_key == "spending")
        label = {"spending": "Spending", "income": "Income", "balance": "Balance"}[metric_key]
        summary_visual = SummaryVisualV1(
            kind="summary",
            title=f"{label} summary",
            period=period,
            metrics=[
                SummaryMetricV1(key=metric_key, label=label, money=value),
                SummaryMetricV1(
                    key="transaction_count",
                    label="Matching transactions",
                    count=(await query_transactions(user_id=user_id, filters=metric_filters, take=1)).total_count,
                ),
            ],
        )
        return ChatResponseV1(
            kind="answer", message=f"{label} for {period.label} was {value.display}.", visual=summary_visual
        )

    if analysis == "trend":
        group_by = _TREND_GROUPINGS[trend_granularity]
        expense_filters = _with_flow(filters, "expense")
        income_filters = _with_flow(filters, "income")
        currency, limitation = await _currency_or_limitation(user_id=user_id, filters=[expense_filters, income_filters])
        if limitation:
            return limitation
        if presentation != "line" or currency is None:
            return _unsupported_presentation() if currency else _no_data(period)
        expenses = await query_aggregations(
            user_id=user_id,
            filters=expense_filters,
            group_by_fields=[group_by],
            aggregation_function="sum",
            aggregation_field="amount",
            sort_order_asc=False,
            sort_by_group_field=group_by,
            take=100,
        )
        incomes = await query_aggregations(
            user_id=user_id,
            filters=income_filters,
            group_by_fields=[group_by],
            aggregation_function="sum",
            aggregation_field="amount",
            sort_order_asc=False,
            sort_by_group_field=group_by,
            take=100,
        )
        by_bucket: dict[str, tuple[Decimal, Decimal]] = {}
        for row in expenses.data:
            key = str(row.fields[group_by])
            expense = row.value if isinstance(row.value, Decimal) else Decimal("0")
            _, income = by_bucket.get(key, (Decimal("0"), Decimal("0")))
            by_bucket[key] = (abs(expense), income)
        for row in incomes.data:
            key = str(row.fields[group_by])
            income = row.value if isinstance(row.value, Decimal) else Decimal("0")
            expense, _ = by_bucket.get(key, (Decimal("0"), Decimal("0")))
            by_bucket[key] = (expense, income)
        if len(by_bucket) < 2:
            return _no_data(period)
        points = [
            LinePointV1(
                bucket=key,
                label=_trend_label(key, trend_granularity),
                spending=_money(expense, currency),
                income=_money(income, currency),
            )
            for key, (expense, income) in sorted(by_bucket.items())[-12:]
        ]
        trend_visual = LineVisualV1(
            kind="line",
            title=f"Income and spending {trend_granularity} trend",
            period=period,
            points=points,
        )
        return ChatResponseV1(
            kind="answer",
            message=f"Here is your income and spending {trend_granularity} trend for {period.label}.",
            visual=trend_visual,
        )

    field: Literal["category_name", "tag"] = "category_name" if analysis.startswith("category") else "tag"
    dimension: Literal["category", "tag"] = "category" if field == "category_name" else "tag"
    breakdown_config: dict[
        str, tuple[Literal["expense", "income"] | None, Literal["spending", "income", "balance"]]
    ] = {
        "category_spending": ("expense", "spending"),
        "tag_spending": ("expense", "spending"),
        "category_income": ("income", "income"),
        "tag_income": ("income", "income"),
        "category_balance": (None, "balance"),
        "tag_balance": (None, "balance"),
    }
    if analysis in breakdown_config:
        flow, measure = breakdown_config[analysis]
        breakdown_filters = _with_flow(filters, flow)
        currency, limitation = await _currency_or_limitation(user_id=user_id, filters=[breakdown_filters])
        if limitation:
            return limitation
        breakdown = await _breakdown(user_id=user_id, filters=breakdown_filters, group_by=field)
        if not breakdown.data or currency is None:
            return _no_data(period)
        values = [
            (_group_label(row, field), row.value if isinstance(row.value, Decimal) else Decimal("0"))
            for row in breakdown.data
        ]
        breakdown_visual: ChatVisualV1
        if presentation == "bar":
            breakdown_visual = BarVisualV1(
                kind="bar",
                title=f"{measure.title()} by {dimension}",
                period=period,
                measure=measure,
                items=[
                    BarVisualItemV1(
                        label=label,
                        value=_money(value, currency, absolute=measure == "spending"),
                    )
                    for label, value in values
                ],
            )
        elif presentation == "table":
            breakdown_visual = TableVisualV1(
                kind="table",
                title=f"{measure.title()} by {dimension}",
                period=period,
                table_kind="breakdown",
                rows=[
                    BreakdownTableRowV1(
                        label=label,
                        value=_money(value, currency, absolute=measure == "spending"),
                    )
                    for label, value in values
                ],
            )
        else:
            return _unsupported_presentation()
        return ChatResponseV1(
            kind="answer",
            message=f"Here is {measure} by {dimension} for {period.label}.",
            visual=breakdown_visual,
        )

    expense_filters = _with_flow(filters, "expense")
    currency, limitation = await _currency_or_limitation(user_id=user_id, filters=[expense_filters])
    if limitation:
        return limitation
    breakdown = await _breakdown(user_id=user_id, filters=expense_filters, group_by=field)
    if not breakdown.data or currency is None:
        return _no_data(period)
    values = [
        (_group_label(row, field), abs(row.value) if isinstance(row.value, Decimal) else Decimal("0"))
        for row in breakdown.data
    ]
    if presentation != "category_share":
        return _unsupported_presentation()
    total = sum((value for _, value in values), Decimal("0"))
    if total == 0:
        return _no_data(period)
    share_visual = CategoryShareVisualV1(
        kind="category_share",
        title=f"Spending share by {dimension}",
        period=period,
        dimension=dimension,
        items=[
            CategoryShareItemV1(
                label=label, value=_money(value, currency), share=_percentage(value / total * Decimal("100"))
            )
            for label, value in values
        ],
    )
    return ChatResponseV1(
        kind="answer",
        message=f"Here is the spending share by {dimension} for {period.label}.",
        visual=share_visual,
    )


async def _present_comparison(
    *,
    user_id: int,
    analysis: Literal["comparison_summary", "category_growth", "tag_growth"],
    presentation: PresentationKind,
    filters: TransactionFilter,
    comparison: ComparisonPeriods,
) -> ChatResponseV1:
    current_filters = _with_dates(filters, comparison.current_from_date, comparison.current_to_date)
    previous_filters = _with_dates(filters, comparison.previous_from_date, comparison.previous_to_date)
    period = _comparison_period(current_filters, previous_filters)
    current_expense_filters = _with_flow(current_filters, "expense")
    previous_expense_filters = _with_flow(previous_filters, "expense")
    currency, limitation = await _currency_or_limitation(
        user_id=user_id, filters=[current_expense_filters, previous_expense_filters]
    )
    if limitation:
        return limitation
    if currency is None:
        return _no_data(period)

    if analysis == "comparison_summary":
        if presentation != "summary":
            return _unsupported_presentation()
        current = await _sum_amount(user_id=user_id, filters=current_expense_filters)
        previous = await _sum_amount(user_id=user_id, filters=previous_expense_filters)
        if current is None and previous is None:
            return _no_data(period)
        current_value = abs(current or Decimal("0"))
        previous_value = abs(previous or Decimal("0"))
        change = current_value - previous_value
        percent = _percentage(change / previous_value * Decimal("100"), signed=True) if previous_value else None
        comparison_summary_visual = SummaryVisualV1(
            kind="summary",
            title="Spending comparison",
            period=period,
            metrics=[
                SummaryMetricV1(key="current_period", label="Current period", money=_money(current_value, currency)),
                SummaryMetricV1(key="previous_period", label="Previous period", money=_money(previous_value, currency)),
                SummaryMetricV1(key="change", label="Change", money=_money(change, currency)),
                SummaryMetricV1(key="change_percent", label="Percentage change", percentage=percent),
            ],
        )
        suffix = (
            percent.display if percent else "Percentage change is unavailable because the previous period was zero."
        )
        return ChatResponseV1(
            kind="answer",
            message=f"Spending changed by {_money(change, currency).display}. {suffix}",
            visual=comparison_summary_visual,
        )

    field: Literal["category_name", "tag"] = "category_name" if analysis == "category_growth" else "tag"
    dimension: Literal["category", "tag"] = "category" if field == "category_name" else "tag"
    current_breakdown = await _breakdown(user_id=user_id, filters=current_expense_filters, group_by=field, take=100)
    previous_breakdown = await _breakdown(user_id=user_id, filters=previous_expense_filters, group_by=field, take=100)
    current_by_label = {
        _group_label(row, field): abs(row.value) if isinstance(row.value, Decimal) else Decimal("0")
        for row in current_breakdown.data
    }
    previous_by_label = {
        _group_label(row, field): abs(row.value) if isinstance(row.value, Decimal) else Decimal("0")
        for row in previous_breakdown.data
    }
    labels = sorted(set(current_by_label) | set(previous_by_label))
    if not labels:
        return _no_data(period)
    rows = [
        (
            label,
            current_by_label.get(label, Decimal("0")),
            previous_by_label.get(label, Decimal("0")),
        )
        for label in labels
    ]
    rows.sort(key=lambda item: (-abs(item[1] - item[2]), item[0]))
    rows = rows[:10]
    growth_visual: ChatVisualV1
    if presentation == "table":
        growth_visual = TableVisualV1(
            kind="table",
            title=f"{dimension.title()} spending change",
            period=period,
            table_kind="comparison",
            rows=[
                ComparisonTableRowV1(
                    label=label,
                    current=_money(current, currency),
                    previous=_money(previous, currency),
                    change=_money(current - previous, currency),
                    change_percent=(
                        _percentage((current - previous) / previous * Decimal("100"), signed=True) if previous else None
                    ),
                )
                for label, current, previous in rows
            ],
        )
    elif presentation == "bar":
        growth_visual = BarVisualV1(
            kind="bar",
            title=f"{dimension.title()} spending change",
            period=period,
            measure="change",
            items=[
                BarVisualItemV1(label=label, value=_money(current - previous, currency))
                for label, current, previous in rows
            ],
        )
    else:
        return _unsupported_presentation()
    return ChatResponseV1(
        kind="answer",
        message=f"Here is {dimension} spending change for the selected periods.",
        visual=growth_visual,
    )


def _unsupported_presentation() -> ChatResponseV1:
    return ChatResponseV1(
        kind="limitation",
        message=(
            "I can’t present that analysis in the requested format. Please try a supported spending, trend, "
            "category, tag, comparison, or transaction question."
        ),
    )


@function_tool()
async def present_analysis(
    ctx: RunContextWrapper[ChatAgentContext],
    analysis: AnalysisKind,
    presentation: PresentationKind,
    filters: TransactionFilter,
    comparison: ComparisonPeriods | None = None,
    trend_granularity: TrendGranularity = "month",
) -> ToolOutputText:
    """Create the only client-visible factual AI Chat response from typed, user-scoped read queries."""
    if analysis in {"comparison_summary", "category_growth", "tag_growth"}:
        if comparison is None:
            response = ChatResponseV1(
                kind="clarification",
                message="Which two non-overlapping periods should I compare?",
            )
        else:
            response = await _present_comparison(
                user_id=ctx.context.user_id,
                analysis=cast(Literal["comparison_summary", "category_growth", "tag_growth"], analysis),
                presentation=presentation,
                filters=filters,
                comparison=comparison,
            )
    elif comparison is not None:
        response = _unsupported_presentation()
    else:
        response = await _present_single_period(
            user_id=ctx.context.user_id,
            analysis=cast(SinglePeriodAnalysisKind, analysis),
            presentation=presentation,
            filters=filters,
            trend_granularity=trend_granularity,
        )
    ctx.context.presentation = response
    return ToolOutputText(text=response.model_dump_json())
