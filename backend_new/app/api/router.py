from fastapi import APIRouter

from app.api.routes.ai_chat_router import router as ai_chat_router
from app.api.routes.categories_router import router as categories_router
from app.api.routes.tags_router import router as tags_router
from app.api.routes.telegram_router import router as telegram_router
from app.api.routes.transactions_router import router as transactions_router

api_router = APIRouter(prefix="/api", tags=["API"])
api_router.include_router(transactions_router)
api_router.include_router(categories_router)
api_router.include_router(tags_router)
api_router.include_router(telegram_router)
api_router.include_router(ai_chat_router)
