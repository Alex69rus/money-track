from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db.queries import (
    create_transaction,
    delete_transaction,
    fetch_transactions,
    update_transaction,
)
from app.schemas.responses import PaginatedTransactionsResponse, TransactionResponse
from app.schemas.transactions import CreateTransactionRequest, UpdateTransactionRequest
from app.services.auth import get_current_user_id

router = APIRouter()


@router.get("")
@router.get("/", include_in_schema=False)
async def get_transactions(
    fromDate: date | None = None,
    toDate: date | None = None,
    minAmount: Decimal | None = None,
    maxAmount: Decimal | None = None,
    categoryId: int | None = None,
    tags: str | None = None,
    text: str | None = None,
    skip: int = 0,
    take: int = 50,
    user_id: int = Depends(get_current_user_id),
) -> PaginatedTransactionsResponse:
    return await fetch_transactions(
        user_id=user_id,
        from_date=fromDate,
        to_date=toDate,
        min_amount=minAmount,
        max_amount=maxAmount,
        category_id=categoryId,
        tags=tags,
        text=text,
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
