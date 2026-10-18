"""End-to-end test suite validating Quickstart Scenarios 1 to 6.

References:
    specs/006-full-property-crawl/quickstart.md
"""

from contextlib import contextmanager
from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

from src.api.dependencies import get_db
from src.crawler.detail_service import run_detail_crawl
from src.database.models import DetailCrawlAttempt, Property, PropertyPhoto, PropertySnapshot
from src.main import app
from src.services.media_service import MediaService
from src.services.property_service import PropertyService


@pytest.fixture
def client(db_session):
    """Provide a TestClient with overridden get_db dependency."""
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@contextmanager
def patch_db_session(session):
    """Context manager yielding test db_session for get_db_session."""
    yield session


# =====================================================================
# Scenario 1: Ingestion Isolation (New Listing Queuing)
# =====================================================================
def test_scenario_1_ingestion_isolation(db_session):
    """Scenario 1: Newly discovered properties enter 'pending' while existing remain 'legacy'."""
    # 1. Existing listing in database before crawl
    legacy_prop = Property(
        idealista_id="e2e_legacy_001",
        title="Piso antiguo en Centro",
        location="Madrid",
        original_price=200000,
        current_price=200000,
        property_url="https://www.idealista.com/inmueble/e2e_legacy_001/",
        detail_status="legacy",
    )
    db_session.add(legacy_prop)
    db_session.commit()

    # 2. Ingest new property via PropertyService
    svc = PropertyService(db_session)
    new_prop = svc.create_property(
        {
            "idealista_id": "test_999001",
            "title": "Piso nuevo en Chamberi",
            "current_price": 350000,
            "property_url": "https://www.idealista.com/inmueble/test_999001/",
            "location": "Madrid",
        }
    )

    # 3. Assert status and retry state
    assert new_prop.detail_status == "pending"
    assert new_prop.backend_attempts == 0
    assert new_prop.extension_attempts == 0
    assert new_prop.fallback_to_extension is False
    assert new_prop.discard_reason is None

    # Verify legacy record was untouched
    db_session.refresh(legacy_prop)
    assert legacy_prop.detail_status == "legacy"


# =====================================================================
# Scenario 2: Backend Playwright Full Snapshot Crawl
# =====================================================================
@pytest.mark.asyncio
async def test_scenario_2_backend_playwright_snapshot_crawl(db_session, tmp_path):
    """Scenario 2: Backend Playwright extracts description, location attributes, and downloads photo binaries."""
    svc = PropertyService(db_session)
    prop = svc.create_property(
        {
            "idealista_id": "test_999002",
            "title": "Ático con vistas en Chamberí",
            "current_price": 450000,
            "property_url": "https://www.idealista.com/inmueble/test_999002/",
            "location": "Madrid",
        }
    )

    fake_crawler_result = {
        "source_engine": "backend_playwright",
        "full_description": "Espectacular ático recién reformado con amplia terraza soleada.",
        "neighborhood": "Chamberí",
        "district": "Chamberí",
        "city": "Madrid",
        "province": "Madrid",
        "latitude": 40.435,
        "longitude": -3.705,
        "features": {"bedrooms": 2, "bathrooms": 2, "terrace": True},
        "photos": [
            {
                "original_url": "https://img3.idealista.com/photo1.jpg",
                "sequence_index": 0,
                "caption": "Terraza soleada",
            },
            {
                "original_url": "https://img3.idealista.com/photo2.jpg",
                "sequence_index": 1,
                "caption": "Salón principal",
            },
        ],
        "challenge": "none",
        "is_delisted": False,
        "http_status": 200,
    }

    # Setup media directory
    media_dir = tmp_path / "media"
    properties_dir = media_dir / "properties"

    # Mock download_property_photos to physically create local image files in tmp_path
    async def fake_download(idealista_id, photos):
        saved = []
        target_dir = properties_dir / idealista_id
        target_dir.mkdir(parents=True, exist_ok=True)
        for p in photos:
            idx = p["sequence_index"]
            file_name = f"photo_{idx:03d}.jpg"
            file_path = target_dir / file_name
            file_path.write_bytes(b"\xff\xd8\xff\xe0mock_jpeg_binary")
            saved.append(
                {
                    "sequence_index": idx,
                    "original_url": p["original_url"],
                    "caption": p.get("caption"),
                    "local_file_path": f"properties/{idealista_id}/{file_name}",
                    "local_url": f"/media/properties/{idealista_id}/{file_name}",
                    "file_size_bytes": 18,
                    "content_type": "image/jpeg",
                }
            )
        return saved

    with patch(
        "src.crawler.detail_service.get_db_session",
        side_effect=lambda: patch_db_session(db_session),
    ):
        with patch(
            "src.crawler.detail_crawler.PlaywrightDetailCrawler.extract_listing_details",
            new=AsyncMock(return_value=fake_crawler_result),
        ):
            with patch.object(MediaService, "download_property_photos", side_effect=fake_download):
                await run_detail_crawl("test_999002")

    # Verify DB state
    db_session.refresh(prop)
    assert prop.detail_status == "completed"
    assert prop.snapshot is not None
    assert prop.snapshot.photos_count == 2
    assert "Espectacular ático" in prop.snapshot.full_description
    assert prop.snapshot.neighborhood == "Chamberí"
    assert prop.snapshot.city == "Madrid"

    # Verify local disk files
    target_disk_dir = properties_dir / "test_999002"
    assert target_disk_dir.exists()
    assert (target_disk_dir / "photo_000.jpg").exists()
    assert (target_disk_dir / "photo_001.jpg").exists()

    # Verify DetailCrawlAttempt logged
    attempts = db_session.query(DetailCrawlAttempt).filter_by(property_id=prop.id).all()
    assert len(attempts) >= 1
    assert attempts[-1].outcome == "success"
    assert attempts[-1].attempt_source == "backend"


# =====================================================================
# Scenario 3: Anti-Bot Challenge & Chrome Extension Fallback
# =====================================================================
def test_scenario_3_bot_challenge_and_extension_fallback(client, db_session):
    """Scenario 3: Backend challenge sets fallback_to_extension=True; extension polls and submits snapshot."""
    svc = PropertyService(db_session)
    prop = svc.create_property(
        {
            "idealista_id": "test_999003",
            "title": "Chalet en Las Rozas",
            "current_price": 600000,
            "property_url": "https://www.idealista.com/inmueble/test_999003/",
            "location": "Las Rozas",
        }
    )

    # 1. Simulate Bot Challenge on backend
    svc.record_backend_attempt(
        prop.id,
        challenge="cloudflare",
        outcome="retryable_error",
        http_status=403,
        error_message="Cloudflare Turnstile challenge encountered",
    )
    db_session.refresh(prop)
    assert prop.detail_status == "pending"
    assert prop.fallback_to_extension is True

    # 2. Poll Pending Queue via API
    res_pending = client.get("/api/v1/crawl/pending-details?priority_only=true")
    assert res_pending.status_code == 200
    pending_items = res_pending.json().get("items", [])
    matched = [item for item in pending_items if item["idealista_id"] == "test_999003"]
    assert len(matched) == 1
    assert matched[0]["property_url"] == prop.property_url

    # Also check /api/ alias route
    res_alias = client.get("/api/crawl/pending-details?priority_only=true")
    assert res_alias.status_code == 200

    # 3. Submit Snapshot from Extension
    extension_payload = {
        "source_engine": "chrome_extension",
        "full_description": "Espectacular chalet independiente con piscina.",
        "neighborhood": "El Cantizal",
        "city": "Las Rozas",
        "province": "Madrid",
        "photos": [
            {
                "original_url": "https://img3.idealista.com/chalet1.jpg",
                "sequence_index": 0,
                "caption": "Piscina",
            }
        ],
    }

    mock_download = [
        {
            "sequence_index": 0,
            "original_url": "https://img3.idealista.com/chalet1.jpg",
            "caption": "Piscina",
            "local_file_path": "properties/test_999003/photo_000.jpg",
            "local_url": "/media/properties/test_999003/photo_000.jpg",
            "file_size_bytes": 2500,
            "content_type": "image/jpeg",
        }
    ]

    with patch.object(
        MediaService, "download_property_photos", new=AsyncMock(return_value=mock_download)
    ):
        res_submit = client.post("/api/v1/crawl/details/test_999003", json=extension_payload)

    assert res_submit.status_code == 200
    body = res_submit.json()
    assert body["status"] == "success"
    assert body["detail_status"] == "completed"

    # 4. Verify DB state
    db_session.refresh(prop)
    assert prop.detail_status == "completed"
    assert prop.snapshot is not None
    assert prop.snapshot.source_engine == "chrome_extension"
    assert prop.snapshot.photos_count == 1


# =====================================================================
# Scenario 4: Discard on Confirmed Delisting (404/Removed)
# =====================================================================
@pytest.mark.asyncio
async def test_scenario_4_discard_on_confirmed_delisting(db_session):
    """Scenario 4: Delisted listing immediately transitions to discarded with reason 'delisted'."""
    svc = PropertyService(db_session)
    prop = svc.create_property(
        {
            "idealista_id": "test_999004",
            "title": "Estudio retirado",
            "current_price": 120000,
            "property_url": "https://www.idealista.com/inmueble/test_999004/",
            "location": "Madrid",
        }
    )

    with patch(
        "src.crawler.detail_service.get_db_session",
        side_effect=lambda: patch_db_session(db_session),
    ):
        await run_detail_crawl("test_999004", simulate_404=True)

    db_session.refresh(prop)
    assert prop.detail_status == "discarded"
    assert prop.discard_reason == "delisted"

    # Verify attempt logged
    attempts = db_session.query(DetailCrawlAttempt).filter_by(property_id=prop.id).all()
    assert len(attempts) >= 1
    assert attempts[-1].outcome == "delisted"
    assert attempts[-1].http_status == 404


# =====================================================================
# Scenario 5: Discard on 3 Failed Extension Attempts
# =====================================================================
def test_scenario_5_discard_on_3_failed_extension_attempts(client, db_session):
    """Scenario 5: 3 consecutive extension failures trigger discard with 'extension_retries_exhausted'."""
    svc = PropertyService(db_session)
    prop = svc.create_property(
        {
            "idealista_id": "test_999005",
            "title": "Apartamento conflictivo",
            "current_price": 250000,
            "property_url": "https://www.idealista.com/inmueble/test_999005/",
            "location": "Madrid",
        }
    )

    fail_payload = {
        "source_engine": "chrome_extension",
        "error_type": "bot_challenge",
        "error_message": "Captcha not solved in browser tab",
    }

    # Attempt 1
    res1 = client.post("/api/v1/crawl/details/test_999005/fail", json=fail_payload)
    assert res1.status_code == 200
    db_session.refresh(prop)
    assert prop.extension_attempts == 1
    assert prop.detail_status == "pending"

    # Attempt 2
    res2 = client.post("/api/v1/crawl/details/test_999005/fail", json=fail_payload)
    assert res2.status_code == 200
    db_session.refresh(prop)
    assert prop.extension_attempts == 2
    assert prop.detail_status == "pending"

    # Attempt 3 - Must discard listing
    res3 = client.post("/api/v1/crawl/details/test_999005/fail", json=fail_payload)
    assert res3.status_code == 200
    d3 = res3.json()
    assert d3["detail_status"] == "discarded"
    assert d3["discard_reason"] == "extension_retries_exhausted"

    db_session.refresh(prop)
    assert prop.extension_attempts == 3
    assert prop.detail_status == "discarded"
    assert prop.discard_reason == "extension_retries_exhausted"


# =====================================================================
# Scenario 6: Manual Operator Re-Queue
# =====================================================================
def test_scenario_6_manual_operator_requeue(client, db_session):
    """Scenario 6: Administrator rescues discarded listing via requeue API resetting attempts and status."""
    svc = PropertyService(db_session)
    prop = svc.create_property(
        {
            "idealista_id": "test_999006",
            "title": "Ático rescatable",
            "current_price": 400000,
            "property_url": "https://www.idealista.com/inmueble/test_999006/",
            "location": "Madrid",
        }
    )
    svc.record_backend_attempt(prop.id, challenge="cloudflare", outcome="retryable_error")
    svc.record_extension_attempt(prop.id, challenge="timeout", error_message="timeout")
    svc.mark_detail_discarded(prop.id, reason="extension_retries_exhausted")
    db_session.refresh(prop)
    assert prop.detail_status == "discarded"
    assert prop.discard_reason == "extension_retries_exhausted"
    assert prop.extension_attempts == 1

    # Operator triggers re-queue
    res = client.post(f"/api/v1/properties/{prop.id}/requeue-detail")
    assert res.status_code == 200
    data = res.json()
    assert data["detail_status"] == "pending"
    assert data["backend_attempts"] == 0
    assert data["extension_attempts"] == 0
    assert data["discard_reason"] is None

    # Verify DB state
    db_session.refresh(prop)
    assert prop.detail_status == "pending"
    assert prop.backend_attempts == 0
    assert prop.extension_attempts == 0
    assert prop.fallback_to_extension is False
    assert prop.discard_reason is None
