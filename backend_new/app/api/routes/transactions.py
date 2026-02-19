from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

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


@router.get("/")
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


@router.post("/")
async def create_transaction_route(
    payload: CreateTransactionRequest,
    user_id: int = Depends(get_current_user_id),
) -> JSONResponse:
    created = await create_transaction(
        user_id=user_id,
        payload=payload,
    )
    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=jsonable_encoder(created.model_dump()),
        headers={"Location": f"/api/transactions/{created.id}"},
    )


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
