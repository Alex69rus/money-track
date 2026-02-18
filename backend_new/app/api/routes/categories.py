from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.get("/")
async def get_categories() -> dict[str, str]:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Not implemented yet")
