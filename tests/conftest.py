"""Shared test fixtures for idalista-tracker."""

import os
import tempfile
from pathlib import Path
from unittest import mock

import pytest


@pytest.fixture
def clean_env():
    """Fixture to provide a clean environment without config variables."""
    # List of environment variables to clear
    env_vars = [
        "SERVER_HOST", "SERVER_PORT", "SERVER_RELOAD", "SERVER_WORKERS",
        "LOG_LEVEL", "LOG_FORMAT", "LOG_JSON_FORMAT", "LOG_OUTPUT", "LOG_FILE_PATH",
        "IDEALISTA_API_KEY", "IDEALISTA_BASE_URL", "IDEALISTA_TIMEOUT", "IDEALISTA_MAX_RETRIES",
    ]

    # Save current values
    saved = {var: os.environ.get(var) for var in env_vars}

    # Clear all
    for var in env_vars:
        os.environ.pop(var, None)

    yield

    # Restore values
    for var, value in saved.items():
        if value is not None:
            os.environ[var] = value
        else:
            os.environ.pop(var, None)


@pytest.fixture
def temp_log_file():
    """Fixture to provide a temporary log file path."""
    with tempfile.TemporaryDirectory() as tmpdir:
        log_path = Path(tmpdir) / "test.log"
        yield str(log_path)


@pytest.fixture
def mock_env_file():
    """Fixture to create a temporary .env file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".env", delete=False) as f:
        f.write("# Test .env file\n")
        env_path = f.name

    yield env_path

    # Cleanup
    os.unlink(env_path)


@pytest.fixture
def temp_dir():
    """Fixture to provide a temporary directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)
