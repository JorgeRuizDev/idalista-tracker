# Research: Logging and Configuration Settings

**Feature**: Logging and Configuration Settings  
**Date**: 2026-05-10

## Research Questions Answered

### 1. Configuration Management Approach

**Question**: What is the best way to handle configuration in a modern Python application?

**Decision**: Use `pydantic-settings` (BaseSettings) with environment variable support.

**Rationale**:
- Already installed in the project (pyproject.toml shows `pydantic-settings>=2.14.1`)
- Type-safe validation at startup prevents runtime errors
- Automatic .env file support for local development
- Clear env_prefix pattern for namespacing variables
- Standard in FastAPI ecosystem

**Alternatives Considered**:
- `python-decouple`: Simpler but less type-safe
- `dynaconf`: More features than needed, additional learning curve
- Custom dataclasses with os.environ: More code to maintain, no validation

### 2. Multiple Config Classes vs. Single Config

**Question**: Should configuration be one large class or multiple focused classes?

**Decision**: Three separate classes as specified: `ServerCfg`, `LoggerCfg`, `IdealistaCfg`.

**Rationale**:
- Separation of concerns: server, logging, and API credentials are unrelated domains
- Each can be instantiated independently where needed
- Environment variable prefixes keep them organized (SERVER_*, LOG_*, IDEALISTA_*)
- Easier to test and mock individual configs

**Alternative Rejected**: Single monolithic config class would couple unrelated settings and make testing harder.

### 3. Python Logging Configuration Pattern

**Question**: What is the best pattern for configuring Python's standard logging library?

**Decision**: Use `logging.config.dictConfig()` with a helper function that accepts overrides.

**Rationale**:
- Standard library approach, no external dependencies
- dictConfig is the modern recommended way (fileConfig is legacy)
- Allows runtime reconfiguration (hot-reload support in future)
- Programmatic control over all logging aspects

**Configuration Schema**:
```python
{
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {...},
    "handlers": {...},
    "root": {...}
}
```

### 4. Logger Access Pattern

**Question**: How should modules access loggers?

**Decision**: Standard Python pattern: `logging.getLogger(__name__)`

**Rationale**:
- Universal Python best practice
- Hierarchical logger names match module structure
- Allows fine-grained control per module
- No dependency injection needed

**Usage**:
```python
import logging
logger = logging.getLogger(__name__)
```

### 5. configure_logging() Function Design

**Question**: How should the helper function balance defaults vs. overrides?

**Decision**: All parameters default to `None`, function uses `LoggerCfg()` values when not provided.

**Rationale**:
- Provides a clean API: `configure_logging()` works with zero arguments
- Still allows programmatic override when needed: `configure_logging(level="DEBUG")`
- Follows the principle of "sensible defaults, full control when needed"

**Function Signature**:
```python
def configure_logging(
    level: str | None = None,
    format: str | None = None,
    # ... other params
) -> None:
    cfg = LoggerCfg()
    effective_level = level if level is not None else cfg.level
    # ...
```

## Technology Choices Summary

| Component | Choice | Version/Notes |
|-----------|--------|---------------|
| Configuration | pydantic-settings | ^2.14.1 (already installed) |
| Logging | Python stdlib logging | Part of Python 3.13 |
| Config Format | Environment variables + .env | Via pydantic-settings |
| Validation | Pydantic v2 | Validates on instantiation |

## No [NEEDS CLARIFICATION] Remaining

All technical decisions have been made based on:
1. User requirements (three separate config classes)
2. Existing project dependencies (pydantic-settings already installed)
3. Python best practices (standard logging patterns)
4. Constitution principles (simplicity, code quality)
