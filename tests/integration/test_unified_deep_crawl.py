"""Integration test for two-stage crawl submission, photo downloading, and snapshot persistence."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from src.database.models import Property, PropertySnapshot, PropertyPhoto
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


def test_unified_two_stage_crawl_pipeline(client, db_session, tmp_path):
    """Test full cycle: batch ingestion -> pending queue -> detail snapshot completion."""
    # 1. Stage 1: Batch ingestion simulates extension discovery
    batch_payload = {
        "session_id": 1,
        "search_id": 10,
        "external_search_id": "search_unified",
        "page": 1,
        "properties": [
            {
                "external_id": "uni_prop_01",
                "title": "Piso Luminoso en Chamberí",
                "price": 320000,
                "currency": "EUR",
                "location": "Madrid",
                "url": "https://www.idealista.com/inmueble/uni_prop_01/",
                "square_meters": 75,
                "bedrooms": 2,
                "floor_info": "3ª planta exterior",
                "photos": ["https://img3.idealista.com/blur/cover.jpg"],
            }
        ],
        "metadata": {
            "crawled_at": "2026-10-25T20:00:00Z",
            "extension_version": "1.0.0",
            "human_like_used": True,
        },
    }

    res_batch = client.post("/api/v1/properties/batch", json=batch_payload)
    assert res_batch.status_code == 200
    batch_data = res_batch.json()
    assert batch_data["success"] is True
    assert batch_data["summary"]["created"] == 1

    # Verify newly created property is pending in database
    prop = db_session.query(Property).filter(Property.idealista_id == "uni_prop_01").first()
    assert prop is not None
    assert prop.detail_status == "pending"

    # 2. Extension queries pending details queue
    res_pending = client.get("/api/v1/crawl/pending-details?priority_only=false")
    assert res_pending.status_code == 200
    pending_data = res_pending.json()
    assert pending_data["pending_count"] >= 1
    ids = [item["idealista_id"] for item in pending_data["items"]]
    assert "uni_prop_01" in ids

    # 3. Stage 2: Extension navigates to property and submits detail snapshot
    detail_payload = {
        "source_engine": "chrome_extension",
        "delisted": False,
        "full_description": "Fantástico piso en Chamberí reformado íntegramente.",
        "neighborhood": "Trafalgar",
        "district": "Chamberí",
        "city": "Madrid",
        "province": "Madrid",
        "latitude": 40.432,
        "longitude": -3.701,
        "features": {
            "características básicas": ["75 m² construidos", "2 habitaciones", "1 baño"],
            "edificio": ["Planta 3ª exterior", "Con ascensor"],
        },
        "photos": [
            {
                "original_url": "https://img3.idealista.com/blur/photo_01.jpg",
                "sequence_index": 0,
                "caption": "Salón",
            },
            {
                "original_url": "https://img3.idealista.com/blur/photo_02.jpg",
                "sequence_index": 1,
                "caption": "Cocina",
            },
        ],
    }

    mock_downloaded = [
        {
            "sequence_index": 0,
            "original_url": "https://img3.idealista.com/blur/photo_01.jpg",
            "local_file_path": "properties/uni_prop_01/photo_000.jpg",
            "local_url": "/media/properties/uni_prop_01/photo_000.jpg",
            "caption": "Salón",
            "file_size_bytes": 12400,
            "content_type": "image/jpeg",
        },
        {
            "sequence_index": 1,
            "original_url": "https://img3.idealista.com/blur/photo_02.jpg",
            "local_file_path": "properties/uni_prop_01/photo_001.jpg",
            "local_url": "/media/properties/uni_prop_01/photo_001.jpg",
            "caption": "Cocina",
            "file_size_bytes": 9800,
            "content_type": "image/jpeg",
        },
    ]

    with patch.object(MediaService, "download_property_photos", new_callable=AsyncMock) as mock_dl:
        mock_dl.return_value = mock_downloaded
        res_submit = client.post("/api/v1/crawl/details/uni_prop_01", json=detail_payload)

    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["status"] == "success"
    assert submit_data["detail_status"] == "completed"
    assert submit_data["photos_downloaded"] == 2

    # 4. Verify DB state after completion
    db_session.refresh(prop)
    assert prop.detail_status == "completed"
    assert prop.detail_updated_at is not None
    assert prop.snapshot is not None
    assert prop.snapshot.full_description == "Fantástico piso en Chamberí reformado íntegramente."
    assert prop.snapshot.photos_count == 2
    assert len(prop.photos) == 2

    # 5. Verify pending queue now decremented
    res_pending_after = client.get("/api/v1/crawl/pending-details?priority_only=false")
    pending_after_data = res_pending_after.json()
    ids_after = [item["idealista_id"] for item in pending_after_data["items"]]
    assert "uni_prop_01" not in ids_after


def test_unified_crawl_handles_delisted_property(client, db_session):
    """Test delisted property transition to discarded status with reason."""
    prop = Property(
        idealista_id="uni_delisted_01",
        title="Piso Desactivado",
        location="Madrid",
        original_price=200000,
        current_price=200000,
        property_url="https://www.idealista.com/inmueble/uni_delisted_01/",
        detail_status="pending",
    )
    db_session.add(prop)
    db_session.commit()

    delisted_payload = {
        "source_engine": "chrome_extension",
        "delisted": True,
        "photos": [],
    }

    res_delist = client.post("/api/v1/crawl/details/uni_delisted_01", json=delisted_payload)
    assert res_delist.status_code == 200
    data = res_delist.json()
    assert data["detail_status"] == "discarded"

    db_session.refresh(prop)
    assert prop.detail_status == "discarded"
    assert prop.discard_reason == "delisted"
