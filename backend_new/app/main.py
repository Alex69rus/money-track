import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from app.api.router import api_router
from app.api.routes.health_router import router as health_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.tracing import configure_telemetry
from app.db.engine import get_engine
from app.services.telegram_runtime import TelegramBotRuntime


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    engine = get_engine()
    telegram_runtime = TelegramBotRuntime()
    try:
        await engine.start_connection_pool()
        try:
            await telegram_runtime.start()
            application.state.telegram_runtime = telegram_runtime
            yield
        finally:
            try:
                await telegram_runtime.stop()
            finally:
                await engine.close_connection_pool()
    finally:
        await telemetry.shutdown()


settings = get_settings()
telemetry = configure_telemetry(settings)
trace.set_tracer_provider(telemetry.traces)
allowed_origins = [origin.strip() for origin in settings.cors_allow_origins.split(",") if origin.strip()]

app = FastAPI(title="Money Track API (Python)", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)
app.include_router(api_router)
app.include_router(health_router)
trace_exclusions = os.getenv("OTEL_PYTHON_FASTAPI_EXCLUDED_URLS", os.getenv("OTEL_PYTHON_EXCLUDED_URLS", ""))
FastAPIInstrumentor.instrument_app(
    app,
    tracer_provider=telemetry.traces,
    excluded_urls=",".join(filter(None, (r"^https?://[^/]+/health/?$", trace_exclusions))),
    exclude_spans=["receive", "send"],
    # A nonempty pattern that matches no headers also prevents environment wildcard capture.
    http_capture_headers_server_request=["(?!)"],
    http_capture_headers_server_response=["(?!)"],
)
