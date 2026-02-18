from __future__ import annotations

from datetime import datetime

import httpx


def _json_or_text(response: httpx.Response):
    try:
        return response.json()
    except ValueError:
        return response.text


def test_health(base_url: str, record_result) -> None:
    path = "/health"
    response = httpx.get(f"{base_url}{path}", timeout=15)

    body = _json_or_text(response)
    record_result(method="GET", path=path, status_code=response.status_code, body=body)

    assert response.status_code == 200
    assert response.text == "OK"


def test_categories(base_url: str, record_result) -> None:
    path = "/api/categories/"
    response = httpx.get(f"{base_url}{path}", timeout=15)

    body = _json_or_text(response)
    record_result(method="GET", path=path, status_code=response.status_code, body=body)

    assert response.status_code == 200
    assert isinstance(body, list)


def test_transactions_default_pagination_in_dev_mode(base_url: str, record_result) -> None:
    path = "/api/transactions/"
    response = httpx.get(f"{base_url}{path}", timeout=15)

    body = _json_or_text(response)
    record_result(method="GET", path=path, status_code=response.status_code, body=body)

    assert response.status_code == 200
    assert isinstance(body, dict)
    assert "data" in body
    assert "totalCount" in body
    assert "skip" in body
    assert "take" in body
    assert "hasMore" in body
    assert body["skip"] == 0
    assert body["take"] == 50


def test_transactions_date_filter_shape(base_url: str, record_result) -> None:
    day = datetime(2025, 9, 21).date().isoformat()
    path = f"/api/transactions/?fromDate={day}&toDate={day}"
    response = httpx.get(f"{base_url}{path}", timeout=15)

    body = _json_or_text(response)
    record_result(method="GET", path=path, status_code=response.status_code, body=body)

    assert response.status_code == 200
    assert isinstance(body, dict)
    assert "data" in body
