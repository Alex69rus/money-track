from __future__ import annotations

from datetime import UTC, datetime

from app.models import TelegramUpdateReceipt


async def claim_telegram_update(*, update_id: int) -> bool:
    """Atomically admit an exact update ID once across workers and restarts."""
    rows = await (
        TelegramUpdateReceipt.insert(
            TelegramUpdateReceipt(update_id=update_id, received_at=datetime.now(UTC).replace(tzinfo=None))
        )
        .on_conflict(target=(TelegramUpdateReceipt.update_id,), action="DO NOTHING")
        .returning(TelegramUpdateReceipt.update_id)
        .run()
    )
    return bool(rows)
