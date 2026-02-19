from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.db.engine import get_engine


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    engine = get_engine()
    await engine.start_connection_pool()
    try:
        yield
    finally:
        await engine.close_connection_pool()


configure_logging()

app = FastAPI(title="Money Track API (Python)", version="0.1.0", lifespan=lifespan)
register_exception_handlers(app)
app.include_router(api_router)
