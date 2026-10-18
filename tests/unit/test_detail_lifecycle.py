"""Unit tests for property detail crawl lifecycle state machine."""

import pytest
from datetime import datetime
from src.database.models import Property
from src.services.property_service import PropertyService


def test_new_property_detail_defaults(db_session):
    """Test that newly created properties initialize with pending detail status."""
    service = PropertyService(db_session)
    prop = Property(
        idealista_id="prop_test_001",
        title="Piso de prueba",
        location="Madrid",
        original_price=200000,
        current_price=200000,
        property_url="https://www.idealista.com/inmueble/prop_test_001/",
        detail_status="pending",
        backend_attempts=0,
        extension_attempts=0,
        fallback_to_extension=False,
    )
    db_session.add(prop)
    db_session.commit()

    assert prop.detail_status == "pending"
    assert prop.backend_attempts == 0
    assert prop.extension_attempts == 0
    assert prop.fallback_to_extension is False
    assert prop.discard_reason is None
    assert prop.detail_updated_at is None


def test_mark_detail_completed(db_session):
    """Test transitioning a property to completed detail status."""
    service = PropertyService(db_session)
    prop = Property(
        idealista_id="prop_test_002",
        title="Piso de prueba 2",
        location="Madrid",
        original_price=250000,
        current_price=250000,
        property_url="https://www.idealista.com/inmueble/prop_test_002/",
        detail_status="pending",
    )
    db_session.add(prop)
    db_session.commit()

    updated = service.mark_detail_completed(prop.id)
    assert updated.detail_status == "completed"
    assert updated.detail_updated_at is not None
    assert updated.discard_reason is None


def test_mark_detail_discarded_valid_reasons(db_session):
    """Test transitioning to discarded with valid reasons."""
    service = PropertyService(db_session)
    prop = Property(
        idealista_id="prop_test_003",
        title="Piso de prueba 3",
        location="Madrid",
        original_price=300000,
        current_price=300000,
        property_url="https://www.idealista.com/inmueble/prop_test_003/",
        detail_status="pending",
    )
    db_session.add(prop)
    db_session.commit()

    # delisted
    updated = service.mark_detail_discarded(prop.id, reason="delisted")
    assert updated.detail_status == "discarded"
    assert updated.discard_reason == "delisted"
    assert updated.detail_updated_at is not None

    # manual_discard
    updated = service.mark_detail_discarded(prop.id, reason="manual_discard")
    assert updated.discard_reason == "manual_discard"

    # extension_retries_exhausted
    updated = service.mark_detail_discarded(prop.id, reason="extension_retries_exhausted")
    assert updated.discard_reason == "extension_retries_exhausted"


def test_mark_detail_discarded_invalid_reason(db_session):
    """Test that invalid discard reason raises ValueError."""
    service = PropertyService(db_session)
    prop = Property(
        idealista_id="prop_test_004",
        title="Piso de prueba 4",
        location="Madrid",
        original_price=350000,
        current_price=350000,
        property_url="https://www.idealista.com/inmueble/prop_test_004/",
        detail_status="pending",
    )
    db_session.add(prop)
    db_session.commit()

    with pytest.raises(ValueError, match="Invalid discard reason"):
        service.mark_detail_discarded(prop.id, reason="invalid_reason")


def test_record_backend_attempt_and_fallback(db_session):
    """Test backend attempt logging and fallback trigger on reaching threshold."""
    service = PropertyService(db_session)
    prop = Property(
        idealista_id="prop_test_005",
        title="Piso de prueba 5",
        location="Madrid",
        original_price=400000,
        current_price=400000,
        property_url="https://www.idealista.com/inmueble/prop_test_005/",
        detail_status="pending",
    )
    db_session.add(prop)
    db_session.commit()

    # Attempt 1
    p1 = service.record_backend_attempt(prop.id, challenge="none", outcome="retryable_error")
    assert p1.backend_attempts == 1
    assert p1.fallback_to_extension is False

    # Attempt 2
    p2 = service.record_backend_attempt(prop.id, challenge="none", outcome="retryable_error")
    assert p2.backend_attempts == 2
    assert p2.fallback_to_extension is False

    # Attempt 3 -> triggers fallback_to_extension
    p3 = service.record_backend_attempt(prop.id, challenge="none", outcome="retryable_error")
    assert p3.backend_attempts == 3
    assert p3.fallback_to_extension is True
    assert p3.detail_status == "pending"


def test_record_backend_attempt_challenge_triggers_fallback(db_session):
    """Test that detecting an anti-bot challenge immediately flags fallback_to_extension."""
    service = PropertyService(db_session)
    prop = Property(
        idealista_id="prop_test_005b",
        title="Piso de prueba 5B",
        location="Madrid",
        original_price=400000,
        current_price=400000,
        property_url="https://www.idealista.com/inmueble/prop_test_005b/",
        detail_status="pending",
    )
    db_session.add(prop)
    db_session.commit()

    p = service.record_backend_attempt(prop.id, challenge="cloudflare", outcome="retryable_error")
    assert p.backend_attempts == 1
    assert p.fallback_to_extension is True
    assert p.detail_status == "pending"


def test_record_extension_attempt_exhaustion(db_session):
    """Test extension attempt recording and auto-discard at 3 failures."""
    service = PropertyService(db_session)
    prop = Property(
        idealista_id="prop_test_006",
        title="Piso de prueba 6",
        location="Madrid",
        original_price=450000,
        current_price=450000,
        property_url="https://www.idealista.com/inmueble/prop_test_006/",
        detail_status="pending",
    )
    db_session.add(prop)
    db_session.commit()

    # Attempts 1 and 2
    p1 = service.record_extension_attempt(prop.id, outcome="retryable_error")
    assert p1.extension_attempts == 1
    assert p1.detail_status == "pending"

    p2 = service.record_extension_attempt(prop.id, outcome="retryable_error")
    assert p2.extension_attempts == 2
    assert p2.detail_status == "pending"

    # Attempt 3 -> should auto-transition to discarded
    p3 = service.record_extension_attempt(prop.id, outcome="permanent_failure")
    assert p3.extension_attempts == 3
    assert p3.detail_status == "discarded"
    assert p3.discard_reason == "extension_retries_exhausted"
