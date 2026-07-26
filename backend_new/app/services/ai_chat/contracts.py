from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

_CONTRACT_CONFIG = ConfigDict(extra="forbid", alias_generator=to_camel, populate_by_name=True)


class ChatHistoryMessage(BaseModel):
    model_config = ConfigDict(
        extra="forbid", alias_generator=to_camel, populate_by_name=True, str_strip_whitespace=True
    )

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class MoneyV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    amount: str = Field(pattern=r"^-?\d+(?:\.\d+)?$")
    currency: str = Field(min_length=1, max_length=100)
    display: str = Field(min_length=1, max_length=160)


class PercentageV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    value: str = Field(pattern=r"^-?\d+(?:\.\d+)?$")
    display: str = Field(min_length=1, max_length=80)


class PeriodV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    label: str = Field(min_length=1, max_length=120)
    from_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    to_date: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")


class SummaryMetricV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    key: Literal[
        "spending",
        "income",
        "balance",
        "transaction_count",
        "current_period",
        "previous_period",
        "change",
        "change_percent",
    ]
    label: str = Field(min_length=1, max_length=80)
    money: MoneyV1 | None = None
    count: int | None = Field(default=None, ge=0)
    percentage: PercentageV1 | None = None

    @model_validator(mode="after")
    def validate_value_shape(self) -> SummaryMetricV1:
        value_count = sum(value is not None for value in (self.money, self.count, self.percentage))
        if value_count == 0 and self.key == "change_percent":
            return self
        if value_count != 1:
            raise ValueError("summary metric must have exactly one value")
        return self


class SummaryVisualV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    kind: Literal["summary"]
    title: str = Field(min_length=1, max_length=120)
    period: PeriodV1
    metrics: list[SummaryMetricV1] = Field(min_length=2, max_length=4)


class TransactionTableRowV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    id: int
    date_time: str = Field(min_length=1, max_length=64)
    category: str | None = Field(default=None, max_length=100)
    tags: list[str] = Field(default_factory=list, max_length=20)
    note: str | None = Field(default=None, max_length=500)
    amount: MoneyV1


class BreakdownTableRowV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    label: str = Field(min_length=1, max_length=120)
    value: MoneyV1


class ComparisonTableRowV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    label: str = Field(min_length=1, max_length=120)
    current: MoneyV1
    previous: MoneyV1
    change: MoneyV1
    change_percent: PercentageV1 | None = None


TableRowV1 = TransactionTableRowV1 | BreakdownTableRowV1 | ComparisonTableRowV1


class TableVisualV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    kind: Literal["table"]
    title: str = Field(min_length=1, max_length=120)
    period: PeriodV1
    table_kind: Literal["transactions", "breakdown", "comparison"]
    rows: list[TableRowV1] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def validate_row_shape(self) -> TableVisualV1:
        row_type = {
            "transactions": TransactionTableRowV1,
            "breakdown": BreakdownTableRowV1,
            "comparison": ComparisonTableRowV1,
        }[self.table_kind]
        if not all(isinstance(row, row_type) for row in self.rows):
            raise ValueError("table rows do not match table_kind")
        if self.table_kind in {"breakdown", "comparison"} and len(self.rows) > 10:
            raise ValueError("breakdown and comparison tables may contain at most 10 rows")
        return self


class BarVisualItemV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    label: str = Field(min_length=1, max_length=120)
    value: MoneyV1


class BarVisualV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    kind: Literal["bar"]
    title: str = Field(min_length=1, max_length=120)
    period: PeriodV1
    measure: Literal["spending", "income", "balance", "change"]
    items: list[BarVisualItemV1] = Field(min_length=1, max_length=10)


class LinePointV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    bucket: str = Field(min_length=1, max_length=16)
    label: str = Field(min_length=1, max_length=80)
    spending: MoneyV1
    income: MoneyV1


class LineVisualV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    kind: Literal["line"]
    title: str = Field(min_length=1, max_length=120)
    period: PeriodV1
    points: list[LinePointV1] = Field(min_length=2, max_length=12)


class CategoryShareItemV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    label: str = Field(min_length=1, max_length=120)
    value: MoneyV1
    share: PercentageV1


class CategoryShareVisualV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    kind: Literal["category_share"]
    title: str = Field(min_length=1, max_length=120)
    period: PeriodV1
    dimension: Literal["category", "tag"]
    items: list[CategoryShareItemV1] = Field(min_length=1, max_length=10)


ChatVisualV1 = Annotated[
    SummaryVisualV1 | TableVisualV1 | BarVisualV1 | LineVisualV1 | CategoryShareVisualV1,
    Field(discriminator="kind"),
]


class ChatResponseV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    version: Literal["v1"] = "v1"
    kind: Literal["answer", "clarification", "limitation"]
    message: str = Field(min_length=1, max_length=1000)
    visual: ChatVisualV1 | None = None


class AgentDirective(BaseModel):
    model_config = _CONTRACT_CONFIG

    directive: Literal[
        "presented",
        "ask_period",
        "ask_comparison_periods",
        "ask_dimension",
        "decline_write",
        "decline_external_data",
        "decline_advice",
        "decline_unsupported",
    ]
