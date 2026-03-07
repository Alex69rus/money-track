from piccolo.conf.apps import AppRegistry

from app.db.engine import get_engine

DB = get_engine()

APP_REGISTRY = AppRegistry(apps=["app.db.piccolo_app"])
