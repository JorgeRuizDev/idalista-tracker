"""Unit tests for LoggerCfg configuration."""

import os
from unittest import mock

import pytest
from pydantic import ValidationError

from idalista_tracker.config import LoggerCfg


class TestLoggerCfgDefaults:
    """Tests for LoggerCfg default values."""

    def test_default_level(self):
        """Test default level is INFO."""
        cfg = LoggerCfg()
        assert cfg.level == "INFO"

    def test_default_format(self):
        """Test default format string."""
        cfg = LoggerCfg()
        expected = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        assert cfg.format == expected

    def test_default_json_format(self):
        """Test default json_format is False."""
        cfg = LoggerCfg()
        assert cfg.json_format is False

    def test_default_output(self):
        """Test default output is stdout."""
        cfg = LoggerCfg()
        assert cfg.output == "stdout"

    def test_default_file_path(self):
        """Test default file_path."""
        cfg = LoggerCfg()
        assert cfg.file_path == "logs/app.log"


class TestLoggerCfgValidation:
    """Tests for LoggerCfg validation."""

    def test_valid_levels(self):
        """Test valid log levels are accepted."""
        for level in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            cfg = LoggerCfg(level=level)
            assert cfg.level == level

    def test_valid_levels_case_insensitive(self):
        """Test log levels are case-insensitive."""
        cfg1 = LoggerCfg(level="debug")
        assert cfg1.level == "DEBUG"

        cfg2 = LoggerCfg(level="Info")
        assert cfg2.level == "INFO"

    def test_invalid_level(self):
        """Test invalid log level raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            LoggerCfg(level="INVALID")
        assert "Invalid log level" in str(exc_info.value)

    def test_valid_outputs(self):
        """Test valid output destinations are accepted."""
        for output in ["stdout", "stderr", "file"]:
            cfg = LoggerCfg(output=output)
            assert cfg.output == output

    def test_invalid_output(self):
        """Test invalid output destination raises validation error."""
        with pytest.raises(ValidationError) as exc_info:
            LoggerCfg(output="database")
        assert "stdout" in str(exc_info.value) and "stderr" in str(exc_info.value)


class TestLoggerCfgGetLoggingLevel:
    """Tests for get_logging_level method."""

    def test_get_logging_level_debug(self):
        """Test get_logging_level returns correct constant for DEBUG."""
        import logging

        cfg = LoggerCfg(level="DEBUG")
        assert cfg.get_logging_level() == logging.DEBUG

    def test_get_logging_level_info(self):
        """Test get_logging_level returns correct constant for INFO."""
        import logging

        cfg = LoggerCfg(level="INFO")
        assert cfg.get_logging_level() == logging.INFO

    def test_get_logging_level_warning(self):
        """Test get_logging_level returns correct constant for WARNING."""
        import logging

        cfg = LoggerCfg(level="WARNING")
        assert cfg.get_logging_level() == logging.WARNING

    def test_get_logging_level_error(self):
        """Test get_logging_level returns correct constant for ERROR."""
        import logging

        cfg = LoggerCfg(level="ERROR")
        assert cfg.get_logging_level() == logging.ERROR

    def test_get_logging_level_critical(self):
        """Test get_logging_level returns correct constant for CRITICAL."""
        import logging

        cfg = LoggerCfg(level="CRITICAL")
        assert cfg.get_logging_level() == logging.CRITICAL


class TestLoggerCfgEnvironmentVariables:
    """Tests for LoggerCfg environment variable loading."""

    @mock.patch.dict(os.environ, {"LOG_LEVEL": "DEBUG"}, clear=True)
    def test_level_from_env(self):
        """Test level can be set from environment variable."""
        cfg = LoggerCfg()
        assert cfg.level == "DEBUG"

    @mock.patch.dict(os.environ, {"LOG_FORMAT": "%(message)s"}, clear=True)
    def test_format_from_env(self):
        """Test format can be set from environment variable."""
        cfg = LoggerCfg()
        assert cfg.format == "%(message)s"

    @mock.patch.dict(os.environ, {"LOG_JSON_FORMAT": "true"}, clear=True)
    def test_json_format_from_env(self):
        """Test json_format can be set from environment variable."""
        cfg = LoggerCfg()
        assert cfg.json_format is True

    @mock.patch.dict(os.environ, {"LOG_OUTPUT": "stderr"}, clear=True)
    def test_output_from_env(self):
        """Test output can be set from environment variable."""
        cfg = LoggerCfg()
        assert cfg.output == "stderr"

    @mock.patch.dict(os.environ, {"LOG_FILE_PATH": "/var/log/app.log"}, clear=True)
    def test_file_path_from_env(self):
        """Test file_path can be set from environment variable."""
        cfg = LoggerCfg()
        assert cfg.file_path == "/var/log/app.log"

    @mock.patch.dict(os.environ, {"LOG_LEVEL": "INVALID"}, clear=True)
    def test_invalid_level_from_env(self):
        """Test invalid level from environment raises validation error."""
        with pytest.raises(ValidationError):
            LoggerCfg()


class TestLoggerCfgExplicitValues:
    """Tests for explicitly setting LoggerCfg values."""

    def test_explicit_level(self):
        """Test level can be set explicitly."""
        cfg = LoggerCfg(level="ERROR")
        assert cfg.level == "ERROR"

    def test_explicit_format(self):
        """Test format can be set explicitly."""
        cfg = LoggerCfg(format="%(name)s: %(message)s")
        assert cfg.format == "%(name)s: %(message)s"

    def test_explicit_json_format(self):
        """Test json_format can be set explicitly."""
        cfg = LoggerCfg(json_format=True)
        assert cfg.json_format is True

    def test_explicit_output(self):
        """Test output can be set explicitly."""
        cfg = LoggerCfg(output="file")
        assert cfg.output == "file"

    def test_explicit_file_path(self):
        """Test file_path can be set explicitly."""
        cfg = LoggerCfg(file_path="/custom/path.log")
        assert cfg.file_path == "/custom/path.log"
