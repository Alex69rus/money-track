from fastapi import APIRouter

from app.db.queries import fetch_categories
from app.schemas.responses import CategoryResponse

router = APIRouter()


@router.get("/")
async def get_categories() -> list[CategoryResponse]:
    return await fetch_categories()
