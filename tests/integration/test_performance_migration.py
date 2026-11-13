"""Integration test verifying Base64 extraction to disk, schema migration, and VACUUM."""

import base64
import os
import tempfile
from pathlib import Path
import pytest
from sqlalchemy import create_engine, text

from src.database.models import Base, Property
from src.database.migrate_performance import migrate_performance_database


def test_migrate_performance_extracts_images_and_backfills():
    """Verify that migrate_performance extracts base64 images to disk and populates persistent columns."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_file = Path(tmp_dir) / "test_migration.db"
        media_root = Path(tmp_dir) / "media"
        media_root.mkdir(parents=True, exist_ok=True)

        engine = create_engine(f"sqlite:///{db_file}")

        # Create schema
        Base.metadata.create_all(engine)

        # Seed sample Base64 dummy image
        sample_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 200
        b64_str = f"data:image/jpeg;base64,{base64.b64encode(sample_bytes).decode('ascii')}"

        from sqlalchemy.orm import sessionmaker
        Session = sessionmaker(bind=engine)
        with Session() as session:
            p = Property(
                idealista_id="prop_mig_1",
                title="Piso en Gamonal - San Bruno - G9, Burgos",
                location="Calle Vitoria, Gamonal",
                original_price=200000,
                current_price=160000,
                size_m2=80,
                property_url="https://idealista.com/1",
                image_data=b64_str,
            )
            session.add(p)
            session.commit()

        # Run migration
        migrate_performance_database(db_engine=engine, media_root=str(media_root), run_vacuum=True)

        # 1. Verify file was extracted to disk
        extracted_file = media_root / "properties" / "prop_mig_1" / "cover.jpg"
        assert extracted_file.exists(), "Extracted cover.jpg should exist on disk"
        assert extracted_file.read_bytes() == sample_bytes

        # 2. Verify database columns were updated
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT image_data, canonical_zone, discount_pct, price_per_m2 FROM property WHERE idealista_id = 'prop_mig_1'")
            ).fetchone()

            assert row is not None
            image_data, canonical_zone, discount_pct, price_per_m2 = row

            assert image_data == "properties/prop_mig_1/cover.jpg"
            assert not image_data.startswith("data:")
            assert canonical_zone == "Gamonal - San Bruno - G9"
            assert discount_pct == 20.0  # (200000 - 160000) / 200000 * 100
            assert price_per_m2 == 2000   # 160000 / 80
