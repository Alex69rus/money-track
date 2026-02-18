from piccolo.conf.apps import AppRegistry
from piccolo.engine.postgres import PostgresEngine

from app.core.config import get_settings

settings = get_settings()

DB = PostgresEngine(config={"connection_string": settings.database_url})

APP_REGISTRY = AppRegistry(apps=["app.db.piccolo_app"])
