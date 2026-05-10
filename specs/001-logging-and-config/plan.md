# Implementation Plan: Logging and Configuration Settings

**Branch**: `001-logging-and-config` | **Date**: 2026-05-10 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-logging-and-config/spec.md`  
**Additional Context**: Use pydantic-settings for configuration with three separate settings classes (ServerCfg, LoggerCfg, IdealistaCfg). Logger should use `logging.getLogger(__name__)` pattern with a `configure_logging()` helper function.

## Summary

Create a type-safe configuration system using `pydantic-settings` with three independent configuration classes for different concerns (server, logging, and Idealista API). Provide a standardized logging setup that can be configured via `LoggerCfg` but allows programmatic override through a helper function. The solution must be simple, validated at startup, and integrate cleanly with the existing FastAPI application.

## Technical Context

**Language/Version**: Python 3.13  
**Primary Dependencies**: pydantic-settings (already in pyproject.toml), Python standard logging  
**Storage**: N/A (configuration loaded from environment variables and .env files)  
**Testing**: pytest  
**Target Platform**: Cross-platform (Windows, Linux)  
**Project Type**: FastAPI web service  
**Performance Goals**: Configuration load time <100ms at startup  
**Constraints**: Minimal configuration complexity; no custom config parsers  
**Scale/Scope**: Single-project scope with three configuration domains

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | Use pydantic for validation and type safety; no custom parsing |
| II. Testing Standards | ✅ PASS | Unit tests for each config class; integration test for logging setup |
| III. UX Consistency | ✅ PASS | N/A (backend service, no UI) |
| IV. Performance | ✅ PASS | Config loaded once at startup; logging has minimal overhead |
| V. Simplicity | ✅ PASS | pydantic-settings is the standard solution; no custom abstractions needed |

**Constitution Check Result**: All gates pass. Proceeding with design.

## Project Structure

### Documentation (this feature)

```text
specs/001-logging-and-config/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
idalista_tracker/
├── __init__.py
├── config/
│   ├── __init__.py          # Exports: ServerCfg, LoggerCfg, IdealistaCfg
│   ├── server.py            # ServerCfg class
│   ├── logger.py            # LoggerCfg class
│   └── idealista.py         # IdealistaCfg class
├── logging.py               # configure_logging() helper (outside config/)
└── main.py                  # Updated to use config and logging

tests/
├── __init__.py
├── test_config/
│   ├── __init__.py
│   ├── test_server_cfg.py
│   ├── test_logger_cfg.py
│   └── test_idealista_cfg.py
├── test_logging.py          # Tests for configure_logging()
└── conftest.py              # Shared fixtures (mock LoggerCfg, temp .env files)
```

**Structure Decision**: Following a standard Python package structure. The `config/` directory contains only configuration classes (ServerCfg, LoggerCfg, IdealistaCfg) in separate files as required. The `configure_logging()` helper is in its own `logging.py` module at the package root level, separate from configuration. This keeps concerns separated: config defines settings, logging configures the system.

## Design Decisions

### Configuration Classes

Each configuration class inherits from `pydantic_settings.BaseSettings` and uses Pydantic v2 syntax:

1. **ServerCfg**: FastAPI server settings (host, port, reload, workers)
2. **LoggerCfg**: Logging configuration (level, format, output destination)
3. **IdealistaCfg**: Idealista API credentials and settings (API key, base URL, timeout)

All classes:
- Use `SettingsConfigDict(env_prefix=...)` to namespace environment variables
- Provide sensible defaults for development
- Validate required fields at instantiation

### Logging Setup

The `configure_logging()` helper:
- Accepts optional parameters, all defaulting to `None`
- When a parameter is `None`, uses the value from `LoggerCfg()` instance
- Configures Python's standard `logging` module (dictConfig style)
- Returns nothing; modifies global logging state
- Safe to call multiple times (idempotent)

Usage pattern:
```python
import logging
from idalista_tracker.logging import configure_logging

configure_logging()  # Uses LoggerCfg defaults
logger = logging.getLogger(__name__)
logger.info("Application started")
```

## Complexity Tracking

No complexity violations. All gates pass without justification needed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
