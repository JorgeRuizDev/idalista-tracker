"""End-to-end integration test validating the full analytics frontend flow.

Validates the complete workflow:
1. Property Explorer filtering (status=sold/active/all, zone, date range, pagination)
2. Normalized Zones Census (23 canonical Burgos zones)
3. Time Interval Audit (calendar/presets, KPI calculations, zone breakdown)
4. Macroeconomic Market Trends (monthly €/m², price drops vs sales volume)

References:
    specs/007-rebuild-analytics-frontend/plan.md
    specs/007-rebuild-analytics-frontend/quickstart.md
"""

from fastapi.testclient import TestClient
import pytest
from src.main import app
from src.database.models import SessionLocal, Property


@pytest.fixture(scope="module")
def real_db_client():
    """Test client that interacts with the real SQLite database."""
    session = SessionLocal()
    count = session.query(Property).count()
    session.close()
    if count == 0:
        pytest.skip("idealista_properties.db has no properties loaded.")

    with TestClient(app) as client:
        yield client


class TestAnalyticsFrontendFlowE2E:
    """E2E workflow tests against the real idealista_properties.db."""

    def test_01_zones_census_endpoint(self, real_db_client):
        """Verify GET /api/v1/zones returns all 23 canonical Burgos zones with accurate totals."""
        response = real_db_client.get("/api/v1/zones")
        assert response.status_code == 200
        zones = response.json()

        assert isinstance(zones, list)
        assert len(zones) == 23

        # Verify key canonical zones are present
        zone_names = {z["zone"] for z in zones}
        assert "Gamonal - San Bruno - G9" in zone_names
        assert "Casco Antiguo - Centro" in zone_names
        assert "San Pedro de la Fuente" in zone_names
        assert "Los Vadillos - Reyes Católicos" in zone_names

        # Verify census totals match sum of property records (2,190 in idealista_properties.db)
        total_in_zones = sum(z["total"] for z in zones)
        assert total_in_zones == 2190
        total_sold = sum(z["sold"] for z in zones)
        total_active = sum(z["active"] for z in zones)
        total_missing = sum(z["missing"] for z in zones)
        assert total_sold + total_active + total_missing == 2190

    def test_02_property_explorer_filtering_workflow(self, real_db_client):
        """Verify property listing filters for sold, active, zone, and date ranges."""
        # 1. Filter by status=sold
        resp_sold = real_db_client.get("/api/v1/properties?status=sold&limit=10")
        assert resp_sold.status_code == 200
        data_sold = resp_sold.json()
        assert data_sold["total"] > 0
        assert len(data_sold["items"]) <= 10
        for item in data_sold["items"]:
            assert item["status"] == "sold"
            assert item["zone"] is not None

        # 2. Filter by status=active
        resp_active = real_db_client.get("/api/v1/properties?status=active&limit=10")
        assert resp_active.status_code == 200
        data_active = resp_active.json()
        assert data_active["total"] > 0
        for item in data_active["items"]:
            assert item["status"] == "active"

        # 3. Filter by canonical zone
        target_zone = "Gamonal - San Bruno - G9"
        resp_zone = real_db_client.get(f"/api/v1/properties?zone={target_zone}&limit=50")
        assert resp_zone.status_code == 200
        data_zone = resp_zone.json()
        assert data_zone["total"] > 0
        for item in data_zone["items"]:
            assert item["zone"] == target_zone

        # 4. Filter by date window
        resp_date = real_db_client.get(
            "/api/v1/properties?date_from=2026-07-01&date_to=2026-07-31&status=sold&limit=20"
        )
        assert resp_date.status_code == 200
        data_date = resp_date.json()
        assert data_date["total"] > 0
        for item in data_date["items"]:
            assert item["status"] == "sold"
            if item.get("sold_at"):
                assert "2026-07-01" <= item["sold_at"][:10] <= "2026-07-31"

        # 5. Detail inspection of a sold property
        first_sold = data_sold["items"][0]
        assert "discount_pct" in first_sold
        assert "days_on_market" in first_sold
        assert "price_per_m2" in first_sold

    def test_03_time_interval_audit_workflow(self, real_db_client):
        """Verify GET /api/v1/analytics/interval returns audited KPIs and zone breakdown."""
        # Query for July 2026 preset
        resp = real_db_client.get("/api/v1/analytics/interval?start_date=2026-07-01&end_date=2026-07-31")
        assert resp.status_code == 200
        data = resp.json()

        assert data["start_date"] == "2026-07-01"
        assert data["end_date"] == "2026-07-31"

        assert data["inclusions"] > 0
        assert data["sales"] > 0
        assert data["drops_count"] >= 0
        assert data["increases_count"] >= 0
        assert data["avg_days_to_sell"] >= 0

        # Check zone breakdown
        breakdown = data["zone_breakdown"]
        assert len(breakdown) > 0
        for row in breakdown:
            assert "zone" in row
            assert "sales" in row
            assert "inclusions" in row
            assert "avg_days_to_sell" in row
            assert "avg_discount_pct" in row

        # Custom date interval
        resp_custom = real_db_client.get(
            "/api/v1/analytics/interval?start_date=2026-08-01&end_date=2026-09-15"
        )
        assert resp_custom.status_code == 200
        custom_data = resp_custom.json()
        assert custom_data["start_date"] == "2026-08-01"
        assert custom_data["end_date"] == "2026-09-15"
        assert custom_data["sales"] >= 0

    def test_04_macro_trends_workflow(self, real_db_client):
        """Verify GET /api/v1/analytics/trends produces macroeconomic monthly series."""
        resp = real_db_client.get("/api/v1/analytics/trends")
        assert resp.status_code == 200
        data = resp.json()

        assert "monthly" in data
        assert len(data["monthly"]) >= 5

        # Check months include May-Oct 2026
        months = [m["month"] for m in data["monthly"]]
        assert "2026-05" in months
        assert "2026-10" in months

        for point in data["monthly"]:
            assert point["avg_m2"] > 0
            assert point["properties_active"] >= 0
            assert point["properties_sold"] >= 0
            assert point["price_drops"] >= 0
            # Realistic price per m2 range for Burgos
            assert 1500 <= point["avg_m2"] <= 3000
