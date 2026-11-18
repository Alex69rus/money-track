from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from agents import ModelBehaviorError, ToolErrorFormatterArgs
from agents.tool_context import ToolContext
from pydantic import BaseModel, ConfigDict, Field, ValidationError, WithJsonSchema, model_validator

from app.core.config import get_settings
from app.services.ai_chat.chat_agent_context import ChatAgentContext

TransactionFlow = Literal["expense", "income"]
PaginationSkip = Annotated[int, Field(ge=0, description="Number of matching rows to skip for pagination")]
PaginationTake = Annotated[int, Field(ge=1, le=100, description="Number of matching rows to return (1-100)")]
ToolSchemaDecimal = Annotated[Decimal, WithJsonSchema({"type": "number"})]


class _PaginationArguments(BaseModel):
    skip: PaginationSkip = 0
    take: PaginationTake = 10


def format_pagination_tool_error(args: ToolErrorFormatterArgs[ChatAgentContext]) -> str | None:
    if (
        args.kind != "tool_exception"
        or args.tool_name not in {"aggregate_transactions", "list_transactions", "get_user_tags"}
        or not isinstance(args.error, ModelBehaviorError)
        or not isinstance(args.run_context, ToolContext)
    ):
        return None

    # The SDK intentionally omits validation details when tool-data logging is disabled.
    try:
        _PaginationArguments.model_validate_json(args.run_context.tool_arguments)
    except ValidationError as error:
        invalid_fields = {item["loc"] for item in error.errors(include_input=False)}
        messages = [
            message
            for field, message in (
                ("skip", "skip must be an integer greater than or equal to 0."),
                ("take", "take must be an integer from 1 to 100."),
            )
            if (field,) in invalid_fields
        ]
        return " ".join(messages) or None
    return None


def current_business_date(*, now: datetime | None = None) -> date:
    business_timezone = get_settings().business_tzinfo
    return (now or datetime.now(business_timezone)).astimezone(business_timezone).date()


class TransactionFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_date: date | None = Field(default=None, description="Filter from this date (inclusive)")
    to_date: date | None = Field(default=None, description="Filter up to this date (inclusive)")
    min_amount: ToolSchemaDecimal | None = Field(
        default=None, description="Filter with amount greater than or equal to this value"
    )
    max_amount: ToolSchemaDecimal | None = Field(
        default=None, description="Filter with amount less than or equal to this value"
    )
    category_id: int | None = Field(default=None, description="Filter by category ID")
    tags: str | None = Field(default=None, description="Filter by tags (comma-separated)")
    text: str | None = Field(
        default=None, description="Filter by text matching any of the fields: note, category name, tag, amount"
    )
    flow: TransactionFlow | None = Field(default=None, description="Filter by flow type ('expense' or 'income')")
    uncategorized: bool | None = Field(default=None, description="If True, filter for uncategorized transactions")

    @model_validator(mode="after")
    def validate_ranges(self) -> "TransactionFilter":
        if self.from_date is not None and self.to_date is not None and self.from_date > self.to_date:
            raise ValueError("from_date must not be after to_date")
        if self.min_amount is not None and self.max_amount is not None and self.min_amount > self.max_amount:
            raise ValueError("min_amount must not exceed max_amount")
        if self.category_id is not None and self.uncategorized is True:
            raise ValueError("category_id and uncategorized cannot be used together")
        return self
