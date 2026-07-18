from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db.queries import (
    create_transaction,
    delete_transaction,
    fetch_transaction_summary,
    fetch_transactions,
    fetch_transactions_by_categories,
    fetch_transactions_by_months,
    fetch_transactions_by_tags,
    update_transaction,
)
from app.schemas.analytics import (
    CategoryBreakdownResponse,
    MonthlyBreakdownResponse,
    TagBreakdownResponse,
    TransactionSummaryResponse,
)
from app.schemas.responses import PaginatedTransactionsResponse, TransactionResponse
from app.schemas.transactions import CreateTransactionRequest, UpdateTransactionRequest
from app.services.auth import get_current_user_id

router = APIRouter()


def _validate_date_range(from_date: date | None, to_date: date | None) -> None:
    if from_date is not None and to_date is not None and from_date > to_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="fromDate must not exceed toDate")


@router.get("/summary")
async def get_transaction_summary(
    fromDate: date | None = None,
    toDate: date | None = None,
    user_id: int = Depends(get_current_user_id),
) -> TransactionSummaryResponse:
    _validate_date_range(fromDate, toDate)
    return await fetch_transaction_summary(user_id=user_id, from_date=fromDate, to_date=toDate)


@router.get("/by-categories")
async def get_transactions_by_categories(
    fromDate: date | None = None,
    toDate: date | None = None,
    user_id: int = Depends(get_current_user_id),
) -> CategoryBreakdownResponse:
    _validate_date_range(fromDate, toDate)
    return await fetch_transactions_by_categories(user_id=user_id, from_date=fromDate, to_date=toDate)


@router.get("/by-tags")
async def get_transactions_by_tags(
    fromDate: date | None = None,
    toDate: date | None = None,
    user_id: int = Depends(get_current_user_id),
) -> TagBreakdownResponse:
    _validate_date_range(fromDate, toDate)
    return await fetch_transactions_by_tags(user_id=user_id, from_date=fromDate, to_date=toDate)


@router.get("/by-months")
async def get_transactions_by_months(
    fromDate: date | None = None,
    toDate: date | None = None,
    user_id: int = Depends(get_current_user_id),
) -> MonthlyBreakdownResponse:
    _validate_date_range(fromDate, toDate)
    return await fetch_transactions_by_months(user_id=user_id, from_date=fromDate, to_date=toDate)


@router.get("")
@router.get("/", include_in_schema=False)
async def get_transactions(
    fromDate: date | None = None,
    toDate: date | None = None,
    minAmount: Decimal | None = None,
    maxAmount: Decimal | None = None,
    categoryId: int | None = None,
    tags: str | None = None,
    tag: str | None = None,
    text: str | None = None,
    flow: Literal["expense", "income"] | None = None,
    uncategorized: bool = False,
    calculationCurrencyOnly: bool = False,
    skip: int = 0,
    take: int = 50,
    user_id: int = Depends(get_current_user_id),
) -> PaginatedTransactionsResponse:
    _validate_date_range(fromDate, toDate)
    if categoryId is not None and uncategorized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="categoryId and uncategorized cannot be used together",
        )
    return await fetch_transactions(
        user_id=user_id,
        from_date=fromDate,
        to_date=toDate,
        min_amount=minAmount,
        max_amount=maxAmount,
        category_id=categoryId,
        tags=tags,
        tag=tag,
        text=text,
        flow=flow,
        uncategorized=uncategorized,
        calculation_currency_only=calculationCurrencyOnly,
        skip=skip,
        take=take,
    )


@router.post(
    "",
    response_model=TransactionResponse,
    response_model_exclude_none=True,
)
@router.post(
    "/",
    include_in_schema=False,
    response_model=TransactionResponse,
    response_model_exclude_none=True,
)
async def create_transaction_route(
    payload: CreateTransactionRequest,
    response: Response,
    user_id: int = Depends(get_current_user_id),
) -> TransactionResponse:
    created = await create_transaction(
        user_id=user_id,
        payload=payload,
    )
    response.status_code = status.HTTP_201_CREATED
    response.headers["Location"] = f"/api/transactions/{created.id}"
    return created


@router.put("/{transaction_id}")
async def update_transaction_route(
    transaction_id: int,
    payload: UpdateTransactionRequest,
    user_id: int = Depends(get_current_user_id),
) -> TransactionResponse:
    updated = await update_transaction(
        user_id=user_id,
        transaction_id=transaction_id,
        payload=payload,
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return updated


@router.delete("/{transaction_id}")
async def delete_transaction_route(
    transaction_id: int,
    user_id: int = Depends(get_current_user_id),
) -> Response:
    deleted = await delete_transaction(user_id=user_id, transaction_id=transaction_id)
    if not deleted:
        return Response(status_code=status.HTTP_404_NOT_FOUND)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
