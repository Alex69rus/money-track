import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette import status

logger = logging.getLogger(__name__)


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled application error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(Exception, unhandled_exception_handler)
