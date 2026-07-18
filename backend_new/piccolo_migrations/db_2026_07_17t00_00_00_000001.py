from piccolo.apps.migrations.auto.migration_manager import MigrationManager
from piccolo.engine import engine_finder

ID = "2026-07-17T00:00:00:000001"
VERSION = "1.32.0"
DESCRIPTION = "Canonicalize transaction currency and tags for analytics"


async def _canonicalize_transaction_values() -> None:
    engine = engine_finder()
    if engine is None:
        raise RuntimeError("Piccolo engine is not available")

    await engine.run_ddl(
        """
        UPDATE "transaction"
        SET
            currency = UPPER(BTRIM(currency)),
            tags = ARRAY(
                SELECT DISTINCT LOWER(BTRIM(tag))
                FROM UNNEST(tags) AS tag
                WHERE BTRIM(tag) <> ''
            )
        """
    )


async def forwards() -> MigrationManager:
    manager = MigrationManager(migration_id=ID, app_name="db", description=DESCRIPTION)
    manager.add_raw(_canonicalize_transaction_values)
    return manager
