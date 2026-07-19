from piccolo.apps.migrations.auto.migration_manager import MigrationManager
from piccolo.engine import engine_finder

ID = "2026-07-19T15:30:00:000001"
VERSION = "1.32.0"
DESCRIPTION = "Assign canonical icons and colors to the shared category catalog"


async def _apply_category_presentation_catalog() -> None:
    engine = engine_finder()
    if engine is None:
        raise RuntimeError("Piccolo engine is not available")

    await engine.run_ddl(
        """
        UPDATE category AS category_row
        SET
            color = catalog.color,
            icon = catalog.icon
        FROM (
            VALUES
                ('Groceries', 'Expense', '#22c55e', 'shopping_cart'),
                ('Eating Out', 'Expense', '#f97316', 'restaurant'),
                ('Entertainment', 'Expense', '#f97316', 'theater_comedy'),
                ('Luda''s job', 'Expense', '#64748b', 'work'),
                ('Beauty', 'Expense', '#ec4899', 'spa'),
                ('Clothing & Shoes', 'Expense', '#ec4899', 'checkroom'),
                ('Home', 'Expense', '#dcaf83', 'home'),
                ('Furniture', 'Expense', '#dcaf83', 'chair'),
                ('Household Goods', 'Expense', '#dcaf83', 'cleaning_services'),
                ('Maintenance & Renovation', 'Expense', '#dcaf83', 'construction'),
                ('Rent', 'Expense', '#dcaf83', 'key'),
                ('Utility', 'Expense', '#dcaf83', 'lightbulb'),
                ('Car', 'Expense', '#0ea5e9', 'directions_car'),
                ('Fuel', 'Expense', '#0ea5e9', 'local_gas_station'),
                ('Car Wash', 'Expense', '#0ea5e9', 'local_car_wash'),
                ('Parking & Toll roads', 'Expense', '#0ea5e9', 'local_parking'),
                ('Kids', 'Expense', '#a855f7', 'child_care'),
                ('Toys', 'Expense', '#a855f7', 'toys'),
                ('Classes', 'Expense', '#a855f7', 'school'),
                ('Baby Clothes', 'Expense', '#a855f7', 'checkroom'),
                ('Healthcare', 'Expense', '#ef4444', 'medical_services'),
                ('Medical Services', 'Expense', '#ef4444', 'medical_services'),
                ('Medicines', 'Expense', '#ef4444', 'medication'),
                ('Communication', 'Expense', '#06b6d4', 'wifi'),
                ('Cellular', 'Expense', '#06b6d4', 'smartphone'),
                ('Internet-Services', 'Expense', '#06b6d4', 'router'),
                ('Alcohol', 'Expense', '#d97706', 'local_bar'),
                ('Transport', 'Expense', '#0ea5e9', 'commute'),
                ('Public transport', 'Expense', '#0ea5e9', 'directions_bus'),
                ('Taxis', 'Expense', '#0ea5e9', 'local_taxi'),
                ('Carsharing', 'Expense', '#0ea5e9', 'car_rental'),
                ('Pets', 'Expense', '#f59e0b', 'pets'),
                ('Pet Food', 'Expense', '#f59e0b', 'pets'),
                ('Veterinary Services', 'Expense', '#f59e0b', 'vaccines'),
                ('Accessories & Toys', 'Expense', '#f59e0b', 'toys'),
                ('Education', 'Expense', '#6366f1', 'menu_book'),
                ('Travel', 'Expense', '#6366f1', 'flight'),
                ('Tickets', 'Expense', '#6366f1', 'confirmation_number'),
                ('Hotel', 'Expense', '#6366f1', 'hotel'),
                ('Etc.', 'Expense', '#64748b', 'more_horiz'),
                ('Gifts', 'Expense', '#f43f5e', 'redeem'),
                ('Charity', 'Expense', '#f43f5e', 'volunteer_activism'),
                ('Hardware', 'Expense', '#64748b', 'computer'),
                ('Legalisation', 'Expense', '#64748b', 'gavel'),
                ('Apique salary', 'Income', '#16a34a', 'payments'),
                ('Luda''s income', 'Income', '#16a34a', 'account_balance_wallet'),
                ('Savings interests', 'Income', '#16a34a', 'savings'),
                ('Apique salary Transfer from USD', 'Income', '#16a34a', 'currency_exchange'),
                ('Rus transfer', 'Income', '#16a34a', 'swap_horiz'),
                ('Other income', 'Income', '#16a34a', 'add_card')
        ) AS catalog(name, type, color, icon)
        WHERE category_row.name = catalog.name
          AND category_row.type = catalog.type
        """
    )


async def forwards() -> MigrationManager:
    manager = MigrationManager(migration_id=ID, app_name="db", description=DESCRIPTION)
    manager.add_raw(_apply_category_presentation_catalog)
    return manager
