from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field

TransactionFlow = Literal["expense", "income"]


class TransactionFilter(BaseModel):
    from_date: date | None = Field(default=None, description="Filter from this date (inclusive)")
    to_date: date | None = Field(default=None, description="Filter up to this date (exclusive)")
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
    skip: int = Field(default=0, description="Number of transactions to skip for pagination, default: 0")
    take: int = Field(default=10, description="Number of transactions to return for pagination, default: 10")
