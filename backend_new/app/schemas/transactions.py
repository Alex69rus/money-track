from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.transaction_normalization import normalize_currency, normalize_tags


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

    @field_validator("currency")
    @classmethod
    def normalize_currency_value(cls, value: str) -> str:
        return normalize_currency(value)

    @field_validator("tags")
    @classmethod
    def normalize_tag_values(cls, value: list[str] | None) -> list[str]:
        return normalize_tags(value)


class UpdateTransactionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    transaction_date: datetime = Field(alias="transactionDate")
    amount: Decimal
    note: str | None = Field(default=None, max_length=500)
    category_id: int | None = Field(default=None, alias="categoryId")
    tags: list[str] | None = None
    currency: str = Field(default="AED", max_length=100)

    @field_validator("currency")
    @classmethod
    def normalize_currency_value(cls, value: str) -> str:
        return normalize_currency(value)

    @field_validator("tags")
    @classmethod
    def normalize_tag_values(cls, value: list[str] | None) -> list[str]:
        return normalize_tags(value)
