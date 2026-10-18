"""Contract test for GET /api/v1/properties?detail_status=... query filtering."""

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


def test_filter_properties_by_detail_status(client, db_session):
    """Test filtering properties by all 4 detail statuses (legacy, pending, completed, discarded)."""
    p_leg = Property(
        idealista_id="filt_leg",
        title="Piso Legacy",
        location="Madrid",
        original_price=100000,
        current_price=100000,
        property_url="https://idealista.com/filt_leg",
        detail_status="legacy",
    )
    p_pend = Property(
        idealista_id="filt_pend",
        title="Piso Pending",
        location="Madrid",
        original_price=200000,
        current_price=200000,
        property_url="https://idealista.com/filt_pend",
        detail_status="pending",
    )
    p_comp = Property(
        idealista_id="filt_comp",
        title="Piso Completed",
        location="Madrid",
        original_price=300000,
        current_price=300000,
        property_url="https://idealista.com/filt_comp",
        detail_status="completed",
    )
    p_disc = Property(
        idealista_id="filt_disc",
        title="Piso Discarded",
        location="Madrid",
        original_price=400000,
        current_price=400000,
        property_url="https://idealista.com/filt_disc",
        detail_status="discarded",
        discard_reason="delisted",
    )
    db_session.add_all([p_leg, p_pend, p_comp, p_disc])
    db_session.commit()

    # 1. Filter legacy
    res_leg = client.get("/api/v1/properties?detail_status=legacy")
    assert res_leg.status_code == 200
    for item in res_leg.json()["items"]:
        assert item["detail_status"] == "legacy"
    items_leg = [i for i in res_leg.json()["items"] if i["idealista_id"].startswith("filt_")]
    assert len(items_leg) == 1
    assert items_leg[0]["idealista_id"] == "filt_leg"

    # 2. Filter pending
    res_pend = client.get("/api/v1/properties?detail_status=pending")
    assert res_pend.status_code == 200
    for item in res_pend.json()["items"]:
        assert item["detail_status"] == "pending"
    items_pend = [i for i in res_pend.json()["items"] if i["idealista_id"].startswith("filt_")]
    assert len(items_pend) == 1
    assert items_pend[0]["idealista_id"] == "filt_pend"

    # 3. Filter completed
    res_comp = client.get("/api/v1/properties?detail_status=completed")
    assert res_comp.status_code == 200
    for item in res_comp.json()["items"]:
        assert item["detail_status"] == "completed"
    items_comp = [i for i in res_comp.json()["items"] if i["idealista_id"].startswith("filt_")]
    assert len(items_comp) == 1
    assert items_comp[0]["idealista_id"] == "filt_comp"

    # 4. Filter discarded
    res_disc = client.get("/api/v1/properties?detail_status=discarded")
    assert res_disc.status_code == 200
    for item in res_disc.json()["items"]:
        assert item["detail_status"] == "discarded"
    items_disc = [i for i in res_disc.json()["items"] if i["idealista_id"].startswith("filt_")]
    assert len(items_disc) == 1
    assert items_disc[0]["idealista_id"] == "filt_disc"
    assert items_disc[0]["discard_reason"] == "delisted"
