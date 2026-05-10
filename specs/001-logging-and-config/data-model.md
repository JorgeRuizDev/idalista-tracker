# Data Model: Configuration Settings

**Feature**: Logging and Configuration Settings  
**Date**: 2026-05-10

## Entity: ServerCfg

Configuration for the FastAPI HTTP server.

| Field | Type | Default | Environment Var | Validation |
|-------|------|---------|-----------------|------------|
| host | str | "127.0.0.1" | SERVER_HOST | IPv4 or IPv6 address |
| port | int | 8000 | SERVER_PORT | 1-65535 |
| reload | bool | False | SERVER_RELOAD | - |
| workers | int | 1 | SERVER_WORKERS | >= 1 |

**Pydantic Model**:
```python
class ServerCfg(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SERVER_")
    
    host: str = "127.0.0.1"
    port: int = 8000
    reload: bool = False
    workers: int = 1
```

## Entity: LoggerCfg

Configuration for application logging.

| Field | Type | Default | Environment Var | Validation |
|-------|------|---------|-----------------|------------|
| level | str | "INFO" | LOG_LEVEL | One of DEBUG, INFO, WARNING, ERROR, CRITICAL |
| format | str | "%(asctime)s - %(name)s - %(levelname)s - %(message)s" | LOG_FORMAT | Any valid format string |
| json_format | bool | False | LOG_JSON_FORMAT | - |
| output | str | "stdout" | LOG_OUTPUT | One of stdout, stderr, file |
| file_path | str | "logs/app.log" | LOG_FILE_PATH | Valid path when output=file |

**Pydantic Model**:
```python
class LoggerCfg(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="LOG_")
    
    level: str = "INFO"
    format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    json_format: bool = False
    output: str = "stdout"
    file_path: str = "logs/app.log"
```

## Entity: IdealistaCfg

Configuration for the Idealista API integration.

| Field | Type | Default | Environment Var | Validation |
|-------|------|---------|-----------------|------------|
| api_key | str | - | IDEALISTA_API_KEY | Required, non-empty |
| base_url | str | "https://api.idealista.com" | IDEALISTA_BASE_URL | Valid URL |
| timeout | int | 30 | IDEALISTA_TIMEOUT | 1-300 seconds |
| max_retries | int | 3 | IDEALISTA_MAX_RETRIES | >= 0 |

**Pydantic Model**:
```python
class IdealistaCfg(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="IDEALISTA_")
    
    api_key: str  # Required, no default
    base_url: str = "https://api.idealista.com"
    timeout: int = 30
    max_retries: int = 3
```

## Relationships

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  ServerCfg  │     │  LoggerCfg  │     │  IdealistaCfg   │
├─────────────┤     ├─────────────┤     ├─────────────────┤
│ host: str   │     │ level: str  │     │ api_key: str    │
│ port: int   │     │ format: str │     │ base_url: str   │
│ reload: bool│     │ json: bool  │     │ timeout: int    │
│ workers: int│     │ output: str │     │ max_retries: int│
└─────────────┘     │ file: str   │     └─────────────────┘
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │configure_   │
                    │logging()    │
                    └─────────────┘
```

- **ServerCfg**: Used by the application entry point to start FastAPI
- **LoggerCfg**: Used by `configure_logging()` to set up Python logging
- **IdealistaCfg**: Used by Idealista API client module

## Validation Rules

### ServerCfg
- `port` must be in valid port range (1-65535)
- `workers` must be positive integer

### LoggerCfg
- `level` must be a valid Python logging level name
- `output` must be one of: "stdout", "stderr", "file"
- If `output` is "file", `file_path` must be writable

### IdealistaCfg
- `api_key` is required (raises ValidationError if missing)
- `timeout` must be between 1 and 300 seconds
- `base_url` must be a valid HTTP/HTTPS URL

## Configuration Precedence

1. Constructor arguments (highest)
2. Environment variables
3. .env file
4. Default values (lowest)

Example:
```python
# 1. Explicit value
cfg = ServerCfg(port=9000)

# 2. Environment variable
export SERVER_PORT=9000
cfg = ServerCfg()

# 3. .env file
echo "SERVER_PORT=9000" > .env
cfg = ServerCfg()

# 4. Default
cfg = ServerCfg()  # port=8000
```
