import gzip
import sys
from typing import Any
from urllib.parse import urlsplit

import requests
from google.protobuf.descriptor import FieldDescriptor
from google.protobuf.message import Message

from app.core.logging import SecretRedactor

_NEW_RELIC_HOSTS = {"otlp.nr-data.net", "otlp.eu01.nr-data.net", "otlp.jp.nr-data.net", "gov-otlp.nr-data.net"}


def valid_endpoint(endpoint: str, *, production: bool) -> bool:
    try:
        url = urlsplit(endpoint)
        if url.username or url.password or url.query or url.fragment or url.path not in ("", "/"):
            return False
        if url.scheme == "https" and url.hostname in _NEW_RELIC_HOSTS:
            return url.port in (None, 443, 4318, 4317)
        return not production and url.scheme == "http" and url.hostname in ("127.0.0.1", "localhost", "::1")
    except ValueError:
        return False


class RedactingOtlpSession(requests.Session):
    """Clean the serialized payload at the last boundary before either signal leaves the process."""

    def __init__(self, redactor: SecretRedactor, request_type: type[Message]) -> None:
        super().__init__()
        self._redactor = redactor
        self._request_type = request_type

    def _redact_message(self, message: Message) -> None:
        for field, value in message.ListFields():
            if field.type == FieldDescriptor.TYPE_MESSAGE:
                for child in value if field.is_repeated else (value,):
                    self._redact_message(child)
            elif field.type == FieldDescriptor.TYPE_STRING:
                if field.is_repeated:
                    value[:] = [self._redactor.redact(item) for item in value]
                else:
                    setattr(message, field.name, self._redactor.redact(value))
            elif field.name == "bytes_value":
                # Trace IDs, span IDs, and parent IDs are binary identifiers.
                # An AnyValue byte payload, however, could contain arbitrary content.
                message.ClearField(field.name)

    def send(self, request: requests.PreparedRequest, **kwargs: Any) -> requests.Response:
        try:
            if not isinstance(request.body, bytes) or request.headers.get("Content-Encoding"):
                raise ValueError("Unexpected OTLP request format")
            message = self._request_type()
            message.ParseFromString(request.body)
            message.DiscardUnknownFields()
            self._redact_message(message)
            payload = gzip.compress(message.SerializeToString(), compresslevel=1)
            if len(payload) >= 1_000_000:
                raise ValueError("OTLP request exceeds the New Relic payload limit")
            request.prepare_body(payload, None)
            request.headers["Content-Encoding"] = "gzip"
        except Exception:
            sys.stderr.write("Dropped an OTLP batch that could not be sanitized.\n")
            raise requests.RequestException("OTLP sanitization failed") from None
        kwargs["allow_redirects"] = False
        return super().send(request, **kwargs)
