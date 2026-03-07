import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette import status

logger = logging.getLogger(__name__)


class UnauthorizedError(Exception):
    pass


async def unauthorized_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    message = str(exc) if isinstance(exc, UnauthorizedError) else "Unauthorized"
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={"error": "Unauthorized", "message": message},
    )


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled application error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal Server Error", "message": "An unexpected error occurred"},
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(UnauthorizedError, unauthorized_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
