from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import asyncpg


@dataclass(frozen=True)
class SeedTransaction:
    user_id: int
    transaction_date: datetime
    amount: Decimal
    note: str | None
    category_id: int | None
    tags: list[str]
    currency: str
    sms_text: str | None
    message_id: str


class DbHelper:
    def __init__(self, database_url: str, namespace: str) -> None:
        self._database_url = database_url
        self._namespace = namespace

    @property
    def namespace(self) -> str:
        return self._namespace

    async def cleanup(self) -> None:
        conn = await asyncpg.connect(self._database_url)
        try:
            # Cleanup only namespaced artifacts created by this suite.
            await conn.execute(
                (
                    'DELETE FROM "transaction" '
                    "WHERE message_id LIKE $1 OR note LIKE $2 OR sms_text LIKE $3"
                ),
                f"{self._namespace}%",
                f"{self._namespace}%",
                f"{self._namespace}%",
            )
            await conn.execute(
                "DELETE FROM category WHERE name LIKE $1",
                f"{self._namespace}%",
            )
        finally:
            await conn.close()

    async def insert_transaction(self, tx: SeedTransaction) -> int:
        conn = await asyncpg.connect(self._database_url)
        try:
            row = await conn.fetchrow(
                """
                INSERT INTO "transaction"
                    (
                        user_id, transaction_date, amount, note, category_id,
                        tags, currency, sms_text, message_id, created_at
                    )
                VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10)
                RETURNING id
                """,
                tx.user_id,
                tx.transaction_date,
                tx.amount,
                tx.note,
                tx.category_id,
                tx.tags,
                tx.currency,
                tx.sms_text,
                tx.message_id,
                datetime.now(UTC),
            )
        finally:
            await conn.close()
        assert row is not None
        return int(row["id"])

    async def insert_category(
        self, *, name: str, category_type: str = "Expense", order_index: int | None = None
    ) -> int:
        conn = await asyncpg.connect(self._database_url)
        try:
            row = await conn.fetchrow(
                """
                INSERT INTO category
                    (name, type, color, icon, parent_category_id, order_index, created_at)
                VALUES ($1, $2, NULL, NULL, NULL, $3, $4)
                RETURNING id
                """,
                name,
                category_type,
                order_index,
                datetime.now(UTC),
            )
        finally:
            await conn.close()
        assert row is not None
        return int(row["id"])

    async def get_transaction_by_id(self, tx_id: int) -> dict[str, Any] | None:
        conn = await asyncpg.connect(self._database_url)
        try:
            row = await conn.fetchrow(
                """
                SELECT
                    id, user_id, transaction_date, amount, note, category_id, tags, currency,
                    sms_text, message_id
                FROM "transaction"
                WHERE id = $1
                """,
                tx_id,
            )
        finally:
            await conn.close()
        return dict(row) if row else None

    async def delete_category(self, category_id: int) -> None:
        conn = await asyncpg.connect(self._database_url)
        try:
            await conn.execute("DELETE FROM category WHERE id = $1", category_id)
        finally:
            await conn.close()

    async def get_any_category_id(self) -> int:
        conn = await asyncpg.connect(self._database_url)
        try:
            row = await conn.fetchrow("SELECT id FROM category ORDER BY id LIMIT 1")
        finally:
            await conn.close()
        if row is None:
            raise RuntimeError("No category available in database")
        return int(row["id"])

    async def has_transaction_user_message_unique_index(self) -> bool:
        conn = await asyncpg.connect(self._database_url)
        try:
            row = await conn.fetchrow(
                """
                SELECT i.indisunique
                FROM pg_class idx
                JOIN pg_index i ON i.indexrelid = idx.oid
                JOIN pg_class tbl ON i.indrelid = tbl.oid
                WHERE tbl.relname = 'transaction'
                  AND idx.relname = 'ix_transaction_user_id_message_id'
                """
            )
        finally:
            await conn.close()
        return bool(row and row["indisunique"])

    async def transaction_category_fk_uses_set_null(self) -> bool:
        conn = await asyncpg.connect(self._database_url)
        try:
            row = await conn.fetchrow(
                """
                SELECT confdeltype = 'n' AS uses_set_null
                FROM pg_constraint
                WHERE conname = 'fk_transaction_category_category_id'
                  AND conrelid = 'transaction'::regclass
                LIMIT 1
                """
            )
        finally:
            await conn.close()
        return bool(row and row["uses_set_null"])
