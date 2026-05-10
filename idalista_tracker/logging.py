"""Logging configuration helper for idalista-tracker."""

import logging
import logging.config
import sys
from pathlib import Path
from typing import Any

from idalista_tracker.config.logger import LoggerCfg


def configure_logging(
    level: str | None = None,
    format: str | None = None,  # noqa: A002
    json_format: bool | None = None,
    output: str | None = None,
    file_path: str | None = None,
) -> None:
    """Configure Python logging.

    All parameters default to None. When a parameter is None, the value
    from LoggerCfg() is used. This allows calling configure_logging()
    with no arguments to use environment-based configuration, while
    still allowing programmatic override.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL).
            Defaults to LoggerCfg().level.
        format: Log format string. Defaults to LoggerCfg().format.
        json_format: Whether to use JSON formatting. Defaults to LoggerCfg().json_format.
        output: Output destination ('stdout', 'stderr', 'file').
            Defaults to LoggerCfg().output.
        file_path: Path for file output. Defaults to LoggerCfg().file_path.

    Returns:
        None

    Example:
        >>> from idalista_tracker.logging import configure_logging
        >>> configure_logging()  # Use LoggerCfg defaults
        >>> configure_logging(level="DEBUG")  # Override just level

    """
    cfg = LoggerCfg()

    # Use provided values or fall back to config values
    effective_level = level if level is not None else cfg.level
    effective_format = format if format is not None else cfg.format
    effective_json_format = json_format if json_format is not None else cfg.json_format
    effective_output = output if output is not None else cfg.output
    effective_file_path = file_path if file_path is not None else cfg.file_path

    # Build formatter configuration
    formatter_config: dict[str, Any]
    if effective_json_format:
        formatter_config = {
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "fmt": effective_format,
            }
        }
        formatter_name = "json"
    else:
        formatter_config = {
            "standard": {
                "format": effective_format,
            }
        }
        formatter_name = "standard"

    # Build handler configuration based on output destination
    handler_config: dict[str, Any]
    handlers: list[str]

    try:
        if effective_output == "stdout":
            handler_config = {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": effective_level,
                    "formatter": formatter_name,
                    "stream": "ext://sys.stdout",
                }
            }
            handlers = ["console"]
        elif effective_output == "stderr":
            handler_config = {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": effective_level,
                    "formatter": formatter_name,
                    "stream": "ext://sys.stderr",
                }
            }
            handlers = ["console"]
        elif effective_output == "file":
            # Ensure log directory exists
            log_path = Path(effective_file_path)
            try:
                log_path.parent.mkdir(parents=True, exist_ok=True)
            except OSError as e:
                # Log to stderr about the error, then fall back to stdout
                print(f"Warning: Could not create log directory {log_path.parent}: {e}", file=sys.stderr)
                print("Falling back to stdout logging", file=sys.stderr)
                handler_config = {
                    "console": {
                        "class": "logging.StreamHandler",
                        "level": effective_level,
                        "formatter": formatter_name,
                        "stream": "ext://sys.stdout",
                    }
                }
                handlers = ["console"]
            else:
                handler_config = {
                    "file": {
                        "class": "logging.handlers.RotatingFileHandler",
                        "level": effective_level,
                        "formatter": formatter_name,
                        "filename": str(log_path),
                        "maxBytes": 10485760,  # 10MB
                        "backupCount": 5,
                    }
                }
                handlers = ["file"]
        else:
            # Unknown output, fallback to stdout
            handler_config = {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": effective_level,
                    "formatter": formatter_name,
                    "stream": "ext://sys.stdout",
                }
            }
            handlers = ["console"]
    except Exception as e:  # noqa: BLE001
        # Handle any unexpected errors gracefully
        print(f"Warning: Error configuring logging: {e}", file=sys.stderr)
        print("Falling back to basic stdout logging", file=sys.stderr)
        handler_config = {
            "console": {
                "class": "logging.StreamHandler",
                "level": "INFO",
                "formatter": "standard",
                "stream": "ext://sys.stdout",
            }
        }
        handlers = ["console"]
        formatter_config = {
            "standard": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            }
        }

    # Build logging configuration
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": formatter_config,
        "handlers": handler_config,
        "root": {
            "level": effective_level,
            "handlers": handlers,
        },
    }

    # Close existing handlers before applying new configuration
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:  # Copy list to avoid modification during iteration
        handler.close()
        root_logger.removeHandler(handler)

    # Apply configuration
    logging.config.dictConfig(logging_config)

    # Log the configuration
    logger = logging.getLogger(__name__)
    logger.debug(f"Logging configured: level={effective_level}, output={effective_output}")
