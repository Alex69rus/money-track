from fastapi import APIRouter

from app.db.queries import fetch_categories
from app.schemas.responses import CategoryResponse

router = APIRouter()


@router.get("")
@router.get("/", include_in_schema=False)
async def get_categories() -> list[CategoryResponse]:
    return await fetch_categories()
