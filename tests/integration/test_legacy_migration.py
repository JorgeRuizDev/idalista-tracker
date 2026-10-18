"""Integration tests for legacy property isolation after database migration."""

from datetime import datetime
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from src.database.migrate_detail_crawler import migrate_database
from src.database.models import Base, Property
from src.services.property_service import PropertyService


def test_legacy_migration_isolates_existing_properties(tmp_path):
    """Test that existing database records are converted to legacy and isolated from pending queue."""
    db_file = tmp_path / "test_legacy.db"
    test_db_url = f"sqlite:///{db_file}"
    engine = create_engine(test_db_url)

    # 1. Create a schema simulating pre-existing database (WITHOUT detail_status or with NULLs)
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE property (
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
                image_data TEXT,
                email_id INTEGER,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT 1,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                first_seen_at DATETIME NOT NULL,
                last_seen_at DATETIME NOT NULL,
                missing_since DATETIME,
                sold_at DATETIME
            )
        """))
        # Insert 3 legacy properties
        conn.execute(text("""
            INSERT INTO property (
                idealista_id, title, location, original_price, current_price,
                property_url, created_at, updated_at, is_active, status,
                first_seen_at, last_seen_at
            ) VALUES 
            ('leg_001', 'Piso 1', 'Madrid', 100000, 100000, 'https://idealista.com/1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('leg_002', 'Piso 2', 'Madrid', 200000, 200000, 'https://idealista.com/2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            ('leg_003', 'Piso 3', 'Madrid', 300000, 300000, 'https://idealista.com/3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """))
        conn.commit()

    # 2. Run migration on this database
    migrate_database(engine)

    # 3. Verify all 3 properties have detail_status = 'legacy'
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        service = PropertyService(session)
        props = session.query(Property).all()
        assert len(props) == 3
        for p in props:
            assert p.detail_status == "legacy"

        # 4. Verify pending queue excludes legacy properties
        pending = service.get_pending_detail_properties()
        assert len(pending) == 0

    finally:
        session.close()
