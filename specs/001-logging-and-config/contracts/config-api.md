# Contract: Configuration API

**Feature**: Logging and Configuration Settings  
**Date**: 2026-05-10

## Module: idalista_tracker.config

### Classes

#### `ServerCfg`

Configuration for the HTTP server.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class ServerCfg(BaseSettings):
    """Server configuration settings."""
    
    model_config = SettingsConfigDict(
        env_prefix="SERVER_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    host: str = "127.0.0.1"
    """Host address to bind the server to."""
    
    port: int = 8000
    """Port number to listen on."""
    
    reload: bool = False
    """Enable auto-reload on code changes (development only)."""
    
    workers: int = 1
    """Number of worker processes."""
```

**Usage**:
```python
from idalista_tracker.config import ServerCfg

cfg = ServerCfg()
print(f"Starting server on {cfg.host}:{cfg.port}")
```

#### `LoggerCfg`

Configuration for logging.

```python
class LoggerCfg(BaseSettings):
    """Logging configuration settings."""
    
    model_config = SettingsConfigDict(
        env_prefix="LOG_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    level: str = "INFO"
    """Default logging level. One of: DEBUG, INFO, WARNING, ERROR, CRITICAL."""
    
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    """Log message format string."""
    
    json_format: bool = False
    """Output logs as JSON instead of plain text."""
    
    output: str = "stdout"
    """Output destination: 'stdout', 'stderr', or 'file'."""
    
    file_path: str = "logs/app.log"
    """Log file path (only used when output='file')."""
```

**Usage**:
```python
from idalista_tracker.config import LoggerCfg

cfg = LoggerCfg()
print(f"Log level: {cfg.level}")
```

#### `IdealistaCfg`

Configuration for the Idealista API.

```python
class IdealistaCfg(BaseSettings):
    """Idealista API configuration settings."""
    
    model_config = SettingsConfigDict(
        env_prefix="IDEALISTA_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    api_key: str
    """API key for Idealista (required)."""
    
    base_url: str = "https://api.idealista.com"
    """Base URL for the Idealista API."""
    
    timeout: int = 30
    """Request timeout in seconds."""
    
    max_retries: int = 3
    """Maximum number of retries for failed requests."""
```

**Usage**:
```python
from idalista_tracker.config import IdealistaCfg

cfg = IdealistaCfg()  # Raises ValidationError if IDEALISTA_API_KEY not set
print(f"API base URL: {cfg.base_url}")
```

## Module: idalista_tracker.logging

### Functions

#### `configure_logging()`

Configure Python's logging system using `LoggerCfg` values.

```python
from idalista_tracker.config import LoggerCfg

def configure_logging(
    level: str | None = None,
    format: str | None = None,
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
```

**Usage**:
```python
import logging
from idalista_tracker.logging import configure_logging

# Configure with defaults from LoggerCfg
configure_logging()

# Or override specific values
configure_logging(level="DEBUG", json_format=True)

# Get logger using standard Python pattern
logger = logging.getLogger(__name__)
logger.info("Application started")
```

## Environment Variables

| Variable | Class | Default | Description |
|----------|-------|---------|-------------|
| SERVER_HOST | ServerCfg | 127.0.0.1 | Server bind address |
| SERVER_PORT | ServerCfg | 8000 | Server port |
| SERVER_RELOAD | ServerCfg | False | Enable auto-reload |
| SERVER_WORKERS | ServerCfg | 1 | Number of workers |
| LOG_LEVEL | LoggerCfg | INFO | Logging level |
| LOG_FORMAT | LoggerCfg | %(asctime)s - %(name)s - %(levelname)s - %(message)s | Log format |
| LOG_JSON_FORMAT | LoggerCfg | False | Use JSON output |
| LOG_OUTPUT | LoggerCfg | stdout | Output destination |
| LOG_FILE_PATH | LoggerCfg | logs/app.log | Log file path |
| IDEALISTA_API_KEY | IdealistaCfg | (required) | Idealista API key |
| IDEALISTA_BASE_URL | IdealistaCfg | https://api.idealista.com | API base URL |
| IDEALISTA_TIMEOUT | IdealistaCfg | 30 | Request timeout |
| IDEALISTA_MAX_RETRIES | IdealistaCfg | 3 | Max retries |

## Error Handling

All configuration classes raise `pydantic.ValidationError` on invalid input:

```python
from pydantic import ValidationError
from idalista_tracker.config import IdealistaCfg

try:
    cfg = IdealistaCfg()  # Missing required API key
except ValidationError as e:
    print(e)
    # 1 validation error for IdealistaCfg
    # api_key
    #   Field required [type=missing, input_value={}, input_type=dict]
```
