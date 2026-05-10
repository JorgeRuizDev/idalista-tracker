"""Configuration management using Pydantic Settings."""
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Gmail Configuration
    GMAIL_EMAIL: str = ""
    GMAIL_APP_PASSWORD: str = ""

    # Constants (can be overridden via env, but have defaults)
    GMAIL_SENDER_FILTER: str = "noresponder@idealista.com"
    """The sender email address to filter property emails from."""

    # Database Configuration
    DATABASE_URL: str = "sqlite:///./idealista_properties.db"

    # Crawler Configuration
    CRAWL_INTERVAL_HOURS: int = 1
    """Hours between automatic crawls."""

    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # Logging
    LOG_LEVEL: str = "INFO"

    @property
    def database_connection_args(self) -> dict:
        """Return connection arguments for SQLite.

        Returns:
            Dict with connection arguments for SQLAlchemy create_engine.
        """
        if self.DATABASE_URL.startswith("sqlite"):
            return {"check_same_thread": False}
        return {}


# Global settings instance
settings = Settings()
