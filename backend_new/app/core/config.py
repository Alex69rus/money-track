from functools import lru_cache
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["Development", "Production", "Test"] = Field(default="Development", alias="ENVIRONMENT")
    api_host: str = Field(default="0.0.0.0", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")
    cors_allow_origins: str = Field(default="http://localhost:3000", alias="CORS_ALLOW_ORIGINS")
    business_timezone: str = Field(default="Asia/Dubai", alias="BUSINESS_TIMEZONE")
    database_url: str = Field(alias="DATABASE_URL")
    telegram_bot_token: str = Field(alias="TELEGRAM_BOT_TOKEN")
    telegram_webhook_url: str = Field(default="", alias="TELEGRAM_WEBHOOK_URL")
    telegram_webhook_secret: str = Field(default="", alias="TELEGRAM_WEBHOOK_SECRET")
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4.1-mini", alias="OPENAI_MODEL")

    @property
    def business_tzinfo(self) -> ZoneInfo:
        return ZoneInfo(self.business_timezone)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
