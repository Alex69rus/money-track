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


class ChartValueV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    value: str = Field(pattern=r"^-?\d+(?:\.\d+)?$", description="Exact numeric value retrieved for the chart.")
    display: str = Field(min_length=1, max_length=160, description="Formatted value shown to the user.")


class ChartSeriesValueV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    label: str = Field(min_length=1, max_length=80, description="Short name shown for this series.")
    value: ChartValueV1 = Field(description="Retrieved value for this series.")


class PeriodV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    label: str = Field(min_length=1, max_length=120, description="Short label for the analysed period.")
    from_date: str | None = Field(
        default=None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Inclusive start date, if known."
    )
    to_date: str | None = Field(
        default=None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Inclusive end date, if known."
    )


TableColumnV1 = Annotated[str, Field(min_length=1, max_length=120)]
TableCellV1 = Annotated[str, Field(min_length=1, max_length=500)]


class TableVisualV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    kind: Literal["table"]
    title: str = Field(min_length=1, max_length=120)
    period: PeriodV1
    columns: list[TableColumnV1] = Field(min_length=1, max_length=8)
    rows: list[list[TableCellV1]] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def validate_row_shape(self) -> TableVisualV1:
        if not all(len(row) == len(self.columns) for row in self.rows):
            raise ValueError("each table row must contain one cell for every column")
        return self


class BarVisualItemV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    label: str = Field(min_length=1, max_length=120, description="Short bar label.")
    values: list[ChartSeriesValueV1] = Field(
        min_length=1,
        description="Retrieved, labelled series values; use the same series names for every bar.",
    )


class BarVisualV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    kind: Literal["bar"]
    title: str = Field(min_length=1, max_length=120)
    period: PeriodV1
    items: list[BarVisualItemV1] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_series_shape(self) -> BarVisualV1:
        validate_chart_series_groups([item.values for item in self.items])
        return self


class LinePointV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    label: str = Field(min_length=1, max_length=80, description="Label for this point on the timeline.")
    values: list[ChartSeriesValueV1] = Field(
        min_length=1,
        description="Retrieved, labelled series values; use the same series names for every point.",
    )


def validate_chart_series_groups(groups: list[list[ChartSeriesValueV1]]) -> None:
    series_names = {value.label for value in groups[0]}
    if len(series_names) != len(groups[0]) or any(
        len({value.label for value in group}) != len(group) or {value.label for value in group} != series_names
        for group in groups
    ):
        raise ValueError("every chart item must contain the same named series")


class LineVisualV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    kind: Literal["line"]
    title: str = Field(min_length=1, max_length=120)
    period: PeriodV1
    points: list[LinePointV1] = Field(min_length=2)

    @model_validator(mode="after")
    def validate_series_shape(self) -> LineVisualV1:
        validate_chart_series_groups([point.values for point in self.points])
        return self


class PieChartItemV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    label: str = Field(min_length=1, max_length=120, description="Short slice label.")
    value: ChartValueV1 = Field(description="Retrieved numeric value for this slice.")
    share: ChartValueV1 = Field(description="Percentage calculated by the widget.")


class PieChartVisualV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    kind: Literal["pie"]
    title: str = Field(min_length=1, max_length=120)
    period: PeriodV1
    items: list[PieChartItemV1] = Field(min_length=1, max_length=10)


ChatVisualV1 = Annotated[
    TableVisualV1 | BarVisualV1 | LineVisualV1 | PieChartVisualV1,
    Field(discriminator="kind"),
]


class ChatResponseV1(BaseModel):
    model_config = _CONTRACT_CONFIG

    version: Literal["v1"] = "v1"
    kind: Literal["answer", "clarification", "limitation"]
    message: str = Field(min_length=1, max_length=1000)
    visual: ChatVisualV1 | None = None


class AgentResponse(BaseModel):
    model_config = _CONTRACT_CONFIG

    kind: Literal["answer", "clarification", "limitation"]
    message: str = Field(min_length=1, max_length=1000)
