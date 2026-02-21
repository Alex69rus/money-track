from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import httpx
import pytest

from tests.fixtures import DbHelper, SeedTransaction


def _unique_value(namespace: str, suffix: str) -> str:
    return f"{namespace}{suffix}"


def _transaction_payload(
    *,
    message_id: str,
    note: str,
    category_id: int | None = None,
    amount: float = 42.5,
) -> dict[str, object]:
    return {
        "transactionDate": "2025-09-21T09:15:00",
        "amount": amount,
        "note": note,
        "categoryId": category_id,
        "tags": ["it-tag", "parity"],
        "currency": "AED",
        "smsText": f"{note} sms",
        "messageId": message_id,
    }


def test_health_ok(http_client: httpx.Client, base_url: str, perform_request) -> None:
    response, body = perform_request(http_client, "GET", base_url, "/health")
    assert response.status_code == 200
    assert body == "OK"


def test_categories_sorted_by_order_index_then_name(
    http_client: httpx.Client,
    base_url: str,
    perform_request,
) -> None:
    response, body = perform_request(http_client, "GET", base_url, "/api/categories/")

    assert response.status_code == 200
    assert isinstance(body, list)

    ordered = sorted(
        body,
        key=lambda c: (
            (c.get("orderIndex") if c.get("orderIndex") is not None else 2**31 - 1),
            c["name"],
        ),
    )
    assert body == ordered


def test_tags_distinct_sorted_for_current_user_only(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_user_id: int,
    test_other_user_id: int,
    perform_request,
) -> None:
    shared = _unique_value(db_helper.namespace, "tag_shared")
    user_tag = _unique_value(db_helper.namespace, "tag_user")
    other_tag = _unique_value(db_helper.namespace, "tag_other")

    now = datetime.now(UTC)
    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=now,
                amount=Decimal("10.00"),
                note=_unique_value(db_helper.namespace, "tags-user"),
                category_id=None,
                tags=[shared, user_tag],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "tags-user"),
                message_id=_unique_value(db_helper.namespace, "msg-tags-user"),
            )
        )
    )
    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_other_user_id,
                transaction_date=now,
                amount=Decimal("11.00"),
                note=_unique_value(db_helper.namespace, "tags-other"),
                category_id=None,
                tags=[shared, other_tag],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "tags-other"),
                message_id=_unique_value(db_helper.namespace, "msg-tags-other"),
            )
        )
    )

    response, body = perform_request(http_client, "GET", base_url, "/api/tags/")

    assert response.status_code == 200
    assert isinstance(body, list)
    assert body == sorted(set(body))
    assert user_tag in body
    assert other_tag not in body


def test_transactions_default_pagination_semantics(
    http_client: httpx.Client,
    base_url: str,
    perform_request,
) -> None:
    response, body = perform_request(http_client, "GET", base_url, "/api/transactions/")

    assert response.status_code == 200
    assert isinstance(body, dict)
    assert body["skip"] == 0
    assert body["take"] == 50
    assert isinstance(body["data"], list)
    assert isinstance(body["totalCount"], int)
    assert isinstance(body["hasMore"], bool)


def test_transactions_has_more_true_when_total_exceeds_take(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_user_id: int,
    perform_request,
) -> None:
    bulk_tag = _unique_value(db_helper.namespace, "bulk")
    day = datetime(2025, 9, 21, tzinfo=UTC)

    for idx in range(51):
        asyncio.run(
            db_helper.insert_transaction(
                SeedTransaction(
                    user_id=test_user_id,
                    transaction_date=day + timedelta(minutes=idx),
                    amount=Decimal("1.00") + Decimal(idx),
                    note=_unique_value(db_helper.namespace, f"bulk-note-{idx}"),
                    category_id=None,
                    tags=[bulk_tag],
                    currency="AED",
                    sms_text=_unique_value(db_helper.namespace, "bulk"),
                    message_id=_unique_value(db_helper.namespace, f"msg-bulk-{idx}"),
                )
            )
        )

    path = f"/api/transactions/?tags={bulk_tag}&skip=0&take=50"
    response, body = perform_request(http_client, "GET", base_url, path)

    assert response.status_code == 200
    assert body["totalCount"] == 51
    assert body["skip"] == 0
    assert body["take"] == 50
    assert body["hasMore"] is True
    assert len(body["data"]) == 50


def test_transactions_date_filter_includes_entire_to_date(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_user_id: int,
    perform_request,
) -> None:
    test_tag = _unique_value(db_helper.namespace, "date-range")
    target_day = date(2025, 9, 21)

    included = datetime(2025, 9, 21, 23, 59, 59, tzinfo=UTC)
    excluded = datetime(2025, 9, 22, 0, 0, 0, tzinfo=UTC)

    included_msg = _unique_value(db_helper.namespace, "msg-date-included")
    excluded_msg = _unique_value(db_helper.namespace, "msg-date-excluded")

    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=included,
                amount=Decimal("12.34"),
                note=_unique_value(db_helper.namespace, "date-included"),
                category_id=None,
                tags=[test_tag],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "date-included"),
                message_id=included_msg,
            )
        )
    )
    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=excluded,
                amount=Decimal("13.34"),
                note=_unique_value(db_helper.namespace, "date-excluded"),
                category_id=None,
                tags=[test_tag],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "date-excluded"),
                message_id=excluded_msg,
            )
        )
    )

    day = target_day.isoformat()
    path = f"/api/transactions/?fromDate={day}&toDate={day}&tags={test_tag}&take=100"
    response, body = perform_request(http_client, "GET", base_url, path)

    assert response.status_code == 200
    message_ids = {item.get("messageId") for item in body["data"]}
    assert included_msg in message_ids
    assert excluded_msg not in message_ids


def test_transactions_filter_by_tags_any_match(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_user_id: int,
    perform_request,
) -> None:
    keep_tag = _unique_value(db_helper.namespace, "keep-tag")
    miss_tag = _unique_value(db_helper.namespace, "miss-tag")

    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 21, 10, 0, tzinfo=UTC),
                amount=Decimal("22.00"),
                note=_unique_value(db_helper.namespace, "tag-match"),
                category_id=None,
                tags=[keep_tag],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "tag-match"),
                message_id=_unique_value(db_helper.namespace, "msg-tag-match"),
            )
        )
    )
    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 21, 10, 5, tzinfo=UTC),
                amount=Decimal("23.00"),
                note=_unique_value(db_helper.namespace, "tag-miss"),
                category_id=None,
                tags=[miss_tag],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "tag-miss"),
                message_id=_unique_value(db_helper.namespace, "msg-tag-miss"),
            )
        )
    )

    unknown_tag = _unique_value(db_helper.namespace, "unknown")
    path = f"/api/transactions/?tags={keep_tag},{unknown_tag}&take=100"
    response, body = perform_request(http_client, "GET", base_url, path)

    assert response.status_code == 200
    notes = {item.get("note") for item in body["data"]}
    assert _unique_value(db_helper.namespace, "tag-match") in notes
    assert _unique_value(db_helper.namespace, "tag-miss") not in notes


@pytest.mark.parametrize(
    ("min_amount", "max_amount", "expected_notes", "unexpected_notes"),
    [
        (
            20,
            50,
            ("amount-in-range",),
            ("amount-below", "amount-above"),
        ),
        (
            -20,
            20,
            ("amount-negative-in-range", "amount-positive-in-range"),
            ("amount-negative-below", "amount-positive-above"),
        ),
    ],
)
def test_transactions_filter_by_min_max_amount(
    min_amount: int,
    max_amount: int,
    expected_notes: tuple[str, ...],
    unexpected_notes: tuple[str, ...],
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_user_id: int,
    perform_request,
) -> None:
    amount_tag = _unique_value(db_helper.namespace, "amount-range")
    amount_rows: list[tuple[Decimal, str, str]]
    if min_amount >= 0:
        amount_rows = [
            (
                Decimal("9.99"),
                _unique_value(db_helper.namespace, "amount-below"),
                _unique_value(db_helper.namespace, "msg-amount-below"),
            ),
            (
                Decimal("30.00"),
                _unique_value(db_helper.namespace, "amount-in-range"),
                _unique_value(db_helper.namespace, "msg-amount-in-range"),
            ),
            (
                Decimal("75.00"),
                _unique_value(db_helper.namespace, "amount-above"),
                _unique_value(db_helper.namespace, "msg-amount-above"),
            ),
        ]
    else:
        amount_rows = [
            (
                Decimal("-50.00"),
                _unique_value(db_helper.namespace, "amount-negative-below"),
                _unique_value(db_helper.namespace, "msg-amount-negative-below"),
            ),
            (
                Decimal("-10.00"),
                _unique_value(db_helper.namespace, "amount-negative-in-range"),
                _unique_value(db_helper.namespace, "msg-amount-negative-in-range"),
            ),
            (
                Decimal("10.00"),
                _unique_value(db_helper.namespace, "amount-positive-in-range"),
                _unique_value(db_helper.namespace, "msg-amount-positive-in-range"),
            ),
            (
                Decimal("30.00"),
                _unique_value(db_helper.namespace, "amount-positive-above"),
                _unique_value(db_helper.namespace, "msg-amount-positive-above"),
            ),
        ]

    for index, (amount_value, note, message_id) in enumerate(amount_rows):
        asyncio.run(
            db_helper.insert_transaction(
                SeedTransaction(
                    user_id=test_user_id,
                    transaction_date=datetime(2025, 9, 21, 11, index, tzinfo=UTC),
                    amount=amount_value,
                    note=note,
                    category_id=None,
                    tags=[amount_tag],
                    currency="AED",
                    sms_text=note,
                    message_id=message_id,
                )
            )
        )

    path = (
        f"/api/transactions/?tags={amount_tag}&minAmount={min_amount}"
        f"&maxAmount={max_amount}&take=100"
    )
    response, body = perform_request(http_client, "GET", base_url, path)

    assert response.status_code == 200
    notes = {item.get("note") for item in body["data"]}
    for suffix in expected_notes:
        assert _unique_value(db_helper.namespace, suffix) in notes
    for suffix in unexpected_notes:
        assert _unique_value(db_helper.namespace, suffix) not in notes


def test_transactions_filter_by_category_id(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_user_id: int,
    perform_request,
) -> None:
    filter_tag = _unique_value(db_helper.namespace, "category-filter")
    keep_category_id = asyncio.run(
        db_helper.insert_category(name=_unique_value(db_helper.namespace, "KeepCategory"))
    )
    other_category_id = asyncio.run(
        db_helper.insert_category(name=_unique_value(db_helper.namespace, "OtherCategory"))
    )
    keep_note = _unique_value(db_helper.namespace, "category-keep")
    other_note = _unique_value(db_helper.namespace, "category-other")

    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 21, 12, 0, tzinfo=UTC),
                amount=Decimal("20.00"),
                note=keep_note,
                category_id=keep_category_id,
                tags=[filter_tag],
                currency="AED",
                sms_text=keep_note,
                message_id=_unique_value(db_helper.namespace, "msg-category-keep"),
            )
        )
    )
    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 21, 12, 1, tzinfo=UTC),
                amount=Decimal("21.00"),
                note=other_note,
                category_id=other_category_id,
                tags=[filter_tag],
                currency="AED",
                sms_text=other_note,
                message_id=_unique_value(db_helper.namespace, "msg-category-other"),
            )
        )
    )

    path = f"/api/transactions/?tags={filter_tag}&categoryId={keep_category_id}&take=100"
    response, body = perform_request(http_client, "GET", base_url, path)

    assert response.status_code == 200
    notes = {item.get("note") for item in body["data"]}
    assert keep_note in notes
    assert other_note not in notes


def test_transactions_filter_by_text_note_tag_amount_category(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_user_id: int,
    perform_request,
) -> None:
    category_name = _unique_value(db_helper.namespace, "CategorySearch")
    category_id = asyncio.run(db_helper.insert_category(name=category_name))

    note_term = _unique_value(db_helper.namespace, "note_term")
    tag_term = _unique_value(db_helper.namespace, "tag_term")
    amount_term = "345.67"

    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 21, 8, 0, tzinfo=UTC),
                amount=Decimal("11.11"),
                note=note_term,
                category_id=None,
                tags=[_unique_value(db_helper.namespace, "other")],
                currency="AED",
                sms_text=note_term,
                message_id=_unique_value(db_helper.namespace, "msg-text-note"),
            )
        )
    )
    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 21, 8, 1, tzinfo=UTC),
                amount=Decimal("22.22"),
                note=_unique_value(db_helper.namespace, "plain-note"),
                category_id=None,
                tags=[tag_term],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "plain-note"),
                message_id=_unique_value(db_helper.namespace, "msg-text-tag"),
            )
        )
    )
    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 21, 8, 2, tzinfo=UTC),
                amount=Decimal(amount_term),
                note=_unique_value(db_helper.namespace, "amount-note"),
                category_id=None,
                tags=[_unique_value(db_helper.namespace, "other2")],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "amount-note"),
                message_id=_unique_value(db_helper.namespace, "msg-text-amount"),
            )
        )
    )
    asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 21, 8, 3, tzinfo=UTC),
                amount=Decimal("44.44"),
                note=_unique_value(db_helper.namespace, "category-note"),
                category_id=category_id,
                tags=[_unique_value(db_helper.namespace, "other3")],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "category-note"),
                message_id=_unique_value(db_helper.namespace, "msg-text-category"),
            )
        )
    )

    for term in [note_term, tag_term, amount_term, category_name.lower()]:
        response, body = perform_request(
            http_client, "GET", base_url, f"/api/transactions/?text={term}&take=100"
        )
        assert response.status_code == 200
        assert body["totalCount"] >= 1


def test_create_transaction_persists_expected_defaults_and_fields(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    perform_request,
) -> None:
    message_id = _unique_value(db_helper.namespace, "msg-create")
    note = _unique_value(db_helper.namespace, "create-note")
    payload = _transaction_payload(message_id=message_id, note=note)

    response, body = perform_request(
        http_client, "POST", base_url, "/api/transactions/", json=payload
    )

    assert response.status_code == 201
    assert response.headers["location"] == f"/api/transactions/{body['id']}"
    assert body["messageId"] == message_id
    assert body["note"] == note
    assert body["currency"] == "AED"
    assert body["userId"] > 0
    assert body["category"] is None
    assert body["tags"] == payload["tags"]

    tx = asyncio.run(db_helper.get_transaction_by_id(int(body["id"])))
    assert tx is not None
    assert tx["message_id"] == message_id
    assert tx["note"] == note
    assert tx["currency"] == "AED"
    assert tx["tags"] == payload["tags"]
    assert tx["transaction_date"].astimezone(UTC).isoformat().startswith("2025-09-21T09:15:00")


def test_create_transaction_with_category_returns_null_embedded_category(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    perform_request,
) -> None:
    category_id = asyncio.run(db_helper.get_any_category_id())
    message_id = _unique_value(db_helper.namespace, "msg-create-category")
    note = _unique_value(db_helper.namespace, "create-category-note")
    payload = _transaction_payload(message_id=message_id, note=note, category_id=category_id)

    response, body = perform_request(
        http_client, "POST", base_url, "/api/transactions/", json=payload
    )

    assert response.status_code == 201
    assert body["categoryId"] == category_id
    assert body["category"] is None


@pytest.mark.parametrize("amount", [-42.5, 42.5])
def test_create_transaction_accepts_negative_and_positive_amounts(
    amount: float,
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    perform_request,
) -> None:
    amount_label = str(amount).replace("-", "neg")
    message_id = _unique_value(db_helper.namespace, f"msg-create-sign-{amount_label}")
    note = _unique_value(db_helper.namespace, f"create-sign-{amount_label}")
    payload = _transaction_payload(message_id=message_id, note=note, amount=amount)

    response, body = perform_request(
        http_client, "POST", base_url, "/api/transactions/", json=payload
    )

    assert response.status_code == 201
    assert body["amount"] == amount

    tx = asyncio.run(db_helper.get_transaction_by_id(int(body["id"])))
    assert tx is not None
    assert float(tx["amount"]) == amount


@pytest.mark.parametrize("updated_amount", [-88.88, 88.88])
def test_update_transaction_owned_success(
    updated_amount: float,
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_user_id: int,
    perform_request,
) -> None:
    amount_label = str(updated_amount).replace("-", "neg")
    tx_id = asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 21, 9, 0, tzinfo=UTC),
                amount=Decimal("50.00"),
                note=_unique_value(db_helper.namespace, f"update-before-{amount_label}"),
                category_id=None,
                tags=[_unique_value(db_helper.namespace, "before")],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, f"update-before-{amount_label}"),
                message_id=_unique_value(db_helper.namespace, f"msg-update-owned-{amount_label}"),
            )
        )
    )

    payload = {
        "transactionDate": "2025-09-22T12:30:00",
        "amount": updated_amount,
        "note": _unique_value(db_helper.namespace, "update-after"),
        "categoryId": None,
        "tags": [_unique_value(db_helper.namespace, "after")],
        "currency": "AED",
    }

    response, body = perform_request(
        http_client, "PUT", base_url, f"/api/transactions/{tx_id}", json=payload
    )

    assert response.status_code == 200
    assert body["id"] == tx_id
    assert body["note"] == _unique_value(db_helper.namespace, "update-after")
    assert body["amount"] == updated_amount


def test_update_transaction_not_owned_returns_not_found(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_other_user_id: int,
    perform_request,
) -> None:
    tx_id = asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_other_user_id,
                transaction_date=datetime(2025, 9, 21, 7, 0, tzinfo=UTC),
                amount=Decimal("17.00"),
                note=_unique_value(db_helper.namespace, "update-not-owned"),
                category_id=None,
                tags=[_unique_value(db_helper.namespace, "not-owned")],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "update-not-owned"),
                message_id=_unique_value(db_helper.namespace, "msg-update-not-owned"),
            )
        )
    )

    payload = {
        "transactionDate": "2025-09-21T07:00:00",
        "amount": 18.0,
        "note": _unique_value(db_helper.namespace, "should-not-update"),
        "categoryId": None,
        "tags": [_unique_value(db_helper.namespace, "should-not-update")],
        "currency": "AED",
    }

    response, _ = perform_request(
        http_client, "PUT", base_url, f"/api/transactions/{tx_id}", json=payload
    )
    assert response.status_code == 404


def test_update_transaction_missing_returns_not_found(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    perform_request,
) -> None:
    payload = {
        "transactionDate": "2025-09-21T07:00:00",
        "amount": 18.0,
        "note": _unique_value(db_helper.namespace, "update-missing"),
        "categoryId": None,
        "tags": [_unique_value(db_helper.namespace, "update-missing")],
        "currency": "AED",
    }

    response, _ = perform_request(
        http_client, "PUT", base_url, "/api/transactions/99999999", json=payload
    )
    assert response.status_code == 404


def test_delete_transaction_owned_success(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_user_id: int,
    perform_request,
) -> None:
    tx_id = asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 20, 11, 0, tzinfo=UTC),
                amount=Decimal("77.00"),
                note=_unique_value(db_helper.namespace, "delete-owned"),
                category_id=None,
                tags=[_unique_value(db_helper.namespace, "delete-owned")],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "delete-owned"),
                message_id=_unique_value(db_helper.namespace, "msg-delete-owned"),
            )
        )
    )

    response, _ = perform_request(http_client, "DELETE", base_url, f"/api/transactions/{tx_id}")
    assert response.status_code == 204

    tx = asyncio.run(db_helper.get_transaction_by_id(tx_id))
    assert tx is None


def test_delete_transaction_not_owned_returns_not_found(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    test_other_user_id: int,
    perform_request,
) -> None:
    tx_id = asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_other_user_id,
                transaction_date=datetime(2025, 9, 20, 12, 0, tzinfo=UTC),
                amount=Decimal("66.00"),
                note=_unique_value(db_helper.namespace, "delete-not-owned"),
                category_id=None,
                tags=[_unique_value(db_helper.namespace, "delete-not-owned")],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "delete-not-owned"),
                message_id=_unique_value(db_helper.namespace, "msg-delete-not-owned"),
            )
        )
    )

    response, _ = perform_request(http_client, "DELETE", base_url, f"/api/transactions/{tx_id}")
    assert response.status_code == 404

    tx = asyncio.run(db_helper.get_transaction_by_id(tx_id))
    assert tx is not None


def test_delete_transaction_missing_returns_not_found(
    http_client: httpx.Client,
    base_url: str,
    perform_request,
) -> None:
    response, _ = perform_request(http_client, "DELETE", base_url, "/api/transactions/99999999")
    assert response.status_code == 404


def test_unauthorized_missing_auth_header_in_production(
    http_client: httpx.Client,
    production_base_url: str | None,
    perform_request,
) -> None:
    if production_base_url is None:
        pytest.skip("Set PRODUCTION_BASE_URL to run production auth checks")
    response, body = perform_request(http_client, "GET", production_base_url, "/api/transactions/")

    assert response.status_code == 401
    assert isinstance(body, dict)
    assert body["error"] == "Unauthorized"
    assert "message" in body


def test_unauthorized_invalid_auth_header_in_production(
    http_client: httpx.Client,
    production_base_url: str | None,
    perform_request,
) -> None:
    if production_base_url is None:
        pytest.skip("Set PRODUCTION_BASE_URL to run production auth checks")
    response, body = perform_request(
        http_client,
        "GET",
        production_base_url,
        "/api/transactions/",
        headers={"X-Telegram-Init-Data": "user=%7B%22id%22%3A1%7D&hash=invalid"},
    )

    assert response.status_code == 401
    assert isinstance(body, dict)
    assert body["error"] == "Unauthorized"
    assert "message" in body


def test_unique_user_message_constraint_enforced(
    http_client: httpx.Client,
    base_url: str,
    db_helper: DbHelper,
    perform_request,
) -> None:
    message_id = _unique_value(db_helper.namespace, "msg-unique")
    payload = _transaction_payload(
        message_id=message_id, note=_unique_value(db_helper.namespace, "unique-a")
    )

    first_response, _ = perform_request(
        http_client, "POST", base_url, "/api/transactions/", json=payload
    )
    assert first_response.status_code == 201

    duplicate_payload = _transaction_payload(
        message_id=message_id, note=_unique_value(db_helper.namespace, "unique-b")
    )
    second_response, body = perform_request(
        http_client, "POST", base_url, "/api/transactions/", json=duplicate_payload
    )

    assert second_response.status_code == 500
    assert isinstance(body, dict)
    assert body["error"] == "Internal Server Error"
    assert "message" in body


def test_category_fk_set_null_on_category_delete(
    db_helper: DbHelper,
    test_user_id: int,
) -> None:
    category_id = asyncio.run(
        db_helper.insert_category(name=_unique_value(db_helper.namespace, "fk-set-null"))
    )
    tx_id = asyncio.run(
        db_helper.insert_transaction(
            SeedTransaction(
                user_id=test_user_id,
                transaction_date=datetime(2025, 9, 23, 10, 0, tzinfo=UTC),
                amount=Decimal("123.00"),
                note=_unique_value(db_helper.namespace, "fk-note"),
                category_id=category_id,
                tags=[_unique_value(db_helper.namespace, "fk-tag")],
                currency="AED",
                sms_text=_unique_value(db_helper.namespace, "fk-note"),
                message_id=_unique_value(db_helper.namespace, "msg-fk-null"),
            )
        )
    )

    asyncio.run(db_helper.delete_category(category_id))

    tx = asyncio.run(db_helper.get_transaction_by_id(tx_id))
    assert tx is not None
    assert tx["category_id"] is None


def test_schema_has_unique_index_on_user_id_message_id(
    db_helper: DbHelper,
) -> None:
    has_index = asyncio.run(db_helper.has_transaction_user_message_unique_index())
    assert has_index is True


def test_schema_has_transaction_category_fk_with_set_null(
    db_helper: DbHelper,
) -> None:
    uses_set_null = asyncio.run(db_helper.transaction_category_fk_uses_set_null())
    assert uses_set_null is True
