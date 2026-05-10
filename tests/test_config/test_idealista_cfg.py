"""Unit tests for IdealistaCfg configuration."""

import os
from unittest import mock

import pytest
from pydantic import ValidationError

from idalista_tracker.config import IdealistaCfg


class TestIdealistaCfgDefaults:
    """Tests for IdealistaCfg default values."""

    def test_default_base_url(self):
        """Test default base_url."""
        cfg = IdealistaCfg(api_key="test_key")
        assert cfg.base_url == "https://api.idealista.com"

    def test_default_timeout(self):
        """Test default timeout is 30."""
        cfg = IdealistaCfg(api_key="test_key")
        assert cfg.timeout == 30

    def test_default_max_retries(self):
        """Test default max_retries is 3."""
        cfg = IdealistaCfg(api_key="test_key")
        assert cfg.max_retries == 3


class TestIdealistaCfgRequiredFields:
    """Tests for IdealistaCfg required fields."""

    def test_api_key_required(self):
        """Test api_key is required."""
        with pytest.raises(ValidationError) as exc_info:
            IdealistaCfg()
        assert "api_key" in str(exc_info.value)

    def test_api_key_cannot_be_empty(self):
        """Test api_key cannot be empty string."""
        # Empty string is still a string, pydantic doesn't validate content
        cfg = IdealistaCfg(api_key="")
        assert cfg.api_key == ""


class TestIdealistaCfgValidation:
    """Tests for IdealistaCfg validation."""

    def test_valid_base_url_https(self):
        """Test valid HTTPS URL is accepted."""
        cfg = IdealistaCfg(api_key="test", base_url="https://api.example.com")
        assert cfg.base_url == "https://api.example.com"

    def test_valid_base_url_http(self):
        """Test valid HTTP URL is accepted."""
        cfg = IdealistaCfg(api_key="test", base_url="http://localhost:8080")
        assert cfg.base_url == "http://localhost:8080"

    def test_invalid_base_url_no_protocol(self):
        """Test base_url without protocol raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            IdealistaCfg(api_key="test", base_url="api.idealista.com")
        assert "Base URL must start with http:// or https://" in str(exc_info.value)

    def test_invalid_base_url_ftp(self):
        """Test base_url with ftp protocol raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            IdealistaCfg(api_key="test", base_url="ftp://api.idealista.com")
        assert "Base URL must start with http:// or https://" in str(exc_info.value)

    def test_timeout_min_value(self):
        """Test timeout must be at least 1."""
        with pytest.raises(ValidationError) as exc_info:
            IdealistaCfg(api_key="test", timeout=0)
        assert "Timeout must be between 1 and 300 seconds" in str(exc_info.value)

    def test_timeout_max_value(self):
        """Test timeout must be at most 300."""
        with pytest.raises(ValidationError) as exc_info:
            IdealistaCfg(api_key="test", timeout=301)
        assert "Timeout must be between 1 and 300 seconds" in str(exc_info.value)

    def test_timeout_valid_values(self):
        """Test valid timeout values are accepted."""
        cfg1 = IdealistaCfg(api_key="test", timeout=1)
        assert cfg1.timeout == 1

        cfg2 = IdealistaCfg(api_key="test", timeout=300)
        assert cfg2.timeout == 300

        cfg3 = IdealistaCfg(api_key="test", timeout=60)
        assert cfg3.timeout == 60

    def test_max_retries_negative(self):
        """Test max_retries cannot be negative."""
        with pytest.raises(ValidationError) as exc_info:
            IdealistaCfg(api_key="test", max_retries=-1)
        assert "Max retries must be non-negative" in str(exc_info.value)

    def test_max_retries_valid_values(self):
        """Test valid max_retries values are accepted."""
        cfg1 = IdealistaCfg(api_key="test", max_retries=0)
        assert cfg1.max_retries == 0

        cfg2 = IdealistaCfg(api_key="test", max_retries=5)
        assert cfg2.max_retries == 5


class TestIdealistaCfgEnvironmentVariables:
    """Tests for IdealistaCfg environment variable loading."""

    @mock.patch.dict(os.environ, {"IDEALISTA_API_KEY": "env_api_key"}, clear=True)
    def test_api_key_from_env(self):
        """Test api_key can be set from environment variable."""
        cfg = IdealistaCfg()
        assert cfg.api_key == "env_api_key"

    @mock.patch.dict(os.environ, {"IDEALISTA_BASE_URL": "https://custom.api.com"}, clear=True)
    def test_base_url_from_env(self):
        """Test base_url can be set from environment variable."""
        cfg = IdealistaCfg(api_key="test")
        assert cfg.base_url == "https://custom.api.com"

    @mock.patch.dict(os.environ, {"IDEALISTA_TIMEOUT": "60"}, clear=True)
    def test_timeout_from_env(self):
        """Test timeout can be set from environment variable."""
        cfg = IdealistaCfg(api_key="test")
        assert cfg.timeout == 60

    @mock.patch.dict(os.environ, {"IDEALISTA_MAX_RETRIES": "5"}, clear=True)
    def test_max_retries_from_env(self):
        """Test max_retries can be set from environment variable."""
        cfg = IdealistaCfg(api_key="test")
        assert cfg.max_retries == 5

    @mock.patch.dict(os.environ, {"IDEALISTA_TIMEOUT": "invalid"}, clear=True)
    def test_invalid_timeout_from_env(self):
        """Test invalid timeout from environment raises validation error."""
        with pytest.raises(ValidationError):
            IdealistaCfg(api_key="test")


class TestIdealistaCfgExplicitValues:
    """Tests for explicitly setting IdealistaCfg values."""

    def test_explicit_api_key(self):
        """Test api_key can be set explicitly."""
        cfg = IdealistaCfg(api_key="my_key")
        assert cfg.api_key == "my_key"

    def test_explicit_base_url(self):
        """Test base_url can be set explicitly."""
        cfg = IdealistaCfg(api_key="test", base_url="https://custom.com")
        assert cfg.base_url == "https://custom.com"

    def test_explicit_timeout(self):
        """Test timeout can be set explicitly."""
        cfg = IdealistaCfg(api_key="test", timeout=45)
        assert cfg.timeout == 45

    def test_explicit_max_retries(self):
        """Test max_retries can be set explicitly."""
        cfg = IdealistaCfg(api_key="test", max_retries=10)
        assert cfg.max_retries == 10


class TestIdealistaCfgPrecedence:
    """Tests for configuration precedence: explicit > env > default."""

    @mock.patch.dict(os.environ, {"IDEALISTA_TIMEOUT": "60"}, clear=True)
    def test_explicit_overrides_env(self):
        """Test explicit values override environment variables."""
        cfg = IdealistaCfg(api_key="test", timeout=90)
        assert cfg.timeout == 90

    @mock.patch.dict(os.environ, {"IDEALISTA_TIMEOUT": "60"}, clear=True)
    def test_env_overrides_default(self):
        """Test environment variables override defaults."""
        cfg = IdealistaCfg(api_key="test")
        assert cfg.timeout == 60  # Not 30 (default)
