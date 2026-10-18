"""Unit tests for AnalyticsService interval calculations."""
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.database.models import Base, Property, PriceHistory
from src.services.analytics_service import AnalyticsService


@pytest.fixture
def analytics_db():
    """In-memory database populated with interval test data."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Property 1: listed in July, sold in July with a drop in July
    p1 = Property(
        idealista_id="p1",
        title="Piso en Gamonal, Burgos",
        location="Gamonal",
        original_price=200000,
        current_price=180000,
        property_url="https://idealista.com/p1",
        status="sold",
        first_seen_at=datetime(2026, 7, 1, 10, 0, 0),
        sold_at=datetime(2026, 7, 21, 10, 0, 0),
        created_at=datetime(2026, 7, 1, 10, 0, 0),
    )
    # Property 2: listed in June, active in July
    p2 = Property(
        idealista_id="p2",
        title="Piso en Villa Pilar",
        location="Villa Pilar",
        original_price=250000,
        current_price=250000,
        property_url="https://idealista.com/p2",
        status="active",
        first_seen_at=datetime(2026, 6, 15, 10, 0, 0),
        created_at=datetime(2026, 6, 15, 10, 0, 0),
    )
    # Property 3: listed in July, active
    p3 = Property(
        idealista_id="p3",
        title="Piso en Los Vadillos, Burgos",
        location="Los Vadillos",
        original_price=300000,
        current_price=310000,
        property_url="https://idealista.com/p3",
        status="active",
        first_seen_at=datetime(2026, 7, 10, 10, 0, 0),
        created_at=datetime(2026, 7, 10, 10, 0, 0),
    )

    session.add_all([p1, p2, p3])
    session.flush()

    # Price history for p1: drop of 20,000 (10%) on July 10
    ph1 = PriceHistory(
        property_id=p1.id,
        old_price=200000,
        new_price=180000,
        change_type="drop",
        change_date=datetime(2026, 7, 10, 10, 0, 0),
    )
    # Price history for p3: increase of 10,000 on July 15
    ph2 = PriceHistory(
        property_id=p3.id,
        old_price=300000,
        new_price=310000,
        change_type="increase",
        change_date=datetime(2026, 7, 15, 10, 0, 0),
    )

    session.add_all([ph1, ph2])
    session.commit()

    yield session
    session.close()


def test_get_interval_audit_aggregations(analytics_db):
    """Test KPI calculations for July 2026 interval."""
    service = AnalyticsService(analytics_db)
    result = service.get_interval_audit("2026-07-01", "2026-07-31")

    # Inclusions in July: p1 and p3 = 2
    assert result["inclusions"] == 2
    # Sales in July: p1 = 1
    assert result["sales"] == 1
    # Drops in July: 1 (ph1: 200,000 -> 180,000 = 10%)
    assert result["drops_count"] == 1
    assert result["avg_drop_pct"] == 10.0
    assert result["total_drop_amount"] == 20000
    # Increases in July: 1 (ph2)
    assert result["increases_count"] == 1
    # Days to sell for p1: July 21 - July 1 = 20 days
    assert result["avg_days_to_sell"] == 20
    # Zone breakdown
    assert len(result["zone_breakdown"]) > 0


def test_get_interval_audit_zero_sales(analytics_db):
    """Test interval with 0 sales handles averages without division by zero."""
    service = AnalyticsService(analytics_db)
    result = service.get_interval_audit("2026-01-01", "2026-01-31")

    assert result["inclusions"] == 0
    assert result["sales"] == 0
    assert result["drops_count"] == 0
    assert result["avg_drop_pct"] == 0.0
    assert result["total_drop_amount"] == 0
    assert result["increases_count"] == 0
    assert result["avg_days_to_sell"] == 0
