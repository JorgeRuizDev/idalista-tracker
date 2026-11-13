"""Security test suite for media asset path resolution and directory traversal prevention."""

import tempfile
from pathlib import Path
import pytest

from src.services.media_service import MediaService


def test_path_traversal_attempts_blocked():
    """Verify that any path attempting directory traversal is rejected with None."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        service = MediaService(media_root=tmp_dir)

        malicious_paths = [
            "../../etc/passwd",
            "../idealista_properties.db",
            "properties/103444/../../../config.py",
            "properties/103444/../../../../etc/shadow",
            "/etc/passwd",
            "../../../../../../../../../../etc/hosts",
            "properties/103444/../../../etc/passwd.jpg",
        ]

        for p in malicious_paths:
            assert service.resolve_safe_path(p) is None, f"Expected {p} to be blocked!"


def test_extension_whitelist_enforced():
    """Verify that only whitelisted image extensions (.jpg, .jpeg, .png, .webp) are permitted."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        service = MediaService(media_root=tmp_dir)

        disallowed_files = [
            "properties/123/script.sh",
            "properties/123/payload.py",
            "properties/123/database.sqlite3",
            "properties/123/data.json",
            "properties/123/image_without_extension",
            "properties/123/fake.html",
        ]

        for f in disallowed_files:
            assert service.resolve_safe_path(f) is None, f"Expected extension of {f} to be rejected!"

        allowed_files = [
            "properties/123/cover.jpg",
            "properties/123/cover.JPEG",
            "properties/123/cover.png",
            "properties/123/photo.webp",
        ]

        for f in allowed_files:
            safe = service.resolve_safe_path(f)
            assert safe is not None, f"Expected {f} to be accepted!"
            assert safe.is_relative_to(Path(tmp_dir).resolve())


def test_check_exists_flag():
    """Verify that check_exists validates actual file existence on disk."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        service = MediaService(media_root=tmp_dir)
        rel_path = "properties/123/cover.jpg"

        # Without check_exists, path is structurally valid
        assert service.resolve_safe_path(rel_path, check_exists=False) is not None

        # With check_exists=True, file does not exist yet -> None
        assert service.resolve_safe_path(rel_path, check_exists=True) is None

        # Create file on disk
        target_path = Path(tmp_dir) / "properties" / "123" / "cover.jpg"
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"dummy image data")

        # Now check_exists=True should succeed
        safe = service.resolve_safe_path(rel_path, check_exists=True)
        assert safe is not None
        assert safe == target_path.resolve()


def test_invalid_and_empty_inputs():
    """Verify that None, empty strings, and non-string types return None."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        service = MediaService(media_root=tmp_dir)

        assert service.resolve_safe_path("") is None
        assert service.resolve_safe_path("   ") is None
        assert service.resolve_safe_path(None) is None
        assert service.resolve_safe_path(12345) is None
