"""Idealista API configuration settings."""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class IdealistaCfg(BaseSettings):
    """Idealista API configuration settings."""

    model_config = SettingsConfigDict(
        env_prefix="IDEALISTA_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_key: str = Field(description="API key for Idealista (required).")
    base_url: str = Field(default="https://api.idealista.com", description="Base URL for the Idealista API.")
    timeout: int = Field(default=30, description="Request timeout in seconds.")
    max_retries: int = Field(default=3, description="Maximum number of retries for failed requests.")

    @field_validator("base_url")
    @classmethod
    def validate_base_url(cls, v: str) -> str:
        """Validate base_url is a valid HTTP/HTTPS URL."""
        if not v.startswith(("http://", "https://")):
            raise ValueError(f"Base URL must start with http:// or https://, got: {v}")
        return v

    @field_validator("timeout")
    @classmethod
    def validate_timeout(cls, v: int) -> int:
        """Validate timeout is within valid range."""
        if not 1 <= v <= 300:
            raise ValueError(f"Timeout must be between 1 and 300 seconds, got {v}")
        return v

    @field_validator("max_retries")
    @classmethod
    def validate_max_retries(cls, v: int) -> int:
        """Validate max_retries is non-negative."""
        if v < 0:
            raise ValueError(f"Max retries must be non-negative, got {v}")
        return v
