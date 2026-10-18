"""Contract test for GET /api/v1/properties asserting schema and sold metrics."""
import pytest
from fastapi.testclient import TestClient
from src.main import app


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)


def test_get_properties_contract_schema(client):
    """Assert GET /api/v1/properties returns payload matching contract specifications."""
    response = client.get("/api/v1/properties?limit=5")
    assert response.status_code == 200
    data = response.json()

    assert "items" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert isinstance(data["items"], list)

    if len(data["items"]) > 0:
        item = data["items"][0]
        # Required contract fields
        assert "id" in item
        assert "idealista_id" in item
        assert "title" in item
        assert "zone" in item
        assert "original_price" in item
        assert "current_price" in item
        assert "discount_amount" in item
        assert "discount_pct" in item
        assert "status" in item
        assert "property_url" in item
        assert "photos" in item
        assert isinstance(item["photos"], list)


def test_get_sold_properties_contract(client):
    """Assert GET /api/v1/properties?status=sold returns sold properties with days_on_market."""
    response = client.get("/api/v1/properties?status=sold&limit=5")
    assert response.status_code == 200
    data = response.json()

    for item in data["items"]:
        assert item["status"] == "sold"
        assert "days_on_market" in item
        assert "discount_amount" in item
        assert "discount_pct" in item
