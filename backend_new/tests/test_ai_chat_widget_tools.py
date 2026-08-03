from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import cast

import pytest
from agents import RunContextWrapper
from agents.tool import FunctionTool, ToolOutputText
from pydantic import ValidationError

from app.services.ai_chat.chat_agent_context import ChatAgentContext
from app.services.ai_chat.contracts import AgentResponse, ChatResponseV1, TableVisualV1
from app.services.ai_chat.widget_tools import (
    BarChartWidgetData,
    LineChartWidgetData,
    PieChartWidgetData,
    TableWidgetData,
    _store_visual,
    prepare_bar_chart_widget,
    prepare_line_chart_widget,
    prepare_pie_chart_widget,
    prepare_table_widget,
)
from tests.fixtures.ai_chat import invoke_ai_chat_tool


def _chart_value(value: str, display: str | None = None) -> dict[str, str]:
    return {"value": value, "display": display or value}


def _bar_items(count: int) -> list[dict[str, object]]:
    return [
        {
            "label": f"Category {index}",
            "values": [{"label": "Transaction count", "value": _chart_value(f"{index}.00", f"{index} transactions")}],
        }
        for index in range(1, count + 1)
    ]


def _line_points(count: int) -> list[dict[str, object]]:
    return [
        {
            "label": f"Month {index}",
            "values": [
                {"label": "Spending", "value": _chart_value(f"-{index}.00", f"AED -{index}.00")},
                {"label": "Income", "value": _chart_value(f"{index}.00", f"AED {index}.00")},
            ],
        }
        for index in range(1, count + 1)
    ]


@pytest.mark.parametrize(
    ("tool", "data", "expected_kind"),
    [
        (
            prepare_table_widget,
            {
                "title": "Transactions",
                "period": {"label": "January 2099", "from_date": "2099-01-01", "to_date": "2099-01-31"},
                "columns": ["Date", "Category", "Amount"],
                "rows": [
                    ["2099-01-10", "Food", "AED 50.00"],
                ],
            },
            "table",
        ),
        (
            prepare_bar_chart_widget,
            {
                "title": "Spending by category",
                "period": {"label": "January 2099", "from_date": "2099-01-01", "to_date": "2099-01-31"},
                "items": [
                    {
                        "label": "Food",
                        "values": [{"label": "Transaction count", "value": _chart_value("5", "5 transactions")}],
                    }
                ],
            },
            "bar",
        ),
        (
            prepare_line_chart_widget,
            {
                "title": "Income and spending trend",
                "period": {"label": "January to February 2099", "from_date": "2099-01-01", "to_date": "2099-02-28"},
                "points": [
                    {
                        "label": "January",
                        "values": [
                            {"label": "Spending", "value": _chart_value("50.00", "AED 50.00")},
                            {"label": "Income", "value": _chart_value("100.00", "AED 100.00")},
                        ],
                    },
                    {
                        "label": "February",
                        "values": [
                            {"label": "Spending", "value": _chart_value("60.00", "AED 60.00")},
                            {"label": "Income", "value": _chart_value("120.00", "AED 120.00")},
                        ],
                    },
                ],
            },
            "line",
        ),
        (
            prepare_pie_chart_widget,
            {
                "title": "Spending share",
                "period": {"label": "January 2099", "from_date": "2099-01-01", "to_date": "2099-01-31"},
                "items": [{"label": "Food", "value": _chart_value("50.00", "AED 50.00")}],
            },
            "pie",
        ),
    ],
)
def test_widget_tools_prepare_only_their_validated_data(
    tool: FunctionTool, data: dict[str, object], expected_kind: str
) -> None:
    context = ChatAgentContext(user_id=123)
    result = asyncio.run(
        invoke_ai_chat_tool(
            tool=tool,
            user_id=123,
            arguments={"data": data},
            context=context,
        )
    )

    assert isinstance(result, ToolOutputText)
    assert result.text == "Visualization added to the user response."
    assert context.visual is not None
    assert context.visual.kind == expected_kind


def test_widget_tool_acknowledgement_never_echoes_a_prepared_line_payload() -> None:
    context = ChatAgentContext(user_id=123)
    result = asyncio.run(
        invoke_ai_chat_tool(
            tool=prepare_line_chart_widget,
            user_id=123,
            arguments={
                "data": {
                    "title": "Cumulative balance",
                    "period": {"label": "2025 to 2026"},
                    "points": _line_points(24),
                }
            },
            context=context,
        )
    )

    assert isinstance(result, ToolOutputText)
    assert result.text == "Visualization added to the user response."
    assert "Cumulative balance" not in result.text
    assert "Month 24" not in result.text
    assert "AED" not in result.text


def test_widget_data_models_have_concise_descriptions_without_output_discriminators() -> None:
    for data_model in (TableWidgetData, BarChartWidgetData, LineChartWidgetData, PieChartWidgetData):
        properties = data_model.model_json_schema()["properties"]

        assert "kind" not in properties
        assert all("description" in property_schema for property_schema in properties.values())

    table_properties = TableWidgetData.model_json_schema()["properties"]
    assert set(table_properties) == {"title", "period", "columns", "rows"}
    assert "tableKind" not in table_properties
    assert "dimension" not in PieChartWidgetData.model_json_schema()["properties"]
    assert "Up to 20" in table_properties["rows"]["description"]
    assert "maxItems" not in BarChartWidgetData.model_json_schema()["properties"]["items"]
    assert "maxItems" not in LineChartWidgetData.model_json_schema()["properties"]["points"]
    line_point_properties = LineChartWidgetData.model_json_schema()["$defs"]["LinePointV1"]["properties"]
    assert set(line_point_properties) == {"label", "values"}
    assert "spending" not in line_point_properties
    assert "income" not in line_point_properties
    bar_item_properties = BarChartWidgetData.model_json_schema()["$defs"]["BarVisualItemV1"]["properties"]
    assert set(bar_item_properties) == {"label", "values"}
    chart_value_properties = BarChartWidgetData.model_json_schema()["$defs"]["ChartValueV1"]["properties"]
    assert set(chart_value_properties) == {"value", "display"}
    assert "currency" not in chart_value_properties


@pytest.mark.parametrize(
    ("tool", "data", "expected_count"),
    [
        (
            prepare_bar_chart_widget,
            {
                "title": "Spending by category",
                "period": {"label": "January 2099"},
                "items": _bar_items(20),
            },
            20,
        ),
        (
            prepare_line_chart_widget,
            {
                "title": "Balance growth",
                "period": {"label": "2025 to 2026"},
                "points": _line_points(24),
            },
            24,
        ),
    ],
)
def test_widget_tools_accept_extended_chart_data(
    tool: FunctionTool, data: dict[str, object], expected_count: int
) -> None:
    context = ChatAgentContext(user_id=123)
    asyncio.run(invoke_ai_chat_tool(tool=tool, user_id=123, arguments={"data": data}, context=context))

    assert context.visual is not None
    if context.visual.kind == "bar":
        assert len(context.visual.items) == expected_count
    else:
        assert context.visual.kind == "line"
        assert len(context.visual.points) == expected_count


def test_line_widget_accepts_a_truthfully_named_balance_series() -> None:
    data = LineChartWidgetData.model_validate(
        {
            "title": "Cumulative balance",
            "period": {"label": "January to February 2099"},
            "points": [
                {
                    "label": "January",
                    "values": [{"label": "Cumulative balance", "value": _chart_value("100.00", "AED 100.00")}],
                },
                {
                    "label": "February",
                    "values": [{"label": "Cumulative balance", "value": _chart_value("150.00", "AED 150.00")}],
                },
            ],
        }
    )

    assert [value.label for value in data.points[0].values] == ["Cumulative balance"]


def test_line_widget_rejects_points_with_inconsistent_series() -> None:
    with pytest.raises(ValidationError, match="same named series"):
        LineChartWidgetData.model_validate(
            {
                "title": "Mismatched trend",
                "period": {"label": "January to February 2099"},
                "points": [
                    {"label": "January", "values": [{"label": "Income", "value": _chart_value("100.00")}]},
                    {"label": "February", "values": [{"label": "Balance", "value": _chart_value("150.00")}]},
                ],
            }
        )


def test_bar_widget_supports_arbitrary_series_and_rejects_mismatched_bars() -> None:
    data = BarChartWidgetData.model_validate(
        {
            "title": "Activity by category",
            "period": {"label": "January 2099"},
            "items": [
                {
                    "label": "Food",
                    "values": [
                        {"label": "Transaction count", "value": _chart_value("5", "5 transactions")},
                        {"label": "Average value", "value": _chart_value("20", "AED 20.00")},
                    ],
                },
                {
                    "label": "Travel",
                    "values": [
                        {"label": "Transaction count", "value": _chart_value("3", "3 transactions")},
                        {"label": "Average value", "value": _chart_value("50", "AED 50.00")},
                    ],
                },
            ],
        }
    )

    assert [value.label for value in data.items[0].values] == ["Transaction count", "Average value"]
    with pytest.raises(ValidationError, match="same named series"):
        BarChartWidgetData.model_validate(
            {
                "title": "Mismatched bars",
                "period": {"label": "January 2099"},
                "items": [
                    {"label": "Food", "values": [{"label": "Count", "value": _chart_value("5")}]},
                    {"label": "Travel", "values": [{"label": "Average", "value": _chart_value("50")}]},
                ],
            }
        )


def test_pie_widget_calculates_percentages_from_retrieved_amounts() -> None:
    context = ChatAgentContext(user_id=123)
    result = asyncio.run(
        invoke_ai_chat_tool(
            tool=prepare_pie_chart_widget,
            user_id=123,
            arguments={
                "data": {
                    "title": "Spending share",
                    "period": {"label": "January 2099"},
                    "items": [
                        {"label": "Food", "value": _chart_value("-10.00", "AED -10.00")},
                        {"label": "Travel", "value": _chart_value("-30.00", "AED -30.00")},
                    ],
                }
            },
            context=context,
        )
    )

    assert isinstance(result, ToolOutputText)
    assert context.visual is not None and context.visual.kind == "pie"
    assert [item.share.display for item in context.visual.items] == ["25.0%", "75.0%"]


def test_table_widget_rejects_rows_that_do_not_match_its_free_form_columns() -> None:
    with pytest.raises(ValidationError, match="one cell for every column"):
        TableWidgetData.model_validate(
            {
                "title": "Mismatched table",
                "period": {"label": "January 2099"},
                "columns": ["One", "Two"],
                "rows": [["Only one"]],
            }
        )


def test_widget_tools_allow_only_one_visual_per_response() -> None:
    context = ChatAgentContext(user_id=123)
    first_visual = TableVisualV1.model_validate(
        {
            "kind": "table",
            "title": "Transactions",
            "period": {"label": "January 2099"},
            "columns": ["Date", "Amount"],
            "rows": [["2099-01-01", "AED 50.00"]],
        }
    )
    wrapper = cast(RunContextWrapper[ChatAgentContext], SimpleNamespace(context=context))

    _store_visual(wrapper, first_visual)

    with pytest.raises(ValueError, match="Only one widget"):
        _store_visual(wrapper, first_visual)


def test_agent_response_allows_agent_authored_text_but_rejects_visual_output() -> None:
    response = AgentResponse.model_validate({"kind": "answer", "message": "You spent AED 50 in January."})

    assert response.message == "You spent AED 50 in January."
    with pytest.raises(ValidationError):
        AgentResponse.model_validate({"kind": "answer", "message": "You spent AED 50 in January.", "visual": {}})


def test_chat_response_rejects_the_retired_summary_widget() -> None:
    with pytest.raises(ValidationError):
        ChatResponseV1.model_validate(
            {
                "version": "v1",
                "kind": "answer",
                "message": "You spent AED 50 in January.",
                "visual": {
                    "kind": "summary",
                    "title": "Spending summary",
                    "period": {"label": "January 2099"},
                    "metrics": [
                        {
                            "key": "spending",
                            "label": "Spending",
                            "money": {"amount": "50.00", "currency": "AED", "display": "AED 50.00"},
                        }
                    ],
                },
            }
        )
