"""Contract test for GET /api/v1/analytics/trends."""
import pytest
from fastapi.testclient import TestClient
from src.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_market_trends_contract(client):
    """Assert monthly trends endpoint returns monthly series matching contract."""
    response = client.get("/api/v1/analytics/trends")
    assert response.status_code == 200
    data = response.json()

    assert "monthly" in data
    assert isinstance(data["monthly"], list)
    assert len(data["monthly"]) == 6  # May - Oct 2026

    for item in data["monthly"]:
        assert "month" in item
        assert "label" in item
        assert "avg_price" in item
        assert "avg_m2" in item
        assert "properties_active" in item
        assert "properties_sold" in item
        assert "price_drops" in item
        assert "avg_drop_pct" in item
        assert item["avg_price"] >= 0
        assert item["avg_m2"] >= 0
