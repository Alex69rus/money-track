from piccolo.engine.postgres import PostgresEngine

from app.core.config import get_settings

settings = get_settings()
engine = PostgresEngine(config={"connection_string": settings.database_url})


def get_engine() -> PostgresEngine:
    return engine
