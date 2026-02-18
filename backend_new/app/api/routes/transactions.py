from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.get("/")
async def get_transactions() -> dict[str, str]:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet")


@router.post("/")
async def create_transaction() -> dict[str, str]:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet")


@router.put("/{transaction_id}")
async def update_transaction(transaction_id: int) -> dict[str, str]:
    _ = transaction_id
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet")


@router.delete("/{transaction_id}")
async def delete_transaction(transaction_id: int) -> dict[str, str]:
    _ = transaction_id
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet")
