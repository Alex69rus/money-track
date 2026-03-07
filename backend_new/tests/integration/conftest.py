from __future__ import annotations

import asyncio
import json
import os
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import httpx
import pytest

from tests.fixtures import DbHelper


def _read_database_url_from_env_file() -> str | None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return None

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    return None


def _normalize_localhost_to_ipv4(dsn: str) -> str:
    parsed = urlsplit(dsn)
    if parsed.hostname != "localhost":
        return dsn

    user_info = ""
    if parsed.username:
        user_info = parsed.username
        if parsed.password:
            user_info = f"{user_info}:{parsed.password}"
        user_info = f"{user_info}@"

    host = "127.0.0.1"
    port = f":{parsed.port}" if parsed.port else ""
    netloc = f"{user_info}{host}{port}"
    return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))


@dataclass
class RecordedResult:
    test_id: str
    method: str
    path: str
    status_code: int
    body: Any


def _normalize_body(body: Any) -> Any:
    if isinstance(body, dict):
        return {key: _normalize_body(value) for key, value in sorted(body.items())}
    if isinstance(body, list):
        return [_normalize_body(item) for item in body]
    return body


def _json_or_text(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return response.text


def pytest_configure(config: pytest.Config) -> None:
    config._recorded_results = []  # type: ignore[attr-defined]


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.getenv("BASE_URL", "http://localhost:5000")


@pytest.fixture(scope="session")
def production_base_url() -> str | None:
    return os.getenv("PRODUCTION_BASE_URL")


@pytest.fixture(scope="session")
def test_database_url() -> str:
    explicit = os.getenv("TEST_DATABASE_URL")
    if explicit:
        return _normalize_localhost_to_ipv4(explicit)

    from_env_file = _read_database_url_from_env_file()
    if from_env_file:
        return _normalize_localhost_to_ipv4(from_env_file)

    return "postgresql://postgres:password@127.0.0.1:5432/moneytrack"


@pytest.fixture(scope="session")
def test_user_id() -> int:
    return int(os.getenv("TEST_USER_ID", "123456789"))


@pytest.fixture(scope="session")
def test_other_user_id() -> int:
    return int(os.getenv("TEST_OTHER_USER_ID", "987654321"))


@pytest.fixture(scope="session")
def test_namespace() -> str:
    return f"it_{uuid.uuid4().hex[:10]}_"


@pytest.fixture(scope="session", autouse=True)
def db_cleanup_session(
    test_database_url: str,
    test_namespace: str,
) -> None:
    helper = DbHelper(test_database_url, test_namespace)
    asyncio.run(helper.cleanup())
    yield
    asyncio.run(helper.cleanup())


@pytest.fixture
def db_helper(test_database_url: str, test_namespace: str) -> DbHelper:
    return DbHelper(test_database_url, test_namespace)


@pytest.fixture
def http_client() -> httpx.Client:
    with httpx.Client(timeout=15) as client:
        yield client


@pytest.fixture
def record_result(request: pytest.FixtureRequest):
    def _record(*, method: str, path: str, status_code: int, body: Any) -> None:
        result = RecordedResult(
            test_id=request.node.nodeid,
            method=method,
            path=path,
            status_code=status_code,
            body=_normalize_body(body),
        )
        request.config._recorded_results.append(result)  # type: ignore[attr-defined]

    return _record


@pytest.fixture
def perform_request(record_result):
    def _perform(
        client: httpx.Client, method: str, url: str, path: str, **kwargs: Any
    ) -> tuple[httpx.Response, Any]:
        response = client.request(method, f"{url}{path}", **kwargs)
        body = _json_or_text(response)
        record_result(method=method.upper(), path=path, status_code=response.status_code, body=body)
        return response, body

    return _perform


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    output = os.getenv("RESULTS_FILE")
    if not output:
        return

    results = getattr(session.config, "_recorded_results", [])
    serialized = {
        "base_url": os.getenv("BASE_URL", ""),
        "exitstatus": exitstatus,
        "results": [asdict(item) for item in sorted(results, key=lambda r: (r.test_id, r.path))],
    }

    output_path = Path(output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(serialized, indent=2, ensure_ascii=True) + "\n", encoding="utf-8"
    )
