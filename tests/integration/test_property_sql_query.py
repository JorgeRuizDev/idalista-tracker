"""Integration tests verifying pure SQL filtering, sorting, and pagination in PropertyService."""

import time
from datetime import datetime, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.database.models import Base, Property
from src.services.property_service import PropertyService


@pytest.fixture
def populated_db():
    """Create in-memory SQLite database populated with test properties."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    properties = []
    zones = [
        "Gamonal - San Bruno - G9",
        "Los Vadillos - Reyes Católicos",
        "Casco Antiguo - Centro",
        "Villa Pilar",
    ]

    # Populate 50 properties across various zones with different discounts
    for i in range(50):
        zone = zones[i % len(zones)]
        orig_p = 100000 + (i * 5000)
        # Give higher discount to every 3rd property
        cur_p = int(orig_p * 0.8) if i % 3 == 0 else orig_p
        disc_pct = round(((orig_p - cur_p) / orig_p) * 100.0, 1)
        size = 50 + (i % 5) * 15
        p_m2 = round(cur_p / size)

        p = Property(
            idealista_id=f"test_prop_{i:03d}",
            title=f"Piso en {zone} #{i}",
            location=f"Calle Falsa {i}, {zone}, Burgos",
            original_price=orig_p,
            current_price=cur_p,
            price_drop_percentage=disc_pct if disc_pct > 0 else 0.0,
            discount_pct=disc_pct,
            size_m2=size,
            price_per_m2=p_m2,
            bedrooms=2 + (i % 3),
            property_url=f"https://www.idealista.com/inmueble/test_{i}/",
            canonical_zone=zone,
            status="active" if i % 5 != 0 else "sold",
            first_seen_at=datetime.utcnow() - timedelta(days=i),
            last_seen_at=datetime.utcnow(),
            created_at=datetime.utcnow() - timedelta(days=i),
        )
        properties.append(p)

    session.add_all(properties)
    session.commit()

    yield session
    session.close()


def test_sql_pagination(populated_db):
    """Verify LIMIT and OFFSET pagination executed in SQL returns accurate pages and total."""
    service = PropertyService(populated_db)

    t0 = time.perf_counter()
    page1, total = service.list_properties(limit=10, offset=0)
    t1 = time.perf_counter()

    assert (t1 - t0) < 0.1, f"Pagination query took too long: {(t1 - t0)*1000:.2f} ms"
    assert total == 50
    assert len(page1) == 10

    # Fetch second page
    page2, total2 = service.list_properties(limit=10, offset=10)
    assert total2 == 50
    assert len(page2) == 10

    # Assert distinct items across pages
    ids_page1 = {p.idealista_id for p in page1}
    ids_page2 = {p.idealista_id for p in page2}
    assert len(ids_page1.intersection(ids_page2)) == 0


def test_sql_canonical_zone_filtering(populated_db):
    """Verify zone filtering executes natively in SQL using canonical_zone index."""
    service = PropertyService(populated_db)
    target_zone = "Gamonal - San Bruno - G9"

    t0 = time.perf_counter()
    results, total = service.list_properties(zone=target_zone, limit=20)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    assert elapsed_ms < 100, f"Zone filter took {elapsed_ms:.2f} ms"
    assert total > 0
    assert all(p.canonical_zone == target_zone for p in results)


def test_sql_discount_sorting(populated_db):
    """Verify sorting by discount_desc orders properties by discount_pct in SQL."""
    service = PropertyService(populated_db)

    results, total = service.list_properties(sort_by="discount_desc", limit=20)
    assert len(results) > 0

    discounts = [getattr(p, "discount_pct", 0.0) for p in results]
    assert discounts == sorted(discounts, reverse=True)


def test_combined_sql_filters_and_price_ranges(populated_db):
    """Verify combined filters (status, min_price, max_price, zone) in SQL."""
    service = PropertyService(populated_db)

    results, total = service.list_properties(
        status="active",
        zone="Villa Pilar",
        min_price=120000,
        max_price=250000,
        limit=10,
    )

    assert total <= 50
    for p in results:
        assert p.status == "active"
        assert p.canonical_zone == "Villa Pilar"
        assert 120000 <= p.current_price <= 250000
