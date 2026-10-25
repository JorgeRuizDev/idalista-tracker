"""Contract test for GET /api/v1/crawl/pending-details with priority_only=false."""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from src.database.models import Property
from src.main import app
from src.api.dependencies import get_db


@pytest.fixture
def client(db_session):
    """Provide a TestClient with overridden get_db dependency."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_get_pending_details_all_contract(client, db_session):
    """Test retrieving all pending listings with priority_only=false."""
    now = datetime.utcnow()
    # Create properties with different statuses and created_at timestamps
    p_older = Property(
        idealista_id="pend_all_older",
        title="Older Pending",
        location="Madrid",
        original_price=150000,
        current_price=150000,
        property_url="https://idealista.com/all1",
        detail_status="pending",
        fallback_to_extension=False,
        created_at=now - timedelta(hours=2),
    )
    p_newer = Property(
        idealista_id="pend_all_newer",
        title="Newer Pending",
        location="Madrid",
        original_price=250000,
        current_price=250000,
        property_url="https://idealista.com/all2",
        detail_status="pending",
        fallback_to_extension=False,
        created_at=now,
    )
    p_priority = Property(
        idealista_id="pend_all_priority",
        title="Priority Pending",
        location="Madrid",
        original_price=350000,
        current_price=350000,
        property_url="https://idealista.com/all3",
        detail_status="pending",
        fallback_to_extension=True,
        created_at=now - timedelta(hours=1),
    )
    p_completed = Property(
        idealista_id="pend_all_completed",
        title="Completed",
        location="Madrid",
        original_price=450000,
        current_price=450000,
        property_url="https://idealista.com/all4",
        detail_status="completed",
        fallback_to_extension=False,
    )
    p_discarded = Property(
        idealista_id="pend_all_discarded",
        title="Discarded",
        location="Madrid",
        original_price=550000,
        current_price=550000,
        property_url="https://idealista.com/all5",
        detail_status="discarded",
        fallback_to_extension=False,
    )

    db_session.add_all([p_older, p_newer, p_priority, p_completed, p_discarded])
    db_session.commit()

    # Query with priority_only=false
    response = client.get("/api/v1/crawl/pending-details?priority_only=false&limit=10")
    assert response.status_code == 200
    data = response.json()

    assert "pending_count" in data
    assert "items" in data
    assert data["pending_count"] == 3
    assert len(data["items"]) == 3

    # Ensure completed and discarded are not present
    idealista_ids = [item["idealista_id"] for item in data["items"]]
    assert "pend_all_completed" not in idealista_ids
    assert "pend_all_discarded" not in idealista_ids

    # Verify item structure
    first_item = data["items"][0]
    assert "property_id" in first_item
    assert "idealista_id" in first_item
    assert "property_url" in first_item
    assert "extension_attempts" in first_item


def test_get_pending_details_supports_large_batch(client, db_session):
    """Test that pending-details supports limits above 20 (e.g. 50 or 100)."""
    now = datetime.utcnow()
    props = [
        Property(
            idealista_id=f"pend_batch_{i}",
            title=f"Pending {i}",
            location="Madrid",
            original_price=100000 + i * 1000,
            current_price=100000 + i * 1000,
            property_url=f"https://idealista.com/batch_{i}",
            detail_status="pending",
            created_at=now - timedelta(minutes=i),
        )
        for i in range(25)
    ]
    db_session.add_all(props)
    db_session.commit()

    response = client.get("/api/v1/crawl/pending-details?priority_only=false&limit=50")
    assert response.status_code == 200
    data = response.json()
    assert data["pending_count"] == 25
    assert len(data["items"]) == 25
