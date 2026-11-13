"""Database migration script for performance optimization.

Extracts Base64 image blobs to local disk (data/media/properties/{id}/cover.jpg),
replaces property.image_data with relative path strings, adds and backfills
persistent indexed columns (canonical_zone, discount_pct, price_per_m2),
rebuilds indexes, and reclaims space using SQLite VACUUM.
"""

import base64
import logging
import os
import re
from pathlib import Path
from typing import Optional

from sqlalchemy import Engine, text

from src.config import settings
from src.database.models import engine as global_engine
from src.services.media_service import MediaService
from src.services.zone_service import normalize_zone

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def migrate_performance_database(
    db_engine: Optional[Engine] = None,
    media_root: Optional[str] = None,
    run_vacuum: bool = True,
) -> None:
    """Run performance optimization migration.

    Args:
        db_engine: Optional SQLAlchemy engine (defaults to global engine).
        media_root: Optional media root directory (defaults to settings.MEDIA_ROOT).
        run_vacuum: Whether to run VACUUM after migration to reclaim free pages.
    """
    target_engine = db_engine or global_engine
    media_svc = MediaService(media_root=media_root)

    logger.info("Starting performance optimization database migration...")

    # Record initial database size if file exists
    db_path = None
    if str(target_engine.url).startswith("sqlite:///"):
        raw_path = str(target_engine.url).replace("sqlite:///", "")
        if raw_path and not raw_path.startswith(":memory:"):
            db_path = Path(raw_path).resolve()
            if db_path.exists():
                init_size_mb = os.path.getsize(db_path) / (1024 * 1024)
                logger.info(f"Initial database file size: {init_size_mb:.2f} MB")

    # 1. Enable SQLite WAL and connection pragmas
    with target_engine.connect() as conn:
        if str(target_engine.url).startswith("sqlite"):
            logger.info("Applying SQLite WAL and memory cache pragmas...")
            conn.execute(text("PRAGMA journal_mode = WAL"))
            conn.execute(text("PRAGMA synchronous = NORMAL"))
            conn.execute(text("PRAGMA busy_timeout = 5000"))
            conn.execute(text("PRAGMA cache_size = -64000"))
            conn.execute(text("PRAGMA mmap_size = 268435456"))

        # 2. Check and add columns to Property table
        existing_cols = {
            row[1]
            for row in conn.execute(text("SELECT * FROM pragma_table_info('property')")).fetchall()
        }

        if "canonical_zone" not in existing_cols:
            logger.info("Adding column canonical_zone to property...")
            conn.execute(
                text(
                    "ALTER TABLE property ADD COLUMN canonical_zone VARCHAR(100) NOT NULL DEFAULT 'Burgos Centro / Otras Zonas'"
                )
            )

        if "discount_pct" not in existing_cols:
            logger.info("Adding column discount_pct to property...")
            conn.execute(
                text("ALTER TABLE property ADD COLUMN discount_pct FLOAT NOT NULL DEFAULT 0.0")
            )

        if "price_per_m2" not in existing_cols:
            logger.info("Adding column price_per_m2 to property...")
            conn.execute(text("ALTER TABLE property ADD COLUMN price_per_m2 INTEGER"))

        # 3. Create performance indexes
        logger.info("Creating performance indexes...")
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_property_canonical_zone ON property (canonical_zone)"
            )
        )
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_property_discount_pct ON property (discount_pct)")
        )
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_property_price_per_m2 ON property (price_per_m2)")
        )
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_property_current_price ON property (current_price)")
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_property_status_canonical_zone ON property (status, canonical_zone)"
            )
        )
        conn.commit()

    # 4. Batch process property rows: extract base64 images & backfill columns
    logger.info("Extracting Base64 images to disk and backfilling performance fields...")
    batch_size = 100
    last_id = 0
    extracted_images_count = 0
    total_processed = 0

    while True:
        with target_engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT id, idealista_id, title, location, original_price, current_price, size_m2, image_data
                    FROM property
                    WHERE id > :last_id
                    ORDER BY id ASC
                    LIMIT :batch_size
                    """
                ),
                {"last_id": last_id, "batch_size": batch_size},
            ).fetchall()

            if not rows:
                break

            for row in rows:
                p_id, idealista_id, title, location, orig_price, cur_price, size_m2, img_data = row
                last_id = p_id
                total_processed += 1

                # A. Handle Base64 Image Extraction
                new_image_data = img_data
                if img_data and img_data.startswith("data:"):
                    match = re.match(r"data:(.+);base64,(.+)", img_data)
                    if match:
                        try:
                            raw_bytes = base64.b64decode(match.group(2))
                            prop_dir = media_svc.get_property_dir(str(idealista_id))
                            cover_path = prop_dir / "cover.jpg"
                            cover_path.write_bytes(raw_bytes)
                            new_image_data = f"properties/{idealista_id}/cover.jpg"
                            extracted_images_count += 1
                        except Exception as e:
                            logger.warning(f"Failed to extract image for property {idealista_id}: {e}")
                    else:
                        new_image_data = None

                # B. Compute performance columns
                c_zone = normalize_zone(title or "", location or "")
                orig_p = orig_price or 0
                cur_p = cur_price or 0
                if orig_p and cur_p and orig_p > cur_p:
                    disc_pct = round(((orig_p - cur_p) / orig_p) * 100.0, 1)
                else:
                    disc_pct = 0.0

                p_m2 = round(cur_p / size_m2) if (size_m2 and size_m2 > 0 and cur_p > 0) else None

                conn.execute(
                    text(
                        """
                        UPDATE property
                        SET image_data = :image_data,
                            canonical_zone = :canonical_zone,
                            discount_pct = :discount_pct,
                            price_per_m2 = :price_per_m2
                        WHERE id = :id
                        """
                    ),
                    {
                        "image_data": new_image_data,
                        "canonical_zone": c_zone,
                        "discount_pct": disc_pct,
                        "price_per_m2": p_m2,
                        "id": p_id,
                    },
                )

            conn.commit()
            if total_processed % 500 == 0:
                logger.info(
                    f"Processed {total_processed} properties... ({extracted_images_count} images extracted to disk)"
                )

    logger.info(
        f"Completed data transformation. Total processed: {total_processed}, images extracted: {extracted_images_count}."
    )

    # 5. Execute VACUUM to reclaim space in SQLite
    if run_vacuum and db_path and db_path.exists():
        logger.info("Executing SQLite VACUUM to reclaim disk space...")
        try:
            raw_conn = target_engine.raw_connection()
            raw_conn.isolation_level = None
            cursor = raw_conn.cursor()
            cursor.execute("VACUUM")
            cursor.close()
            raw_conn.close()

            final_size_mb = os.path.getsize(db_path) / (1024 * 1024)
            logger.info(f"SQLite VACUUM completed. Final database size: {final_size_mb:.2f} MB")
        except Exception as e:
            logger.warning(f"VACUUM execution encountered: {e}")

    logger.info("Performance optimization database migration completed successfully.")


if __name__ == "__main__":
    migrate_performance_database()
