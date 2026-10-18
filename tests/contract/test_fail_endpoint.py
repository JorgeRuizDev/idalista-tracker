"""Contract test for POST /api/v1/crawl/details/{idealista_id}/fail and 3-attempt discard limit."""

import pytest
from fastapi.testclient import TestClient

from src.database.models import DetailCrawlAttempt, Property
from src.main import app
from src.api.dependencies import get_db


@pytest.fixture
def client(db_session):
    """Provide a TestClient with overridden get_db dependency."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_extension_fail_endpoint_3_attempt_exhaustion(client, db_session):
    """Test reporting 3 consecutive extension failures transitions status to discarded."""
    prop = Property(
        idealista_id="fail_test_301",
        title="Test Listing Fail",
        location="Madrid",
        original_price=300000,
        current_price=300000,
        property_url="https://idealista.com/fail_test_301",
        detail_status="pending",
        fallback_to_extension=True,
        extension_attempts=0,
    )
    db_session.add(prop)
    db_session.commit()

    payload = {
        "source_engine": "chrome_extension",
        "error_type": "bot_challenge",
        "error_message": "Cloudflare challenge page loaded without completion",
        "http_status": 403,
    }

    # Failure 1
    res1 = client.post("/api/v1/crawl/details/fail_test_301/fail", json=payload)
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["status"] == "recorded"
    assert d1["current_attempts"] == 1
    assert d1["detail_status"] == "pending"
    assert d1["discard_reason"] is None

    # Failure 2
    res2 = client.post("/api/v1/crawl/details/fail_test_301/fail", json=payload)
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["current_attempts"] == 2
    assert d2["detail_status"] == "pending"

    # Failure 3 -> triggers discard transition
    res3 = client.post("/api/v1/crawl/details/fail_test_301/fail", json=payload)
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["current_attempts"] == 3
    assert d3["detail_status"] == "discarded"
    assert d3["discard_reason"] == "extension_retries_exhausted"

    # Check database state
    db_session.refresh(prop)
    assert prop.extension_attempts == 3
    assert prop.detail_status == "discarded"
    assert prop.discard_reason == "extension_retries_exhausted"

    # Audit attempts logged
    attempts = db_session.query(DetailCrawlAttempt).filter_by(property_id=prop.id).all()
    assert len(attempts) == 3
    assert attempts[0].attempt_source == "extension"
    assert (
        attempts[0].challenge_detected == "bot_challenge"
        or attempts[0].challenge_detected == "cloudflare"
    )
