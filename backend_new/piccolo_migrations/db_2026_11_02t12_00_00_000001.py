from piccolo.apps.migrations.auto.migration_manager import MigrationManager
from piccolo.engine import engine_finder

ID = "2026-11-02T12:00:00:000001"
VERSION = "1.32.0"
DESCRIPTION = "Persist exact Telegram update IDs for duplicate suppression"


async def _create_telegram_update_receipts() -> None:
    engine = engine_finder()
    if engine is None:
        raise RuntimeError("Piccolo engine is not available")
    await engine.run_ddl(
        """
        CREATE TABLE IF NOT EXISTS telegram_update_receipt (
            update_id BIGINT PRIMARY KEY,
            received_at TIMESTAMP NOT NULL
        )
        """
    )


async def forwards() -> MigrationManager:
    manager = MigrationManager(migration_id=ID, app_name="db", description=DESCRIPTION)
    manager.add_raw(_create_telegram_update_receipts)
    return manager
