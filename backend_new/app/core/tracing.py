from __future__ import annotations

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from typing import Any

from agents import set_trace_processors
from agents.tracing.processors import BackendSpanExporter, BatchTraceProcessor
from opentelemetry._logs import NoOpLoggerProvider
from opentelemetry.exporter.otlp.proto.http import Compression
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.asyncpg import AsyncPGInstrumentor
from opentelemetry.instrumentation.genai.openai import OpenAIInstrumentor
from opentelemetry.instrumentation.genai.openai_agents import OpenAIAgentsInstrumentor
from opentelemetry.proto.collector.logs.v1.logs_service_pb2 import ExportLogsServiceRequest
from opentelemetry.proto.collector.trace.v1.trace_service_pb2 import ExportTraceServiceRequest
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import SpanLimits, TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

from app.core.config import Settings
from app.core.logging import SecretRedactor, configure_logging
from app.core.otlp import RedactingOtlpSession, valid_endpoint

logger = logging.getLogger(__name__)


class RedactingOpenAITraceExporter(BackendSpanExporter):
    def __init__(self, api_key: str, redactor: SecretRedactor) -> None:
        super().__init__(api_key=api_key)
        self._redactor = redactor

    def _sanitize_for_openai_tracing_api(self, payload_item: dict[str, Any]) -> dict[str, Any]:
        # The pinned SDK calls this hook before applying its own field limits and sending the batch.
        # Keep the original span intact for the OpenTelemetry processor.
        try:
            redacted = json.loads(self._redactor.redact(json.dumps(payload_item, ensure_ascii=False)))
        except (TypeError, ValueError):
            raise ValueError("OpenAI trace payload could not be redacted safely") from None
        return super()._sanitize_for_openai_tracing_api(redacted)


@dataclass(frozen=True)
class Telemetry:
    traces: TracerProvider
    logs: LoggerProvider | None
    openai_traces: BatchTraceProcessor

    async def shutdown(self) -> None:
        # Batch processors drain on shutdown and cap the wait at 30 seconds per signal.
        shutdowns = [
            asyncio.to_thread(self.traces.shutdown),
            asyncio.to_thread(self.openai_traces.shutdown, timeout=5),
        ]
        if self.logs is not None:
            shutdowns.append(asyncio.to_thread(self.logs.shutdown))
        await asyncio.gather(*shutdowns)


def configure_telemetry(settings: Settings) -> Telemetry:
    license_key = settings.new_relic_license_key.get_secret_value()
    redactor = SecretRedactor(
        (settings.openai_api_key, license_key, settings.telegram_bot_token, settings.telegram_webhook_secret)
    )
    resource = Resource.create({"service.name": settings.otel_service_name})
    # Do not let the SDK truncate a string before the final credential check.
    traces = TracerProvider(
        resource=resource,
        span_limits=SpanLimits(max_attribute_length=SpanLimits.UNSET, max_span_attribute_length=SpanLimits.UNSET),
    )
    logs = None
    otlp_requested = "otlp" in (settings.otel_traces_exporter, settings.otel_logs_exporter)
    endpoint = settings.otlp_endpoint.strip().rstrip("/")
    otlp_enabled = (
        otlp_requested
        and bool(license_key.strip())
        and valid_endpoint(endpoint, production=settings.environment == "Production")
    )
    headers = {"api-key": license_key}

    if otlp_enabled and settings.otel_logs_exporter == "otlp":
        logs = LoggerProvider(resource=resource)
        logs.add_log_record_processor(
            BatchLogRecordProcessor(
                OTLPLogExporter(
                    endpoint=f"{endpoint}/v1/logs",
                    headers=headers,
                    compression=Compression.NoCompression,
                    session=RedactingOtlpSession(redactor, ExportLogsServiceRequest),
                    timeout=3,
                ),
                max_export_batch_size=32,
            )
        )
    configure_logging(redactor, logs)

    openai_traces = BatchTraceProcessor(RedactingOpenAITraceExporter(settings.openai_api_key, redactor))
    set_trace_processors([openai_traces])
    if settings.otel_traces_exporter == "console" or (otlp_enabled and settings.otel_traces_exporter == "otlp"):
        AsyncPGInstrumentor(capture_parameters=False).instrument(tracer_provider=traces)  # type: ignore[no-untyped-call]
    if otlp_enabled and settings.otel_traces_exporter == "otlp":
        traces.add_span_processor(
            BatchSpanProcessor(
                OTLPSpanExporter(
                    endpoint=f"{endpoint}/v1/traces",
                    headers=headers,
                    compression=Compression.NoCompression,
                    session=RedactingOtlpSession(redactor, ExportTraceServiceRequest),
                    timeout=3,
                ),
                max_export_batch_size=32,
            )
        )
        os.environ["OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT"] = "span_only"
        # Only span attributes go through the GenAI pipeline. Application logging has its own bridge.
        openai_options = {"tracer_provider": traces, "logger_provider": NoOpLoggerProvider()}
        OpenAIInstrumentor().instrument(**openai_options)
        OpenAIAgentsInstrumentor().instrument(**openai_options)
    elif settings.otel_traces_exporter == "console":
        traces.add_span_processor(
            BatchSpanProcessor(ConsoleSpanExporter(formatter=lambda span: redactor.redact(span.to_json()) + "\n"))
        )

    if otlp_requested and not otlp_enabled:
        logger.warning("OTLP export is disabled because its endpoint or ingest license is missing or invalid.")
    return Telemetry(traces, logs, openai_traces)
