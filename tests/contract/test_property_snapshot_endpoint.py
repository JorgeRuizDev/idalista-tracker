"""Contract test for GET /api/v1/properties/{property_id}/snapshot endpoint."""

from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from src.database.models import Property, PropertyPhoto, PropertySnapshot
from src.main import app
from src.api.dependencies import get_db


@pytest.fixture
def client(db_session):
    """Provide a TestClient with overridden get_db dependency."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_get_property_snapshot_contract_success(client, db_session):
    """Test 200 OK contract adherence for complete property snapshot."""
    prop = Property(
        idealista_id="snap_contract_101",
        title="Piso en Trafalgar",
        location="Madrid",
        original_price=380000,
        current_price=380000,
        property_url="https://www.idealista.com/inmueble/snap_contract_101/",
        detail_status="completed",
        detail_updated_at=datetime.utcnow(),
    )
    db_session.add(prop)
    db_session.commit()

    snapshot = PropertySnapshot(
        property_id=prop.id,
        crawled_at=datetime.utcnow(),
        source_engine="chrome_extension",
        full_description="Luminosa vivienda exterior con balcón y excelentes calidades.",
        neighborhood="Trafalgar",
        district="Chamberí",
        city="Madrid",
        province="Madrid",
        latitude=40.435,
        longitude=-3.702,
        features={
            "características básicas": ["85 m² construidos", "2 habitaciones", "1 baño"],
            "edificio": ["Planta 3ª exterior", "Con ascensor"],
            "equipamiento": ["Aire acondicionado"],
        },
        photos_count=2,
    )
    db_session.add(snapshot)
    db_session.commit()

    p1 = PropertyPhoto(
        property_id=prop.id,
        local_file_path="properties/snap_contract_101/photo_0.jpg",
        original_url="https://img3.idealista.com/blur/photo_0.jpg",
        sequence_index=0,
        caption="Salón principal luminoso",
        file_size_bytes=24000,
        content_type="image/jpeg",
    )
    p2 = PropertyPhoto(
        property_id=prop.id,
        local_file_path="properties/snap_contract_101/photo_1.jpg",
        original_url="https://img3.idealista.com/blur/photo_1.jpg",
        sequence_index=1,
        caption="Cocina equipada",
        file_size_bytes=18000,
        content_type="image/jpeg",
    )
    db_session.add_all([p1, p2])
    db_session.commit()

    response = client.get(f"/api/v1/properties/{prop.id}/snapshot")
    assert response.status_code == 200
    data = response.json()

    assert data["property_id"] == prop.id
    assert data["idealista_id"] == "snap_contract_101"
    assert data["detail_status"] == "completed"

    snap = data["snapshot"]
    assert snap is not None
    assert snap["source_engine"] == "chrome_extension"
    assert "Luminosa vivienda exterior" in snap["full_description"]
    assert snap["neighborhood"] == "Trafalgar"
    assert snap["district"] == "Chamberí"
    assert snap["city"] == "Madrid"
    assert "características básicas" in snap["features"]

    assert len(snap["photos"]) == 2
    assert snap["photos"][0]["sequence_index"] == 0
    assert snap["photos"][0]["caption"] == "Salón principal luminoso"
    assert "/media/properties/snap_contract_101/photo_0.jpg" in snap["photos"][0]["local_url"]
    assert snap["photos"][1]["sequence_index"] == 1


def test_get_property_snapshot_uncrawled_or_missing(client, db_session):
    """Test 404 response for pending property without completed snapshot."""
    prop = Property(
        idealista_id="snap_contract_pending",
        title="Piso Pendiente",
        location="Madrid",
        original_price=200000,
        current_price=200000,
        property_url="https://www.idealista.com/inmueble/snap_contract_pending/",
        detail_status="pending",
    )
    db_session.add(prop)
    db_session.commit()

    response = client.get(f"/api/v1/properties/{prop.id}/snapshot")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
