from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CreateTransactionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    transaction_date: datetime = Field(alias="transactionDate")
    amount: Decimal
    note: str | None = Field(default=None, max_length=500)
    category_id: int | None = Field(default=None, alias="categoryId")
    tags: list[str] | None = None
    currency: str = Field(default="AED", max_length=100)
    sms_text: str | None = Field(default=None, alias="smsText", max_length=1000)
    message_id: str | None = Field(default=None, alias="messageId", max_length=100)


class UpdateTransactionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    transaction_date: datetime = Field(alias="transactionDate")
    amount: Decimal
    note: str | None = Field(default=None, max_length=500)
    category_id: int | None = Field(default=None, alias="categoryId")
    tags: list[str] | None = None
    currency: str = Field(default="AED", max_length=100)
