"""Server configuration settings."""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class ServerCfg(BaseSettings):
    """Server configuration settings for the FastAPI application."""

    model_config = SettingsConfigDict(
        env_prefix="SERVER_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = Field(default="127.0.0.1", description="Host address to bind the server to.")
    port: int = Field(default=8000, description="Port number to listen on.")
    reload: bool = Field(default=False, description="Enable auto-reload on code changes (development only).")
    workers: int = Field(default=1, description="Number of worker processes.")

    @field_validator("port")
    @classmethod
    def validate_port(cls, v: int) -> int:
        """Validate port is in valid range."""
        if not 1 <= v <= 65535:
            raise ValueError(f"Port must be between 1 and 65535, got {v}")
        return v

    @field_validator("workers")
    @classmethod
    def validate_workers(cls, v: int) -> int:
        """Validate workers is a positive integer."""
        if v < 1:
            raise ValueError(f"Workers must be at least 1, got {v}")
        return v
