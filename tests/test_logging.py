"""Unit tests for logging configuration."""

import logging
import os
import tempfile
from pathlib import Path
from unittest import mock

import pytest

from idalista_tracker.config import LoggerCfg
from idalista_tracker.logging import configure_logging


class TestConfigureLoggingDefaults:
    """Tests for configure_logging with defaults."""

    def test_configure_logging_with_no_args(self):
        """Test configure_logging works with no arguments."""
        configure_logging()
        logger = logging.getLogger("test")
        assert logger.isEnabledFor(logging.INFO)

    def test_configure_logging_uses_logger_cfg_defaults(self):
        """Test configure_logging uses LoggerCfg defaults."""
        with mock.patch("idalista_tracker.logging.LoggerCfg") as mock_cfg:
            mock_cfg.return_value = LoggerCfg(level="DEBUG", output="stdout")
            configure_logging()
            mock_cfg.assert_called_once()


class TestConfigureLoggingLevel:
    """Tests for configure_logging level parameter."""

    def test_configure_logging_level_debug(self):
        """Test configure_logging with DEBUG level."""
        configure_logging(level="DEBUG")
        logger = logging.getLogger("test_debug")
        assert logger.isEnabledFor(logging.DEBUG)
        assert logger.isEnabledFor(logging.INFO)

    def test_configure_logging_level_info(self):
        """Test configure_logging with INFO level."""
        configure_logging(level="INFO")
        logger = logging.getLogger("test_info")
        assert not logger.isEnabledFor(logging.DEBUG)
        assert logger.isEnabledFor(logging.INFO)

    def test_configure_logging_level_warning(self):
        """Test configure_logging with WARNING level."""
        configure_logging(level="WARNING")
        logger = logging.getLogger("test_warning")
        assert not logger.isEnabledFor(logging.INFO)
        assert logger.isEnabledFor(logging.WARNING)

    def test_level_parameter_overrides_config(self):
        """Test explicit level parameter overrides LoggerCfg."""
        with mock.patch("idalista_tracker.logging.LoggerCfg") as mock_cfg:
            mock_cfg.return_value = LoggerCfg(level="ERROR")
            configure_logging(level="DEBUG")
            logger = logging.getLogger("test_override")
            # Should use DEBUG level from parameter, not ERROR from config
            assert logger.isEnabledFor(logging.DEBUG)


class TestConfigureLoggingOutput:
    """Tests for configure_logging output destinations."""

    def test_configure_logging_output_stdout(self, capsys):
        """Test configure_logging with stdout output."""
        configure_logging(level="INFO", output="stdout")
        logger = logging.getLogger("test_stdout")
        logger.info("Test message to stdout")
        captured = capsys.readouterr()
        assert "Test message to stdout" in captured.out

    def test_configure_logging_output_stderr(self, capsys):
        """Test configure_logging with stderr output."""
        configure_logging(level="INFO", output="stderr")
        logger = logging.getLogger("test_stderr")
        logger.info("Test message to stderr")
        captured = capsys.readouterr()
        assert "Test message to stderr" in captured.err

    def test_configure_logging_output_file(self):
        """Test configure_logging with file output."""
        tmpdir = tempfile.mkdtemp()
        try:
            log_file = Path(tmpdir) / "test.log"
            configure_logging(level="INFO", output="file", file_path=str(log_file))
            logger = logging.getLogger("test_file")
            logger.info("Test message to file")

            # Check file was created and contains the message
            assert log_file.exists()
            content = log_file.read_text()
            assert "Test message to file" in content
        finally:
            # Reconfigure logging to release file handles before cleanup
            configure_logging(level="INFO", output="stdout")
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)

    def test_file_output_creates_directories(self):
        """Test file output creates parent directories."""
        tmpdir = tempfile.mkdtemp()
        try:
            log_file = Path(tmpdir) / "nested" / "deep" / "test.log"
            configure_logging(level="INFO", output="file", file_path=str(log_file))
            logger = logging.getLogger("test_dirs")
            logger.info("Test message")

            assert log_file.exists()
        finally:
            # Reconfigure logging to release file handles before cleanup
            configure_logging(level="INFO", output="stdout")
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)


class TestConfigureLoggingFormat:
    """Tests for configure_logging format options."""

    def test_configure_logging_custom_format(self, capsys):
        """Test configure_logging with custom format."""
        configure_logging(
            level="INFO",
            output="stdout",
            format="%(levelname)s: %(message)s"
        )
        logger = logging.getLogger("test_format")
        logger.info("Custom format test")
        captured = capsys.readouterr()
        assert "INFO: Custom format test" in captured.out


class TestConfigureLoggingGracefulFailures:
    """Tests for configure_logging graceful failure handling."""

    def test_file_output_falls_back_to_stdout_on_invalid_path(self, capsys):
        """Test file output falls back to stdout on invalid path."""
        # Use a path that cannot be created (invalid characters on Windows)
        invalid_path = "<>|:*?\"\\test.log"
        configure_logging(
            level="INFO",
            output="file",
            file_path=invalid_path
        )
        # Should not raise, should fall back to stdout
        logger = logging.getLogger("test_fallback")
        logger.info("Fallback test message")
        captured = capsys.readouterr()
        # Message should appear in stderr warning and stdout logging
        assert "Fallback test message" in captured.out or "Warning" in captured.err

    def test_configure_logging_idempotent(self):
        """Test configure_logging can be called multiple times."""
        configure_logging(level="INFO")
        configure_logging(level="DEBUG")
        logger = logging.getLogger("test_idempotent")
        assert logger.isEnabledFor(logging.DEBUG)


class TestConfigureLoggingWithLoggerCfg:
    """Tests for configure_logging integration with LoggerCfg."""

    def test_configure_logging_uses_all_logger_cfg_values(self):
        """Test configure_logging respects all LoggerCfg values."""
        tmpdir = tempfile.mkdtemp()
        try:
            log_file = Path(tmpdir) / "config_test.log"

            # Create a custom LoggerCfg
            cfg = LoggerCfg(
                level="ERROR",
                format="%(name)s - %(message)s",
                output="file",
                file_path=str(log_file)
            )

            with mock.patch("idalista_tracker.logging.LoggerCfg") as mock_cfg:
                mock_cfg.return_value = cfg
                configure_logging()

                logger = logging.getLogger("test_all_cfg")
                logger.info("This should not appear")
                logger.error("This should appear")

                content = log_file.read_text()
                assert "test_all_cfg - This should appear" in content
                assert "This should not appear" not in content
        finally:
            # Reconfigure logging to release file handles before cleanup
            configure_logging(level="INFO", output="stdout")
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
