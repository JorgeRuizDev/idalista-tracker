"""Contract test for GET /api/v1/properties/{property_id}/snapshot."""

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


def test_get_snapshot_not_found(client):
    """Test 404 response when property or snapshot does not exist."""
    response = client.get("/api/v1/properties/999999/snapshot")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_snapshot_success(client, db_session):
    """Test 200 response with full snapshot contract schema."""
    # 1. Seed property
    prop = Property(
        idealista_id="104829104",
        title="Piso en calle Goya",
        location="Madrid",
        original_price=450000,
        current_price=450000,
        property_url="https://www.idealista.com/inmueble/104829104/",
        detail_status="completed",
        detail_updated_at=datetime.utcnow(),
    )
    db_session.add(prop)
    db_session.commit()

    # 2. Seed snapshot
    snapshot = PropertySnapshot(
        property_id=prop.id,
        crawled_at=datetime.utcnow(),
        source_engine="backend_playwright",
        full_description="Espectacular piso reformado en pleno barrio de Salamanca...",
        neighborhood="Goya",
        district="Salamanca",
        city="Madrid",
        province="Madrid",
        latitude=40.4241,
        longitude=-3.6765,
        features={"rooms": 3, "bathrooms": 2, "elevator": True},
        photos_count=1,
    )
    db_session.add(snapshot)
    db_session.commit()

    # 3. Seed photo
    photo = PropertyPhoto(
        property_id=prop.id,
        local_file_path="properties/104829104/photo_000_a1b2c3d4.jpg",
        original_url="https://img3.idealista.com/blur/WEB_DETAIL_TOP-L-L/0/id/104829104/1.jpg",
        sequence_index=0,
        caption="Salón principal",
        file_size_bytes=348210,
        content_type="image/jpeg",
    )
    db_session.add(photo)
    db_session.commit()

    # 4. Request snapshot
    response = client.get(f"/api/v1/properties/{prop.id}/snapshot")
    assert response.status_code == 200
    data = response.json()

    assert data["property_id"] == prop.id
    assert data["idealista_id"] == "104829104"
    assert data["detail_status"] == "completed"
    assert data["detail_updated_at"] is not None

    snap = data["snapshot"]
    assert snap is not None
    assert snap["source_engine"] == "backend_playwright"
    assert "Espectacular piso reformado" in snap["full_description"]
    assert snap["neighborhood"] == "Goya"
    assert snap["district"] == "Salamanca"
    assert snap["city"] == "Madrid"
    assert snap["latitude"] == pytest.approx(40.4241)
    assert snap["longitude"] == pytest.approx(-3.6765)
    assert snap["features"] == {"rooms": 3, "bathrooms": 2, "elevator": True}

    assert len(snap["photos"]) == 1
    p0 = snap["photos"][0]
    assert p0["sequence_index"] == 0
    assert p0["local_url"] == "/media/properties/104829104/photo_000_a1b2c3d4.jpg"
    assert p0["caption"] == "Salón principal"
    assert p0["file_size_bytes"] == 348210
