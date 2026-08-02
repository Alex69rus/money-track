from __future__ import annotations

import asyncio
import json
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


def _money(amount: str) -> dict[str, str]:
    return {"amount": amount, "currency": "AED", "display": f"AED {amount}"}


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
                "items": [{"label": "Food", "value": _money("50.00")}],
            },
            "bar",
        ),
        (
            prepare_line_chart_widget,
            {
                "title": "Income and spending trend",
                "period": {"label": "January to February 2099", "from_date": "2099-01-01", "to_date": "2099-02-28"},
                "points": [
                    {"label": "January", "spending": _money("50.00"), "income": _money("100.00")},
                    {"label": "February", "spending": _money("60.00"), "income": _money("120.00")},
                ],
            },
            "line",
        ),
        (
            prepare_pie_chart_widget,
            {
                "title": "Spending share",
                "period": {"label": "January 2099", "from_date": "2099-01-01", "to_date": "2099-01-31"},
                "items": [{"label": "Food", "value": _money("50.00")}],
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
    assert json.loads(result.text)["kind"] == expected_kind
    assert context.visual is not None
    assert context.visual.kind == expected_kind


def test_widget_data_models_have_concise_descriptions_without_output_discriminators() -> None:
    for data_model in (TableWidgetData, BarChartWidgetData, LineChartWidgetData, PieChartWidgetData):
        properties = data_model.model_json_schema()["properties"]

        assert "kind" not in properties
        assert all("description" in property_schema for property_schema in properties.values())

    table_properties = TableWidgetData.model_json_schema()["properties"]
    assert set(table_properties) == {"title", "period", "columns", "rows"}
    assert "tableKind" not in table_properties
    assert "dimension" not in PieChartWidgetData.model_json_schema()["properties"]


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
                        {"label": "Food", "value": _money("-10.00")},
                        {"label": "Travel", "value": _money("-30.00")},
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
                    "metrics": [{"key": "spending", "label": "Spending", "money": _money("50.00")}],
                },
            }
        )
