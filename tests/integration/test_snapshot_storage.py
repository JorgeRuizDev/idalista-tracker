"""Integration tests for property snapshot storage and photo downloading pipeline."""

import pytest
from unittest.mock import AsyncMock, patch

from src.database.models import Property, PropertyPhoto, PropertySnapshot
from src.services.media_service import MediaService
from src.services.property_service import PropertyService


@pytest.mark.asyncio
async def test_save_property_snapshot_orchestration(db_session, tmp_path):
    """Test persisting PropertySnapshot, downloading photos, and updating status to completed."""
    # Create test property
    prop = Property(
        idealista_id="snap_101",
        title="Piso en Salamanca",
        location="Madrid",
        original_price=500000,
        current_price=500000,
        property_url="https://www.idealista.com/inmueble/snap_101/",
        detail_status="pending",
    )
    db_session.add(prop)
    db_session.commit()

    service = PropertyService(db_session)
    media_service = MediaService(
        media_root=str(tmp_path / "media"),
        property_media_dir=str(tmp_path / "media" / "properties"),
    )

    snapshot_data = {
        "source_engine": "backend_playwright",
        "full_description": "Fantástico ático con terraza.",
        "neighborhood": "Goya",
        "district": "Salamanca",
        "city": "Madrid",
        "province": "Madrid",
        "latitude": 40.42,
        "longitude": -3.67,
        "features": {"bedrooms": 2, "terrace": True},
        "photos": [
            {
                "original_url": "https://img3.idealista.com/blur/photo1.jpg",
                "sequence_index": 0,
                "caption": "Terraza",
            },
            {
                "original_url": "https://img3.idealista.com/blur/photo2.jpg",
                "sequence_index": 1,
                "caption": "Salón",
            },
        ],
    }

    # Mock media service download to avoid live network calls in integration test
    fake_downloaded = [
        {
            "sequence_index": 0,
            "original_url": "https://img3.idealista.com/blur/photo1.jpg",
            "local_file_path": "properties/snap_101/photo_000_1.jpg",
            "local_url": "/media/properties/snap_101/photo_000_1.jpg",
            "caption": "Terraza",
            "file_size_bytes": 10240,
            "content_type": "image/jpeg",
        },
        {
            "sequence_index": 1,
            "original_url": "https://img3.idealista.com/blur/photo2.jpg",
            "local_file_path": "properties/snap_101/photo_001_2.jpg",
            "local_url": "/media/properties/snap_101/photo_001_2.jpg",
            "caption": "Salón",
            "file_size_bytes": 15360,
            "content_type": "image/jpeg",
        },
    ]

    with patch.object(
        media_service, "download_property_photos", new_callable=AsyncMock
    ) as mock_download:
        mock_download.return_value = fake_downloaded
        updated_prop = await service.save_property_snapshot(
            property_id=prop.id,
            snapshot_data=snapshot_data,
            media_service=media_service,
        )

    assert updated_prop.detail_status == "completed"
    assert updated_prop.detail_updated_at is not None

    # Verify Snapshot in DB
    snapshot = db_session.query(PropertySnapshot).filter_by(property_id=prop.id).first()
    assert snapshot is not None
    assert snapshot.source_engine == "backend_playwright"
    assert snapshot.full_description == "Fantástico ático con terraza."
    assert snapshot.neighborhood == "Goya"
    assert snapshot.photos_count == 2
    assert snapshot.features == {"bedrooms": 2, "terrace": True}

    # Verify Photos in DB
    photos = (
        db_session.query(PropertyPhoto)
        .filter_by(property_id=prop.id)
        .order_by(PropertyPhoto.sequence_index)
        .all()
    )
    assert len(photos) == 2
    assert photos[0].sequence_index == 0
    assert photos[0].local_file_path == "properties/snap_101/photo_000_1.jpg"
    assert photos[0].caption == "Terraza"
    assert photos[1].sequence_index == 1
