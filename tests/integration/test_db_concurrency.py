"""Integration test verifying concurrency between readers and writers in SQLite WAL mode."""

import concurrent.futures
import os
import tempfile
import time
from pathlib import Path
import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from src.database.models import Base, Property
from src.services.property_service import PropertyService


def test_concurrent_reads_during_writes():
    """Verify that concurrent reader threads do not get locked or fail while writer commits."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_file = Path(tmp_dir) / "concurrency_test.db"
        db_url = f"sqlite:///{db_file}"

        engine = create_engine(db_url, connect_args={"check_same_thread": False, "timeout": 15.0})

        @event.listens_for(engine, "connect")
        def set_pragmas(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode = WAL")
            cursor.execute("PRAGMA synchronous = NORMAL")
            cursor.execute("PRAGMA busy_timeout = 5000")
            cursor.close()

        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine)

        # Seed initial records
        with Session() as session:
            for i in range(20):
                p = Property(
                    idealista_id=f"concurrent_init_{i:02d}",
                    title=f"Piso {i} en Gamonal - San Bruno - G9, Burgos",
                    location="Gamonal, Burgos",
                    original_price=100000 + i * 1000,
                    current_price=90000 + i * 1000,
                    size_m2=75,
                    property_url=f"https://idealista.com/{i}",
                    canonical_zone="Gamonal - San Bruno - G9",
                    discount_pct=10.0,
                )
                session.add(p)
            session.commit()

        stop_flag = False
        writer_errors = []
        reader_errors = []
        read_counts = 0

        def writer_task():
            nonlocal writer_errors
            with Session() as session:
                for w in range(15):
                    if stop_flag:
                        break
                    try:
                        p = Property(
                            idealista_id=f"concurrent_write_{w:02d}",
                            title=f"Propiedad crawler {w}",
                            location="Burgos Centro",
                            original_price=150000,
                            current_price=140000,
                            size_m2=65,
                            property_url=f"https://idealista.com/crawl_{w}",
                            canonical_zone="Casco Antiguo - Centro",
                            discount_pct=6.7,
                        )
                        session.add(p)
                        session.commit()
                        time.sleep(0.02)
                    except Exception as e:
                        writer_errors.append(e)

        def reader_task(worker_id):
            nonlocal reader_errors, read_counts
            local_reads = 0
            with Session() as session:
                service = PropertyService(session)
                for _ in range(30):
                    try:
                        items, total = service.list_properties(
                            zone="Gamonal - San Bruno - G9", limit=10
                        )
                        assert total >= 20
                        local_reads += 1
                        time.sleep(0.01)
                    except Exception as e:
                        reader_errors.append((worker_id, e))
            return local_reads

        # Run concurrent writer and 4 readers
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            writer_future = executor.submit(writer_task)
            reader_futures = [executor.submit(reader_task, idx) for idx in range(4)]

            # Wait for all to complete
            writer_future.result()
            for rf in reader_futures:
                read_counts += rf.result()

        # Assert zero lock errors occurred
        assert len(writer_errors) == 0, f"Writer encountered errors: {writer_errors}"
        assert len(reader_errors) == 0, f"Readers encountered errors: {reader_errors}"
        assert read_counts == 4 * 30
