"""Database migration script for extension crawler models.

This script handles migration of existing database to add new tables and columns
for the Chrome Extension Property Crawler feature.
"""
import logging
from datetime import datetime

from sqlalchemy import text

from src.database.models import (
    Base,
    CrawlSession,
    Property,
    PropertyChange,
    PropertyVisibility,
    SavedSearch,
    crawl_session_property,
    engine,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_database():
    """Run database migration for extension crawler feature."""
    logger.info("Starting database migration...")

    # Create all new tables
    logger.info("Creating new tables...")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            CrawlSession.__table__,
            SavedSearch.__table__,
            PropertyVisibility.__table__,
            PropertyChange.__table__,
            crawl_session_property,
        ],
    )
    logger.info("New tables created successfully.")

    # Migrate existing Property table
    logger.info("Checking Property table for new columns...")

    with engine.connect() as conn:
        # Check if status column exists
        result = conn.execute(
            text("SELECT COUNT(*) FROM pragma_table_info('property') WHERE name='status'")
        )
        has_status = result.scalar() > 0

        if not has_status:
            logger.info("Adding new columns to Property table...")

            # Add new columns
            conn.execute(text("ALTER TABLE property ADD COLUMN status VARCHAR(20) DEFAULT 'active'"))
            conn.execute(text("ALTER TABLE property ADD COLUMN first_seen_at DATETIME"))
            conn.execute(text("ALTER TABLE property ADD COLUMN last_seen_at DATETIME"))
            conn.execute(text("ALTER TABLE property ADD COLUMN missing_since DATETIME"))
            conn.commit()

            # Backfill data
            logger.info("Backfilling data...")
            conn.execute(
                text("""
                    UPDATE property 
                    SET first_seen_at = created_at,
                        last_seen_at = updated_at,
                        status = 'active'
                    WHERE first_seen_at IS NULL
                """)
            )
            conn.commit()

            logger.info("Property table migration complete.")
        else:
            logger.info("Property table already has new columns.")
        
        # Fix email_id column to allow NULL for extension crawler
        logger.info("Checking email_id column constraints...")
        result = conn.execute(
            text("SELECT [notnull] FROM pragma_table_info('property') WHERE name='email_id'")
        )
        email_notnull = result.scalar()
        
        if email_notnull == 1:
            logger.info("Making email_id column nullable...")
            # SQLite doesn't support ALTER COLUMN, need to recreate table
            conn.execute(text("""
                CREATE TABLE property_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    idealista_id VARCHAR(20) NOT NULL UNIQUE,
                    title VARCHAR(500) NOT NULL,
                    property_type VARCHAR(50),
                    location VARCHAR(500) NOT NULL,
                    original_price INTEGER NOT NULL,
                    current_price INTEGER NOT NULL,
                    price_drop_percentage FLOAT,
                    size_m2 INTEGER,
                    bedrooms INTEGER,
                    floor VARCHAR(50),
                    has_elevator BOOLEAN,
                    property_url VARCHAR(500) NOT NULL,
                    image_url VARCHAR(500),
                    email_id INTEGER REFERENCES email_source(id),
                    created_at DATETIME NOT NULL,
                    updated_at DATETIME NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    status VARCHAR(20) NOT NULL DEFAULT 'active',
                    first_seen_at DATETIME NOT NULL,
                    last_seen_at DATETIME NOT NULL,
                    missing_since DATETIME
                )
            """))
            conn.execute(text("""
                INSERT INTO property_new SELECT 
                    id, idealista_id, title, property_type, location,
                    original_price, current_price, price_drop_percentage,
                    size_m2, bedrooms, floor, has_elevator, property_url,
                    image_url, email_id, created_at, updated_at, is_active,
                    status, first_seen_at, last_seen_at, missing_since
                FROM property
            """))
            conn.execute(text("DROP TABLE property"))
            conn.execute(text("ALTER TABLE property_new RENAME TO property"))
            conn.commit()
            logger.info("email_id column is now nullable.")

    logger.info("Database migration completed successfully!")


if __name__ == "__main__":
    migrate_database()
