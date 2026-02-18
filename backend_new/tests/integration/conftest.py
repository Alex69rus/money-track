from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import pytest


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


def pytest_configure(config: pytest.Config) -> None:
    config._recorded_results = []  # type: ignore[attr-defined]


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.getenv("BASE_URL", "http://localhost:5000")


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
    output_path.write_text(json.dumps(serialized, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
