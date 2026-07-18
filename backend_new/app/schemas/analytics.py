from decimal import Decimal

from pydantic import BaseModel


class TransactionSummaryResponse(BaseModel):
    totalIncome: Decimal
    totalExpenses: Decimal
    balance: Decimal
    transactionCount: int


class CategoryBreakdownItemResponse(BaseModel):
    categoryId: int | None
    categoryName: str
    categoryIcon: str | None
    categoryColor: str | None
    amount: Decimal
    transactionCount: int
    share: float


class CategoryBreakdownResponse(BaseModel):
    data: list[CategoryBreakdownItemResponse]


class TagBreakdownItemResponse(BaseModel):
    tag: str
    amount: Decimal
    transactionCount: int
    share: float


class TagBreakdownResponse(BaseModel):
    data: list[TagBreakdownItemResponse]


class MonthlyBreakdownItemResponse(BaseModel):
    month: str
    income: Decimal
    expenses: Decimal
    balance: Decimal


class MonthlyBreakdownResponse(BaseModel):
    data: list[MonthlyBreakdownItemResponse]
