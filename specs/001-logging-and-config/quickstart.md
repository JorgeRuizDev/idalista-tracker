# Quickstart: Logging and Configuration

**Feature**: Logging and Configuration Settings  
**Date**: 2026-05-10

## Installation

The required dependencies are already in `pyproject.toml`:

```bash
# If needed, ensure dependencies are installed
pip install -e .
```

## Basic Usage

### 1. Configuration

Create a `.env` file in your project root:

```bash
# Server settings
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# Logging settings
LOG_LEVEL=INFO
LOG_JSON_FORMAT=false

# Idealista API settings (required)
IDEALISTA_API_KEY=your_api_key_here
```

### 2. Using Configuration Classes

```python
from idalista_tracker.config import ServerCfg, LoggerCfg, IdealistaCfg

# Load configuration from environment/.env
server_cfg = ServerCfg()
logger_cfg = LoggerCfg()
idealista_cfg = IdealistaCfg()

print(f"Server: {server_cfg.host}:{server_cfg.port}")
print(f"Log level: {logger_cfg.level}")
print(f"Idealista API: {idealista_cfg.base_url}")
```

### 3. Setting Up Logging

```python
import logging
from idalista_tracker.logging import configure_logging

# Configure logging using LoggerCfg values
configure_logging()

# Get logger using standard pattern
logger = logging.getLogger(__name__)

# Use the logger
logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
```

### 4. Programmatic Override

You can override configuration values when calling `configure_logging()`:

```python
from idalista_tracker.logging import configure_logging

# Use defaults from environment, but override level
configure_logging(level="DEBUG")

# Or override multiple settings
configure_logging(
    level="DEBUG",
    json_format=True,
    output="file",
    file_path="/var/log/myapp.log"
)
```

### 5. Integration with FastAPI

Update `main.py` to use the configuration:

```python
import logging
import uvicorn
from fastapi import FastAPI

from idalista_tracker.config import ServerCfg
from idalista_tracker.logging import configure_logging

# Configure logging first
configure_logging()
logger = logging.getLogger(__name__)

# Load server config
server_cfg = ServerCfg()

# Create FastAPI app
app = FastAPI()

@app.get("/")
def read_root():
    logger.info("Root endpoint called")
    return {"message": "Hello World"}

if __name__ == "__main__":
    logger.info(f"Starting server on {server_cfg.host}:{server_cfg.port}")
    uvicorn.run(
        "main:app",
        host=server_cfg.host,
        port=server_cfg.port,
        reload=server_cfg.reload,
        workers=server_cfg.workers if not server_cfg.reload else 1,
    )
```

## Environment Variables Reference

### Server Settings (SERVER_*)

| Variable | Default | Description |
|----------|---------|-------------|
| SERVER_HOST | 127.0.0.1 | Host address to bind |
| SERVER_PORT | 8000 | Port to listen on |
| SERVER_RELOAD | False | Enable auto-reload (dev) |
| SERVER_WORKERS | 1 | Number of worker processes |

### Logging Settings (LOG_*)

| Variable | Default | Description |
|----------|---------|-------------|
| LOG_LEVEL | INFO | Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL) |
| LOG_FORMAT | %(asctime)s - %(name)s - %(levelname)s - %(message)s | Log format string |
| LOG_JSON_FORMAT | False | Output as JSON |
| LOG_OUTPUT | stdout | Destination: stdout, stderr, file |
| LOG_FILE_PATH | logs/app.log | File path when output=file |

### Idealista Settings (IDEALISTA_*)

| Variable | Default | Description |
|----------|---------|-------------|
| IDEALISTA_API_KEY | (required) | Your Idealista API key |
| IDEALISTA_BASE_URL | https://api.idealista.com | API base URL |
| IDEALISTA_TIMEOUT | 30 | Request timeout in seconds |
| IDEALISTA_MAX_RETRIES | 3 | Max retry attempts |

## Testing

Run the test suite:

```bash
pytest tests/test_config/ tests/test_logging.py -v
```

## Common Patterns

### Per-Module Logger

```python
# In any module
import logging

logger = logging.getLogger(__name__)

def my_function():
    logger.debug("Function called")
```

### Conditional Configuration

```python
from idalista_tracker.config import LoggerCfg
from idalista_tracker.logging import configure_logging

# Different logging for different environments
cfg = LoggerCfg()

if cfg.level == "DEBUG":
    print("Debug mode enabled")

configure_logging()
```

### Handling Missing API Key

```python
from pydantic import ValidationError
from idalista_tracker.config import IdealistaCfg

try:
    idealista_cfg = IdealistaCfg()
except ValidationError as e:
    print("Missing required configuration!")
    print("Please set IDEALISTA_API_KEY environment variable")
    raise SystemExit(1)
```
