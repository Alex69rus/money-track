from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

TransactionFlow = Literal["expense", "income"]
PaginationSkip = Annotated[int, Field(ge=0, description="Number of matching rows to skip for pagination")]
PaginationTake = Annotated[int, Field(ge=1, le=100, description="Number of matching rows to return (1-100)")]


class TransactionFilter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    from_date: date | None = Field(default=None, description="Filter from this date (inclusive)")
    to_date: date | None = Field(default=None, description="Filter up to this date (inclusive)")
    min_amount: Decimal | None = Field(
        default=None, description="Filter with amount greater than or equal to this value"
    )
    max_amount: Decimal | None = Field(default=None, description="Filter with amount less than or equal to this value")
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
