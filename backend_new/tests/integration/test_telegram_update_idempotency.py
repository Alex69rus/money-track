from __future__ import annotations

import asyncio
import uuid

from piccolo.engine.postgres import PostgresEngine

from app.models import TelegramUpdateReceipt
from app.services.telegram_updates import claim_telegram_update


def test_duplicate_claim_is_atomic_and_survives_new_event_loops(test_database_url, monkeypatch):
    monkeypatch.setattr(TelegramUpdateReceipt._meta, "db", PostgresEngine(config={"dsn": test_database_url}))
    # Negative IDs cannot collide with Telegram's real positive update IDs.
    update_id = -(uuid.uuid4().int % (2**60)) - 2

    async def concurrent_claims():
        return await asyncio.gather(*(claim_telegram_update(update_id=update_id) for _ in range(8)))

    async def cleanup():
        await (
            TelegramUpdateReceipt.delete()
            .where(TelegramUpdateReceipt.update_id.is_in([update_id, update_id - 1]))
            .run()
        )

    try:
        results = asyncio.run(concurrent_claims())
        assert results.count(True) == 1
        assert results.count(False) == 7
        assert asyncio.run(claim_telegram_update(update_id=update_id)) is False
        # Do not use a high-water mark: an unseen lower ID must still run.
        assert asyncio.run(claim_telegram_update(update_id=update_id - 1)) is True
    finally:
        asyncio.run(cleanup())
