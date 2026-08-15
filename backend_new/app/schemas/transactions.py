from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.services.transaction_normalization import normalize_currency, normalize_tags


class RefundEntry(BaseModel):
    id: int = Field(ge=1)
    amount: Decimal = Field(gt=0)
    note: str = Field(default="", max_length=500)

    @field_validator("amount")
    @classmethod
    def validate_amount_precision(cls, value: Decimal) -> Decimal:
        exponent = value.as_tuple().exponent
        if not isinstance(exponent, int) or exponent < -2:
            raise ValueError("Refund amount must have at most 2 decimal places")
        return value

    @field_validator("note", mode="before")
    @classmethod
    def normalize_note(cls, value: str | None) -> str:
        return "" if value is None else value


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
    refunds: list[RefundEntry]

    @field_validator("currency")
    @classmethod
    def normalize_currency_value(cls, value: str) -> str:
        return normalize_currency(value)

    @field_validator("tags")
    @classmethod
    def normalize_tag_values(cls, value: list[str] | None) -> list[str]:
        return normalize_tags(value)

    @field_validator("refunds")
    @classmethod
    def validate_unique_refund_ids(cls, value: list[RefundEntry]) -> list[RefundEntry]:
        if len({refund.id for refund in value}) != len(value):
            raise ValueError("Refund ids must be unique within a transaction")
        return value

    @model_validator(mode="after")
    def validate_refund_direction(self) -> UpdateTransactionRequest:
        if self.refunds and self.amount > 0:
            raise ValueError("Refunds can only be added to expense transactions")
        return self
