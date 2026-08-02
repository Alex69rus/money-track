from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from agents import RunContextWrapper, function_tool
from agents.tool import ToolOutputText
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.contracts import (
    BarVisualItemV1,
    BarVisualV1,
    ChatVisualV1,
    LinePointV1,
    LineVisualV1,
    MoneyV1,
    PercentageV1,
    PeriodV1,
    PieChartItemV1,
    PieChartVisualV1,
    TableCellV1,
    TableColumnV1,
    TableVisualV1,
)

_WIDGET_DATA_CONFIG = ConfigDict(extra="forbid")


class TableWidgetData(BaseModel):
    model_config = _WIDGET_DATA_CONFIG

    title: str = Field(min_length=1, max_length=120, description="Short table title.")
    period: PeriodV1 = Field(description="Analysed period shown below the title.")
    columns: list[TableColumnV1] = Field(min_length=1, max_length=8, description="Column headings in display order.")
    rows: list[list[TableCellV1]] = Field(
        min_length=1, max_length=20, description="Display rows; each row follows the column order."
    )

    @model_validator(mode="after")
    def validate_row_shape(self) -> TableWidgetData:
        if not all(len(row) == len(self.columns) for row in self.rows):
            raise ValueError("each table row must contain one cell for every column")
        return self


class BarChartWidgetData(BaseModel):
    model_config = _WIDGET_DATA_CONFIG

    title: str = Field(min_length=1, max_length=120, description="Short chart title.")
    period: PeriodV1 = Field(description="Analysed period shown below the title.")
    items: list[BarVisualItemV1] = Field(
        min_length=1, max_length=10, description="Retrieved labelled values for the bars."
    )


class LineChartWidgetData(BaseModel):
    model_config = _WIDGET_DATA_CONFIG

    title: str = Field(min_length=1, max_length=120, description="Short chart title.")
    period: PeriodV1 = Field(description="Analysed period shown below the title.")
    points: list[LinePointV1] = Field(min_length=2, max_length=12, description="Retrieved values in timeline order.")


class PieChartItemData(BaseModel):
    model_config = _WIDGET_DATA_CONFIG

    label: str = Field(min_length=1, max_length=120, description="Short slice label.")
    value: MoneyV1 = Field(description="Retrieved amount for this slice.")


class PieChartWidgetData(BaseModel):
    model_config = _WIDGET_DATA_CONFIG

    title: str = Field(min_length=1, max_length=120, description="Short chart title.")
    period: PeriodV1 = Field(description="Analysed period shown below the title.")
    items: list[PieChartItemData] = Field(
        min_length=1, max_length=10, description="Retrieved labelled values for the pie slices."
    )


def _store_visual(ctx: RunContextWrapper[ChatAgentContext], visual: ChatVisualV1) -> ToolOutputText:
    if ctx.context.visual is not None:
        raise ValueError("Only one widget may be prepared for an AI Chat response")

    ctx.context.visual = visual
    return ToolOutputText(text=visual.model_dump_json())


def _percentage(value: Decimal) -> PercentageV1:
    rounded = value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    return PercentageV1(value=format(rounded, "f"), display=f"{rounded}%")


@function_tool()
async def prepare_table_widget(ctx: RunContextWrapper[ChatAgentContext], data: TableWidgetData) -> ToolOutputText:
    """Prepare a table widget from already retrieved, formatted data"""
    return _store_visual(ctx, TableVisualV1(kind="table", **data.model_dump()))


@function_tool()
async def prepare_bar_chart_widget(
    ctx: RunContextWrapper[ChatAgentContext], data: BarChartWidgetData
) -> ToolOutputText:
    """Prepare a bar-chart widget from already retrieved, formatted data"""
    return _store_visual(ctx, BarVisualV1(kind="bar", **data.model_dump()))


@function_tool()
async def prepare_line_chart_widget(
    ctx: RunContextWrapper[ChatAgentContext], data: LineChartWidgetData
) -> ToolOutputText:
    """Prepare a line-chart widget from already retrieved, formatted data"""
    return _store_visual(ctx, LineVisualV1(kind="line", **data.model_dump()))


@function_tool()
async def prepare_pie_chart_widget(
    ctx: RunContextWrapper[ChatAgentContext], data: PieChartWidgetData
) -> ToolOutputText:
    """Prepare a pie-chart widget and calculate each slice percentage from its retrieved amount."""
    weights = [abs(Decimal(item.value.amount)) for item in data.items]
    total = sum(weights, Decimal("0"))
    if total == 0:
        raise ValueError("Pie chart requires at least one non-zero amount")
    return _store_visual(
        ctx,
        PieChartVisualV1(
            kind="pie",
            title=data.title,
            period=data.period,
            items=[
                PieChartItemV1(
                    label=item.label,
                    value=item.value,
                    share=_percentage(weight / total * Decimal("100")),
                )
                for item, weight in zip(data.items, weights, strict=True)
            ],
        ),
    )
