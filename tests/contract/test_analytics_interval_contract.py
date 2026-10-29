"""Contract test for GET /api/v1/analytics/interval."""
import pytest
from fastapi.testclient import TestClient
from src.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_interval_audit_contract(client):
    """Assert interval audit endpoint returns schema matching API contract."""
    response = client.get("/api/v1/analytics/interval?start_date=2026-07-01&end_date=2026-07-31")
    assert response.status_code == 200
    data = response.json()

    assert data["start_date"] == "2026-07-01"
    assert data["end_date"] == "2026-07-31"
    assert "interval_label" in data
    assert "inclusions" in data
    assert "sales" in data
    assert "drops_count" in data
    assert "avg_drop_pct" in data
    assert "total_drop_amount" in data
    assert "increases_count" in data
    assert "avg_inc_pct" in data
    assert "avg_days_to_sell" in data
    assert "avg_m2" in data
    assert "zone_breakdown" in data
    assert isinstance(data["zone_breakdown"], list)

    if len(data["zone_breakdown"]) > 0:
        z = data["zone_breakdown"][0]
        assert "zone" in z
        assert "inclusions" in z
        assert "sales" in z
        assert "avg_days_to_sell" in z
        assert "avg_discount_pct" in z
        assert "avg_sale_price" in z
        assert "avg_m2" in z


def test_get_interval_audit_missing_dates(client):
    """Assert 422 Unprocessable Entity when required dates are missing."""
    response = client.get("/api/v1/analytics/interval")
    assert response.status_code == 422
