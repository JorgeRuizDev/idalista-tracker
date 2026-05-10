"""Unit tests for ServerCfg configuration."""

import os
from unittest import mock

import pytest
from pydantic import ValidationError

from idalista_tracker.config import ServerCfg


class TestServerCfgDefaults:
    """Tests for ServerCfg default values."""

    def test_default_host(self):
        """Test default host is 127.0.0.1."""
        cfg = ServerCfg()
        assert cfg.host == "127.0.0.1"

    def test_default_port(self):
        """Test default port is 8000."""
        cfg = ServerCfg()
        assert cfg.port == 8000

    def test_default_reload(self):
        """Test default reload is False."""
        cfg = ServerCfg()
        assert cfg.reload is False

    def test_default_workers(self):
        """Test default workers is 1."""
        cfg = ServerCfg()
        assert cfg.workers == 1


class TestServerCfgValidation:
    """Tests for ServerCfg validation."""

    def test_port_min_value(self):
        """Test port must be at least 1."""
        with pytest.raises(ValidationError) as exc_info:
            ServerCfg(port=0)
        assert "Port must be between 1 and 65535" in str(exc_info.value)

    def test_port_max_value(self):
        """Test port must be at most 65535."""
        with pytest.raises(ValidationError) as exc_info:
            ServerCfg(port=65536)
        assert "Port must be between 1 and 65535" in str(exc_info.value)

    def test_port_valid_values(self):
        """Test valid port values are accepted."""
        cfg1 = ServerCfg(port=1)
        assert cfg1.port == 1

        cfg2 = ServerCfg(port=65535)
        assert cfg2.port == 65535

        cfg3 = ServerCfg(port=8080)
        assert cfg3.port == 8080

    def test_workers_min_value(self):
        """Test workers must be at least 1."""
        with pytest.raises(ValidationError) as exc_info:
            ServerCfg(workers=0)
        assert "Workers must be at least 1" in str(exc_info.value)

    def test_workers_negative_value(self):
        """Test workers cannot be negative."""
        with pytest.raises(ValidationError) as exc_info:
            ServerCfg(workers=-1)
        assert "Workers must be at least 1" in str(exc_info.value)

    def test_workers_valid_values(self):
        """Test valid workers values are accepted."""
        cfg1 = ServerCfg(workers=1)
        assert cfg1.workers == 1

        cfg2 = ServerCfg(workers=4)
        assert cfg2.workers == 4


class TestServerCfgEnvironmentVariables:
    """Tests for ServerCfg environment variable loading."""

    @mock.patch.dict(os.environ, {"SERVER_HOST": "0.0.0.0"}, clear=True)
    def test_host_from_env(self):
        """Test host can be set from environment variable."""
        cfg = ServerCfg()
        assert cfg.host == "0.0.0.0"

    @mock.patch.dict(os.environ, {"SERVER_PORT": "9000"}, clear=True)
    def test_port_from_env(self):
        """Test port can be set from environment variable."""
        cfg = ServerCfg()
        assert cfg.port == 9000

    @mock.patch.dict(os.environ, {"SERVER_RELOAD": "true"}, clear=True)
    def test_reload_from_env(self):
        """Test reload can be set from environment variable."""
        cfg = ServerCfg()
        assert cfg.reload is True

    @mock.patch.dict(os.environ, {"SERVER_WORKERS": "4"}, clear=True)
    def test_workers_from_env(self):
        """Test workers can be set from environment variable."""
        cfg = ServerCfg()
        assert cfg.workers == 4

    @mock.patch.dict(os.environ, {"SERVER_PORT": "invalid"}, clear=True)
    def test_invalid_port_from_env(self):
        """Test invalid port from environment raises validation error."""
        with pytest.raises(ValidationError):
            ServerCfg()


class TestServerCfgExplicitValues:
    """Tests for explicitly setting ServerCfg values."""

    def test_explicit_host(self):
        """Test host can be set explicitly."""
        cfg = ServerCfg(host="0.0.0.0")
        assert cfg.host == "0.0.0.0"

    def test_explicit_port(self):
        """Test port can be set explicitly."""
        cfg = ServerCfg(port=3000)
        assert cfg.port == 3000

    def test_explicit_reload(self):
        """Test reload can be set explicitly."""
        cfg = ServerCfg(reload=True)
        assert cfg.reload is True

    def test_explicit_workers(self):
        """Test workers can be set explicitly."""
        cfg = ServerCfg(workers=8)
        assert cfg.workers == 8


class TestServerCfgPrecedence:
    """Tests for configuration precedence: explicit > env > default."""

    @mock.patch.dict(os.environ, {"SERVER_PORT": "9000"}, clear=True)
    def test_explicit_overrides_env(self):
        """Test explicit values override environment variables."""
        cfg = ServerCfg(port=3000)
        assert cfg.port == 3000

    @mock.patch.dict(os.environ, {"SERVER_PORT": "9000"}, clear=True)
    def test_env_overrides_default(self):
        """Test environment variables override defaults."""
        cfg = ServerCfg()
        assert cfg.port == 9000  # Not 8000 (default)
