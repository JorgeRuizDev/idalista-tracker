"""Media storage service for downloading and persisting listing gallery photos."""

import asyncio
import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from src.config import settings

logger = logging.getLogger(__name__)


class MediaService:
    """Service to handle local storage and downloading of property gallery photos."""

    def __init__(
        self,
        media_root: Optional[str] = None,
        property_media_dir: Optional[str] = None,
        concurrency_limit: int = 3,
        timeout_seconds: float = 15.0,
    ) -> None:
        """Initialize media service with storage directories and concurrency limit.

        Args:
            media_root: Root directory for media storage (defaults to settings.MEDIA_ROOT).
            property_media_dir: Directory for property media (defaults to settings.PROPERTY_MEDIA_DIR).
            concurrency_limit: Maximum concurrent photo downloads (default 3).
            timeout_seconds: HTTP download timeout per photo.
        """
        self.media_root = Path(media_root or settings.MEDIA_ROOT)
        self.property_media_dir = Path(property_media_dir or settings.PROPERTY_MEDIA_DIR)
        self.concurrency_limit = concurrency_limit
        self.timeout_seconds = timeout_seconds

        # Ensure directories exist
        self.media_root.mkdir(parents=True, exist_ok=True)
        self.property_media_dir.mkdir(parents=True, exist_ok=True)

    def get_property_dir(self, idealista_id: str) -> Path:
        """Get the directory path for a specific property's photos.

        Args:
            idealista_id: Idealista property ID.

        Returns:
            Path object to property directory.
        """
        prop_dir = self.property_media_dir / str(idealista_id)
        prop_dir.mkdir(parents=True, exist_ok=True)
        return prop_dir

    def format_relative_path(self, idealista_id: str, filename: str) -> str:
        """Format relative path suitable for database storage and static serving.

        Args:
            idealista_id: Idealista property ID.
            filename: Image filename.

        Returns:
            Relative path string, e.g. 'properties/{idealista_id}/{filename}'.
        """
        return f"properties/{idealista_id}/{filename}"

    def format_media_url(self, relative_path: str) -> str:
        """Format public media URL for serving via /media endpoint.

        Args:
            relative_path: Relative file path, e.g. 'properties/{idealista_id}/{filename}'.

        Returns:
            URL path, e.g. '/media/properties/{idealista_id}/{filename}'.
        """
        clean_rel = relative_path.lstrip("/")
        return f"/media/{clean_rel}"

    async def _download_single_photo(
        self,
        client: httpx.AsyncClient,
        semaphore: asyncio.Semaphore,
        idealista_id: str,
        photo_info: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Download a single photo with concurrency throttling.

        Args:
            client: Shared HTTPX async client.
            semaphore: Concurrency semaphore.
            idealista_id: Idealista property ID.
            photo_info: Dict containing original_url, sequence_index, and optional caption.

        Returns:
            Dict with downloaded photo metadata, or None if download failed.
        """
        original_url = photo_info.get("original_url")
        if not original_url:
            return None

        sequence_index = photo_info.get("sequence_index", 0)
        caption = photo_info.get("caption")

        # Create stable filename using sequence index and URL hash
        url_hash = hashlib.sha256(original_url.encode("utf-8")).hexdigest()[:8]
        filename = f"photo_{sequence_index:03d}_{url_hash}.jpg"

        dest_dir = self.get_property_dir(idealista_id)
        dest_path = dest_dir / filename
        relative_path = self.format_relative_path(idealista_id, filename)
        media_url = self.format_media_url(relative_path)

        async with semaphore:
            try:
                # If file already exists and has non-zero size, reuse it
                if dest_path.exists() and dest_path.stat().st_size > 0:
                    file_size = dest_path.stat().st_size
                    return {
                        "sequence_index": sequence_index,
                        "original_url": original_url,
                        "local_file_path": relative_path,
                        "local_url": media_url,
                        "caption": caption,
                        "file_size_bytes": file_size,
                        "content_type": "image/jpeg",
                    }

                headers = {
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    ),
                    "Referer": "https://www.idealista.com/",
                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                }

                response = await client.get(
                    original_url, headers=headers, timeout=self.timeout_seconds
                )
                if response.status_code != 200:
                    logger.warning(
                        f"Failed to download photo {original_url} for property {idealista_id}: "
                        f"HTTP {response.status_code}"
                    )
                    return None

                content = response.content
                content_type = response.headers.get("content-type", "image/jpeg")

                # Write binary content to disk
                dest_path.write_bytes(content)
                file_size = len(content)

                return {
                    "sequence_index": sequence_index,
                    "original_url": original_url,
                    "local_file_path": relative_path,
                    "local_url": media_url,
                    "caption": caption,
                    "file_size_bytes": file_size,
                    "content_type": content_type,
                }

            except Exception as e:
                logger.warning(
                    f"Exception downloading photo {original_url} for property {idealista_id}: {e}"
                )
                return None

    async def download_property_photos(
        self,
        idealista_id: str,
        photos: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Download multiple photos for a property using a concurrency pool.

        Args:
            idealista_id: Idealista property ID.
            photos: List of photo info dicts (original_url, sequence_index, caption).

        Returns:
            List of successfully downloaded photo metadata dicts.
        """
        if not photos:
            return []

        semaphore = asyncio.Semaphore(self.concurrency_limit)
        async with httpx.AsyncClient() as client:
            tasks = [
                self._download_single_photo(client, semaphore, idealista_id, photo_info)
                for photo_info in photos
            ]
            results = await asyncio.gather(*tasks)

        # Filter out failed downloads and sort by sequence_index
        successful = [r for r in results if r is not None]
        successful.sort(key=lambda p: p["sequence_index"])
        return successful
