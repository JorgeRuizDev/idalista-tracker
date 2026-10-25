"""End-to-end automated test suite for Automated Deep Crawl Scenarios 1 to 4.

References:
    specs/009-deep-crawl-inclusions/quickstart.md
"""

from datetime import datetime
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

from src.api.dependencies import get_db
from src.database.models import Property, PropertyPhoto, PropertySnapshot
from src.main import app
from src.services.media_service import MediaService
from src.services.property_service import PropertyService


@pytest.fixture
def client(db_session):
    """Provide a TestClient with overridden get_db dependency."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# =====================================================================
# Scenario 1: Verify Ingestion Marks New Inclusions as pending
# =====================================================================
def test_scenario_1_ingestion_marks_new_inclusions_as_pending(client, db_session):
    """Scenario 1: Ingest batch of new properties and verify pending queue."""
    # Ingest mock batch
    batch_payload = {
        "session_id": 99,
        "search_id": 1,
        "external_search_id": "search_e2e_sc1",
        "page": 1,
        "properties": [
            {
                "external_id": "test_inclusion_01",
                "title": "Piso en Test",
                "price": 250000,
                "currency": "EUR",
                "location": "Madrid",
                "url": "https://www.idealista.com/inmueble/test_inclusion_01/",
            }
        ],
        "metadata": {
            "crawled_at": datetime.utcnow().isoformat(),
            "extension_version": "1.0.0",
            "human_like_used": True,
        },
    }

    res_batch = client.post("/api/v1/properties/batch", json=batch_payload)
    assert res_batch.status_code == 200

    # Query pending details queue
    res_pending = client.get("/api/v1/crawl/pending-details?priority_only=false")
    assert res_pending.status_code == 200
    data = res_pending.json()

    assert data["pending_count"] >= 1
    items = data["items"]
    matched = [it for it in items if it["idealista_id"] == "test_inclusion_01"]
    assert len(matched) == 1
    assert matched[0]["property_url"] == "https://www.idealista.com/inmueble/test_inclusion_01/"


# =====================================================================
# Scenario 2: Verify Deep Analysis Snapshot Ingestion & Local Photo Storage
# =====================================================================
def test_scenario_2_snapshot_ingestion_and_photo_storage(client, db_session, tmp_path):
    """Scenario 2: Submit snapshot, verify photos downloaded, query snapshot API."""
    # Ensure property exists in pending state
    prop = Property(
        idealista_id="test_inclusion_02",
        title="Piso Chamberí Moderno",
        location="Madrid",
        original_price=275000,
        current_price=275000,
        property_url="https://www.idealista.com/inmueble/test_inclusion_02/",
        detail_status="pending",
    )
    db_session.add(prop)
    db_session.commit()

    detail_payload = {
        "source_engine": "chrome_extension",
        "delisted": False,
        "full_description": "Piso completamente exterior con mucha luz natural y acabados modernos.",
        "neighborhood": "Chamberí",
        "district": "Chamberí",
        "city": "Madrid",
        "features": {"general": ["Calefacción", "Ascensor"]},
        "photos": [
            {
                "original_url": "https://img3.idealista.com/blur/photo_e2e_01.jpg",
                "sequence_index": 0,
                "caption": "Salón amplio",
            }
        ],
    }

    mock_downloaded = [
        {
            "sequence_index": 0,
            "original_url": "https://img3.idealista.com/blur/photo_e2e_01.jpg",
            "local_file_path": "properties/test_inclusion_02/photo_000.jpg",
            "local_url": "/media/properties/test_inclusion_02/photo_000.jpg",
            "caption": "Salón amplio",
            "file_size_bytes": 15400,
            "content_type": "image/jpeg",
        }
    ]

    with patch.object(MediaService, "download_property_photos", new_callable=AsyncMock) as mock_dl:
        mock_dl.return_value = mock_downloaded
        res_submit = client.post("/api/v1/crawl/details/test_inclusion_02", json=detail_payload)

    assert res_submit.status_code == 200
    submit_data = res_submit.json()
    assert submit_data["status"] == "success"
    assert submit_data["detail_status"] == "completed"

    # Query property snapshot endpoint
    res_snap = client.get(f"/api/v1/properties/{prop.id}/snapshot")
    assert res_snap.status_code == 200
    snap_data = res_snap.json()
    assert snap_data["detail_status"] == "completed"
    assert "Piso completamente exterior" in snap_data["snapshot"]["full_description"]
    assert len(snap_data["snapshot"]["photos"]) == 1
    assert (
        "/media/properties/test_inclusion_02/photo_000.jpg"
        in snap_data["snapshot"]["photos"][0]["local_url"]
    )


# =====================================================================
# Scenario 3: Verify Automated Crawl Execution (Queue Exhaustion & Delisting)
# =====================================================================
def test_scenario_3_delisting_and_queue_exhaustion(client, db_session):
    """Scenario 3: Verify delisted property discarded and pending queue decrements."""
    prop1 = Property(
        idealista_id="test_inclusion_delist",
        title="Anuncio Caducado",
        location="Madrid",
        original_price=190000,
        current_price=190000,
        property_url="https://www.idealista.com/inmueble/test_inclusion_delist/",
        detail_status="pending",
    )
    db_session.add(prop1)
    db_session.commit()

    # Submit delisted flag
    res_delist = client.post(
        "/api/v1/crawl/details/test_inclusion_delist",
        json={"source_engine": "chrome_extension", "delisted": True, "photos": []},
    )
    assert res_delist.status_code == 200
    assert res_delist.json()["detail_status"] == "discarded"

    # Verify property is marked discarded
    db_session.refresh(prop1)
    assert prop1.detail_status == "discarded"
    assert prop1.discard_reason == "delisted"

    # Verify not present in pending details
    res_pending = client.get("/api/v1/crawl/pending-details?priority_only=false")
    pending_ids = [item["idealista_id"] for item in res_pending.json()["items"]]
    assert "test_inclusion_delist" not in pending_ids


# =====================================================================
# Scenario 4: Verify Property Detail Snapshot Endpoint Compatibility
# =====================================================================
def test_scenario_4_snapshot_endpoint_for_frontend_modal(client, db_session):
    """Scenario 4: Verify contract fields required by PropertyDetailModal."""
    prop = Property(
        idealista_id="test_modal_prop",
        title="Piso Centro Modal",
        location="Madrid",
        original_price=310000,
        current_price=300000,
        property_url="https://www.idealista.com/inmueble/test_modal_prop/",
        detail_status="completed",
        detail_updated_at=datetime.utcnow(),
    )
    db_session.add(prop)
    db_session.commit()

    snap = PropertySnapshot(
        property_id=prop.id,
        crawled_at=datetime.utcnow(),
        source_engine="chrome_extension",
        full_description="Descripción detallada de prueba para el modal.",
        neighborhood="Sol",
        district="Centro",
        city="Madrid",
        features={"equipamiento": ["Aire acondicionado", "Calefacción"]},
        photos_count=1,
    )
    db_session.add(snap)
    db_session.commit()

    photo = PropertyPhoto(
        property_id=prop.id,
        local_file_path="properties/test_modal_prop/photo_000.jpg",
        original_url="https://img3.idealista.com/photo.jpg",
        sequence_index=0,
        caption="Salón principal",
    )
    db_session.add(photo)
    db_session.commit()

    response = client.get(f"/api/v1/properties/{prop.id}/snapshot")
    assert response.status_code == 200
    data = response.json()

    assert data["property_id"] == prop.id
    assert data["idealista_id"] == "test_modal_prop"
    assert data["detail_status"] == "completed"
    assert data["snapshot"]["full_description"] == "Descripción detallada de prueba para el modal."
    assert "equipamiento" in data["snapshot"]["features"]
    assert len(data["snapshot"]["photos"]) == 1
    assert (
        data["snapshot"]["photos"][0]["local_url"]
        == "/media/properties/test_modal_prop/photo_000.jpg"
    )
