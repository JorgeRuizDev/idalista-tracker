"""Database migration script for detail crawler models.

Adds new columns to property table, creates property_snapshot,
property_photo, and detail_crawl_attempt tables, and classifies
pre-existing property records as 'legacy'.
"""

import logging
from typing import List, Optional, cast

from sqlalchemy import Engine, Table, text

from src.database.models import (
    Base,
    DetailCrawlAttempt,
    PropertyPhoto,
    PropertySnapshot,
    engine,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_database(db_engine: Optional[Engine] = None) -> None:
    """Run database migration for detail crawler feature.

    Args:
        db_engine: Optional SQLAlchemy engine to use (defaults to global engine).
    """
    target_engine = db_engine or engine
    logger.info("Starting detail crawler database migration...")

    # 1. Create all new tables
    logger.info("Creating new detail crawler tables...")
    tables = cast(
        List[Table],
        [
            PropertySnapshot.__table__,
            PropertyPhoto.__table__,
            DetailCrawlAttempt.__table__,
        ],
    )
    Base.metadata.create_all(
        bind=target_engine,
        tables=tables,
    )
    logger.info("Detail crawler tables created successfully.")

    # 2. Check and add columns to Property table
    with target_engine.connect() as conn:
        existing_cols = {
            row[1]
            for row in conn.execute(text("SELECT * FROM pragma_table_info('property')")).fetchall()
        }

        # Check detail_status
        if "detail_status" not in existing_cols:
            logger.info("Adding column detail_status to property...")
            conn.execute(
                text(
                    "ALTER TABLE property ADD COLUMN detail_status VARCHAR(20) NOT NULL DEFAULT 'legacy'"
                )
            )

        # Check detail_updated_at
        if "detail_updated_at" not in existing_cols:
            logger.info("Adding column detail_updated_at to property...")
            conn.execute(text("ALTER TABLE property ADD COLUMN detail_updated_at DATETIME"))

        # Check discard_reason
        if "discard_reason" not in existing_cols:
            logger.info("Adding column discard_reason to property...")
            conn.execute(text("ALTER TABLE property ADD COLUMN discard_reason VARCHAR(50)"))

        # Check backend_attempts
        if "backend_attempts" not in existing_cols:
            logger.info("Adding column backend_attempts to property...")
            conn.execute(
                text("ALTER TABLE property ADD COLUMN backend_attempts INTEGER NOT NULL DEFAULT 0")
            )

        # Check extension_attempts
        if "extension_attempts" not in existing_cols:
            logger.info("Adding column extension_attempts to property...")
            conn.execute(
                text(
                    "ALTER TABLE property ADD COLUMN extension_attempts INTEGER NOT NULL DEFAULT 0"
                )
            )

        # Check fallback_to_extension
        if "fallback_to_extension" not in existing_cols:
            logger.info("Adding column fallback_to_extension to property...")
            conn.execute(
                text(
                    "ALTER TABLE property ADD COLUMN fallback_to_extension BOOLEAN NOT NULL DEFAULT 0"
                )
            )

        conn.commit()

        # 3. Create index on detail_status
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_property_detail_status ON property (detail_status)")
        )
        conn.commit()

        # 4. Ensure all pre-existing records have detail_status = 'legacy'
        conn.execute(text("""
                UPDATE property
                SET detail_status = 'legacy'
                WHERE detail_status IS NULL OR detail_status = ''
            """))
        conn.commit()

    logger.info("Detail crawler database migration completed successfully!")


if __name__ == "__main__":
    migrate_database()
