"""Contract tests for GET /api/v1/crawl/pending-details and POST /api/v1/crawl/details/{idealista_id}."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from src.database.models import Property, PropertySnapshot
from src.main import app
from src.api.dependencies import get_db
from src.services.media_service import MediaService


@pytest.fixture
def client(db_session):
    """Provide a TestClient with overridden get_db dependency."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_get_pending_details_filtering(client, db_session):
    """Test retrieving pending listings with fallback priority."""
    # Property 1: legacy (should be excluded)
    p_leg = Property(
        idealista_id="pend_leg",
        title="Legacy",
        location="Madrid",
        original_price=100000,
        current_price=100000,
        property_url="https://idealista.com/1",
        detail_status="legacy",
    )
    # Property 2: pending without fallback
    p_pend = Property(
        idealista_id="pend_norm",
        title="Pending Normal",
        location="Madrid",
        original_price=200000,
        current_price=200000,
        property_url="https://idealista.com/2",
        detail_status="pending",
        fallback_to_extension=False,
    )
    # Property 3: pending with fallback_to_extension=True
    p_prio = Property(
        idealista_id="pend_prio",
        title="Pending Priority",
        location="Madrid",
        original_price=300000,
        current_price=300000,
        property_url="https://idealista.com/3",
        detail_status="pending",
        fallback_to_extension=True,
    )
    db_session.add_all([p_leg, p_pend, p_prio])
    db_session.commit()

    # Query with priority_only=true (default)
    res_prio = client.get("/api/v1/crawl/pending-details?priority_only=true")
    assert res_prio.status_code == 200
    data_prio = res_prio.json()
    assert data_prio["pending_count"] == 1
    assert data_prio["items"][0]["idealista_id"] == "pend_prio"

    # Query with priority_only=false
    res_all = client.get("/api/v1/crawl/pending-details?priority_only=false")
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["pending_count"] == 2
    # Verify legacy is excluded
    ids = [item["idealista_id"] for item in data_all["items"]]
    assert "pend_prio" in ids
    assert "pend_norm" in ids
    assert "pend_leg" not in ids


def test_submit_detail_snapshot(client, db_session):
    """Test submitting listing details from extension fallback tier."""
    prop = Property(
        idealista_id="ext_sub_101",
        title="Piso Chamberí",
        location="Madrid",
        original_price=350000,
        current_price=350000,
        property_url="https://idealista.com/ext_sub_101",
        detail_status="pending",
        fallback_to_extension=True,
    )
    db_session.add(prop)
    db_session.commit()

    payload = {
        "source_engine": "chrome_extension",
        "full_description": "Ático luminoso en venta en Almagro",
        "neighborhood": "Almagro",
        "district": "Chamberí",
        "city": "Madrid",
        "province": "Madrid",
        "latitude": 40.4312,
        "longitude": -3.6911,
        "features": {"rooms": 2, "terrace": True},
        "photos": [
            {
                "original_url": "https://img3.idealista.com/blur/ext1.jpg",
                "sequence_index": 0,
                "caption": "Terraza exterior",
            }
        ],
    }

    # Mock photo downloads
    fake_downloaded = [
        {
            "sequence_index": 0,
            "original_url": "https://img3.idealista.com/blur/ext1.jpg",
            "local_file_path": "properties/ext_sub_101/photo_000.jpg",
            "local_url": "/media/properties/ext_sub_101/photo_000.jpg",
            "caption": "Terraza exterior",
            "file_size_bytes": 8000,
            "content_type": "image/jpeg",
        }
    ]

    with patch.object(MediaService, "download_property_photos", new_callable=AsyncMock) as mock_dl:
        mock_dl.return_value = fake_downloaded
        response = client.post("/api/v1/crawl/details/ext_sub_101", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["idealista_id"] == "ext_sub_101"
    assert data["detail_status"] == "completed"
    assert data["photos_downloaded"] == 1

    # Verify database state
    db_session.refresh(prop)
    assert prop.detail_status == "completed"
    assert prop.snapshot is not None
    assert prop.snapshot.source_engine == "chrome_extension"
    assert prop.snapshot.neighborhood == "Almagro"
