"""Unit tests for zone normalization and property filter queries."""
import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.database.models import Base, Property, PriceHistory
from src.services.zone_service import normalize_zone
from src.services.property_service import PropertyService


@pytest.fixture
def db_session():
    """In-memory SQLite session for isolated service testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed test properties
    p1 = Property(
        idealista_id="prop1",
        title="Piso en Avenida Reyes Católicos, Los Vadillos - R. Sanitaria - Pozanos, Burgos",
        location="Avenida Reyes Católicos, Burgos",
        original_price=300000,
        current_price=270000,
        price_drop_percentage=10.0,
        size_m2=100,
        bedrooms=3,
        floor="2ª planta",
        has_elevator=True,
        property_url="https://idealista.com/1",
        status="sold",
        first_seen_at=datetime(2026, 5, 1, 10, 0, 0),
        last_seen_at=datetime(2026, 7, 1, 10, 0, 0),
        sold_at=datetime(2026, 7, 10, 10, 0, 0),
        created_at=datetime(2026, 5, 1, 10, 0, 0),
    )
    p2 = Property(
        idealista_id="prop2",
        title="Ático en Plaza Nueva de Gamonal, Gamonal - San Bruno - G9, Burgos",
        location="Plaza Nueva, Gamonal",
        original_price=150000,
        current_price=150000,
        price_drop_percentage=0.0,
        size_m2=75,
        bedrooms=2,
        floor="Ático",
        has_elevator=False,
        property_url="https://idealista.com/2",
        status="active",
        first_seen_at=datetime(2026, 6, 15, 10, 0, 0),
        last_seen_at=datetime(2026, 8, 1, 10, 0, 0),
        created_at=datetime(2026, 6, 15, 10, 0, 0),
    )
    p3 = Property(
        idealista_id="prop3",
        title="Piso en Briviesca",
        location="Briviesca centro",
        original_price=90000,
        current_price=80000,
        price_drop_percentage=11.1,
        size_m2=90,
        bedrooms=3,
        floor="1ª planta",
        has_elevator=True,
        property_url="https://idealista.com/3",
        status="active",
        first_seen_at=datetime(2026, 7, 1, 10, 0, 0),
        last_seen_at=datetime(2026, 7, 20, 10, 0, 0),
        created_at=datetime(2026, 7, 1, 10, 0, 0),
    )

    session.add_all([p1, p2, p3])
    session.commit()

    yield session
    session.close()


def test_normalize_zone_patterns():
    """Verify zone normalizer maps varied listing titles to canonical zones."""
    assert normalize_zone("Piso en Avenida Reyes Católicos, Los Vadillos, Burgos") == "Los Vadillos - Reyes Católicos"
    assert normalize_zone("Ático en Gamonal - San Bruno - G9, Burgos") == "Gamonal - San Bruno - G9"
    assert normalize_zone("Piso en Villa Pilar") == "Villa Pilar"
    assert normalize_zone("Dúplex en Casco Antiguo") == "Casco Antiguo - Centro"
    assert normalize_zone("Piso en Briviesca") == "Briviesca"
    assert normalize_zone("Chalet en Cardeñadijo") == "Cardeñadijo"
    assert normalize_zone("Casa desconocida en calle aleatoria") == "Burgos Centro / Otras Zonas"


def test_filter_properties_by_status_sold(db_session):
    """Test filtering properties by sold status."""
    service = PropertyService(db_session)
    items, total = service.list_properties(status="sold")
    assert total == 1
    assert items[0].idealista_id == "prop1"
    assert getattr(items[0], "status") == "sold"


def test_filter_properties_by_status_active(db_session):
    """Test filtering properties by active status."""
    service = PropertyService(db_session)
    items, total = service.list_properties(status="active")
    assert total == 2
    assert {p.idealista_id for p in items} == {"prop2", "prop3"}


def test_filter_properties_by_zone(db_session):
    """Test filtering properties by canonical zone."""
    service = PropertyService(db_session)
    items, total = service.list_properties(zone="Gamonal - San Bruno - G9")
    assert total == 1
    assert items[0].idealista_id == "prop2"


def test_filter_properties_by_price_range(db_session):
    """Test filtering properties by min and max price."""
    service = PropertyService(db_session)
    items, total = service.list_properties(min_price=100000, max_price=200000)
    assert total == 1
    assert items[0].idealista_id == "prop2"


def test_filter_properties_by_date_range(db_session):
    """Test filtering properties by date range."""
    service = PropertyService(db_session)
    # Sold in July 2026 or active in July
    items, total = service.list_properties(date_from="2026-07-01", date_to="2026-07-31")
    # p1 sold on 2026-07-10, p3 first seen on 2026-07-01
    assert total >= 2


def test_computed_sold_metrics(db_session):
    """Test computation of discount and days on market metrics."""
    service = PropertyService(db_session)
    items, total = service.list_properties(status="sold")
    assert total == 1
    prop = items[0]
    # discount: 300000 - 270000 = 30000
    assert getattr(prop, "discount_amount") == 30000
    assert getattr(prop, "discount_pct") == 10.0
    # days on market: 2026-07-10 - 2026-05-01 = 70 days
    assert getattr(prop, "days_on_market") == 70
