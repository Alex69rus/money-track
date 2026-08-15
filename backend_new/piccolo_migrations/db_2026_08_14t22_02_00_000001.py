from piccolo.apps.migrations.auto.migration_manager import MigrationManager
from piccolo.engine import engine_finder

ID = "2026-08-14T22:02:00:000001"
VERSION = "1.32.0"
DESCRIPTION = "Add refund logs to transactions"


async def _add_transaction_refunds() -> None:
    engine = engine_finder()
    if engine is None:
        raise RuntimeError("Piccolo engine is not available")

    await engine.run_ddl(
        """
        ALTER TABLE "transaction"
        ADD COLUMN IF NOT EXISTS refunds jsonb NOT NULL DEFAULT '[]'::jsonb
        """
    )


async def forwards() -> MigrationManager:
    manager = MigrationManager(migration_id=ID, app_name="db", description=DESCRIPTION)
    manager.add_raw(_add_transaction_refunds)
    return manager
