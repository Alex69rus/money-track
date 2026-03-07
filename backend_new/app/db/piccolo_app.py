from piccolo.conf.apps import AppConfig

from app.models import Category, Transaction

APP_CONFIG = AppConfig(
    app_name="db",
    migrations_folder_path="piccolo_migrations",
    table_classes=[Category, Transaction],
)
