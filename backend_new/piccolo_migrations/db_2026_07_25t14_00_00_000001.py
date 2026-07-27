from piccolo.apps.migrations.auto.migration_manager import MigrationManager
from piccolo.engine import engine_finder

ID = "2026-07-25T14:00:00:000001"
VERSION = "1.32.0"
DESCRIPTION = "Create transactions with category projection"


async def _create_transactions_with_category_view() -> None:
    engine = engine_finder()
    if engine is None:
        raise RuntimeError("Piccolo engine is not available")

    await engine.run_ddl(
        """
        CREATE OR REPLACE VIEW transactions_with_category AS
        SELECT
            trx.id AS id,
            trx.user_id AS user_id,
            trx.transaction_date AS transaction_date_time,
            DATE_TRUNC('day', trx.transaction_date) AS transaction_date_day,
            DATE_TRUNC('month', trx.transaction_date) AS transaction_date_month,
            DATE_TRUNC('quarter', trx.transaction_date) AS transaction_date_quarter,
            DATE_TRUNC('year', trx.transaction_date) AS transaction_date_year,
            trx.amount AS amount,
            trx.note AS note,
            trx.tags AS tags,
            trx.currency AS currency,
            trx.category_id AS category_id,
            category.name AS category_name,
            category.type AS category_type
        FROM "transaction" AS trx
        LEFT JOIN category ON trx.category_id = category.id
        """
    )


async def forwards() -> MigrationManager:
    manager = MigrationManager(migration_id=ID, app_name="db", description=DESCRIPTION)
    manager.add_raw(_create_transactions_with_category_view)
    return manager
