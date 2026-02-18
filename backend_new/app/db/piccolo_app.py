from piccolo.app import AppConfig

APP_CONFIG = AppConfig(
    app_name="db",
    migrations_folder_path="piccolo_migrations",
    table_classes=[],
)
