from fastapi import APIRouter

from app.api.routes.categories import router as categories_router
from app.api.routes.health import router as health_router
from app.api.routes.tags import router as tags_router
from app.api.routes.transactions import router as transactions_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(transactions_router, prefix="/api/transactions", tags=["Transactions"])
api_router.include_router(categories_router, prefix="/api/categories", tags=["Categories"])
api_router.include_router(tags_router, prefix="/api/tags", tags=["Tags"])
