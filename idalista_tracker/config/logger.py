"""Logger configuration settings."""

import logging
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class LoggerCfg(BaseSettings):
    """Logging configuration settings."""

    model_config = SettingsConfigDict(
        env_prefix="LOG_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    level: str = Field(default="INFO", description="Default logging level. One of: DEBUG, INFO, WARNING, ERROR, CRITICAL.")
    format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Log message format string.",
    )
    json_format: bool = Field(default=False, description="Output logs as JSON instead of plain text.")
    output: Literal["stdout", "stderr", "file"] = Field(default="stdout", description="Output destination: 'stdout', 'stderr', or 'file'.")
    file_path: str = Field(default="logs/app.log", description="Log file path (only used when output='file').")

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        """Validate that level is a valid Python logging level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in valid_levels:
            raise ValueError(f"Invalid log level '{v}'. Must be one of: {', '.join(valid_levels)}")
        return v_upper

    @field_validator("output")
    @classmethod
    def validate_output(cls, v: str) -> str:
        """Validate output destination."""
        valid_outputs = ["stdout", "stderr", "file"]
        if v not in valid_outputs:
            raise ValueError(f"Invalid output '{v}'. Must be one of: {', '.join(valid_outputs)}")
        return v

    def get_logging_level(self) -> int:
        """Get the Python logging level constant."""
        return getattr(logging, self.level)
