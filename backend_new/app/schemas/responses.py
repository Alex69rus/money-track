from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    color: str | None
    icon: str | None
    parentCategoryId: int | None
    orderIndex: int | None
    createdAt: datetime


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    userId: int
    transactionDate: datetime
    amount: float
    note: str | None
    categoryId: int | None
    tags: list[str]
    currency: str
    smsText: str | None
    messageId: str | None
    createdAt: datetime
    category: CategoryResponse | None


class PaginatedTransactionsResponse(BaseModel):
    data: list[TransactionResponse]
    totalCount: int
    skip: int
    take: int
    hasMore: bool
