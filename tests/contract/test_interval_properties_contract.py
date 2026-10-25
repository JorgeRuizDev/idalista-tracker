"""Contract tests for GET /api/v1/properties with movement_type interval filtering."""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from src.main import app


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    return TestClient(app)


def test_get_properties_movement_type_inclusions(client):
    """Assert movement_type=inclusions filters properties first seen in the interval."""
    date_from = "2026-07-01"
    date_to = "2026-07-31"
    response = client.get(
        f"/api/v1/properties?movement_type=inclusions&date_from={date_from}&date_to={date_to}&limit=10"
    )
    assert response.status_code == 200
    data = response.json()

    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)

    dt_start = datetime.fromisoformat(date_from)
    dt_end = datetime.fromisoformat(date_to) + timedelta(days=1)

    for item in data["items"]:
        assert item["first_seen_at"] is not None
        seen_dt = datetime.fromisoformat(item["first_seen_at"])
        assert dt_start <= seen_dt < dt_end


def test_get_properties_movement_type_sales(client):
    """Assert movement_type=sales filters properties sold within the interval."""
    date_from = "2026-07-01"
    date_to = "2026-07-31"
    response = client.get(
        f"/api/v1/properties?movement_type=sales&date_from={date_from}&date_to={date_to}&limit=10"
    )
    assert response.status_code == 200
    data = response.json()

    assert "items" in data
    assert "total" in data

    dt_start = datetime.fromisoformat(date_from)
    dt_end = datetime.fromisoformat(date_to) + timedelta(days=1)

    for item in data["items"]:
        assert item["status"] == "sold"
        assert item["sold_at"] is not None
        sold_dt = datetime.fromisoformat(item["sold_at"])
        assert dt_start <= sold_dt < dt_end


def test_get_properties_movement_type_price_drops(client):
    """Assert movement_type=price_drops returns 200 and schema with drops in interval."""
    date_from = "2026-07-01"
    date_to = "2026-07-31"
    response = client.get(
        f"/api/v1/properties?movement_type=price_drops&date_from={date_from}&date_to={date_to}&limit=10"
    )
    assert response.status_code == 200
    data = response.json()

    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    if len(data["items"]) > 0:
        item = data["items"][0]
        assert "id" in item
        assert "price" in item or "current_price" in item


def test_get_properties_movement_type_price_increases(client):
    """Assert movement_type=price_increases returns 200 and valid schema."""
    date_from = "2026-07-01"
    date_to = "2026-07-31"
    response = client.get(
        f"/api/v1/properties?movement_type=price_increases&date_from={date_from}&date_to={date_to}&limit=10"
    )
    assert response.status_code == 200
    data = response.json()

    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


def test_get_properties_movement_type_with_zone(client):
    """Assert movement_type combined with zone filters accurately."""
    date_from = "2026-07-01"
    date_to = "2026-07-31"
    zone = "Gamonal - San Bruno - G9"
    response = client.get(
        f"/api/v1/properties?movement_type=inclusions&zone={zone}&date_from={date_from}&date_to={date_to}&limit=10"
    )
    assert response.status_code == 200
    data = response.json()

    for item in data["items"]:
        assert item["zone"] == zone
