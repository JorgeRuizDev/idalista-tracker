"""Contract test for manual override endpoints /requeue-detail and /discard-detail."""

import pytest
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


def test_manual_discard_and_requeue(client, db_session):
    """Test manual discard and subsequent requeue workflow."""
    prop = Property(
        idealista_id="override_701",
        title="Piso en Chamberí",
        location="Madrid",
        original_price=300000,
        current_price=300000,
        property_url="https://idealista.com/override_701",
        detail_status="pending",
        backend_attempts=2,
        extension_attempts=1,
        fallback_to_extension=True,
    )
    db_session.add(prop)
    db_session.commit()

    # 1. Manual Discard
    discard_payload = {"reason": "manual_discard", "note": "Duplicate listing or out of region"}
    res_disc = client.post(f"/api/v1/properties/{prop.id}/discard-detail", json=discard_payload)
    assert res_disc.status_code == 200
    d_data = res_disc.json()
    assert d_data["property_id"] == prop.id
    assert d_data["detail_status"] == "discarded"
    assert d_data["discard_reason"] == "manual_discard"

    # Verify DB
    db_session.refresh(prop)
    assert prop.detail_status == "discarded"
    assert prop.discard_reason == "manual_discard"

    # 2. Manual Re-queue
    res_req = client.post(f"/api/v1/properties/{prop.id}/requeue-detail")
    assert res_req.status_code == 200
    r_data = res_req.json()
    assert r_data["property_id"] == prop.id
    assert r_data["detail_status"] == "pending"
    assert r_data["backend_attempts"] == 0
    assert r_data["extension_attempts"] == 0
    assert r_data["discard_reason"] is None

    # Verify DB
    db_session.refresh(prop)
    assert prop.detail_status == "pending"
    assert prop.backend_attempts == 0
    assert prop.extension_attempts == 0
    assert prop.fallback_to_extension is False
    assert prop.discard_reason is None
