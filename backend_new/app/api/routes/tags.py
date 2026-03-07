from fastapi import APIRouter, Depends

from app.db.queries import fetch_tags
from app.services.auth import get_current_user_id

router = APIRouter()


@router.get("")
@router.get("/", include_in_schema=False)
async def get_tags(user_id: int = Depends(get_current_user_id)) -> list[str]:
    return await fetch_tags(user_id=user_id)
