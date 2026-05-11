"""Services for managing crawl sessions."""
from datetime import datetime, timedelta
from typing import List, Optional, Set

from sqlalchemy.orm import Session

from src.database.models import (
    CrawlSession,
    Property,
    PropertyVisibility,
    SavedSearch,
)
from src.api.schemas import CrawlSessionCreate, CrawlSessionCompleteRequest


def create_crawl_session(
    db: Session, data: CrawlSessionCreate
) -> CrawlSession:
    """Create a new crawl session."""
    db_session = CrawlSession(
        started_at=datetime.utcnow(),
        status="running",
        server_url=data.server_url,
        human_like_enabled=data.human_like_enabled,
        extension_version=data.extension_version,
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def get_crawl_session(db: Session, session_id: int) -> Optional[CrawlSession]:
    """Get a crawl session by ID."""
    return db.query(CrawlSession).filter(CrawlSession.id == session_id).first()


def get_crawl_sessions(
    db: Session, skip: int = 0, limit: int = 100
) -> List[CrawlSession]:
    """Get all crawl sessions."""
    return (
        db.query(CrawlSession)
        .order_by(CrawlSession.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_active_crawl_session(db: Session) -> Optional[CrawlSession]:
    """Get the currently active (running) crawl session."""
    return (
        db.query(CrawlSession)
        .filter(CrawlSession.status == "running")
        .order_by(CrawlSession.started_at.desc())
        .first()
    )


def update_crawl_session_status(
    db: Session, session_id: int, status: str
) -> Optional[CrawlSession]:
    """Update crawl session status."""
    session = get_crawl_session(db, session_id)
    if session:
        session.status = status
        if status in ("completed", "failed"):
            session.ended_at = datetime.utcnow()
        db.commit()
        db.refresh(session)
    return session


def complete_crawl_session(
    db: Session, session_id: int, data: CrawlSessionCompleteRequest
) -> Optional[CrawlSession]:
    """Mark a crawl session as completed."""
    session = get_crawl_session(db, session_id)
    if session:
        session.status = "completed"
        session.ended_at = datetime.utcnow()
        session.total_properties = data.total_properties
        session.pages_processed = data.pages_processed
        session.searches_crawled = data.searches_crawled
        db.commit()
        db.refresh(session)
    return session


def increment_error_count(db: Session, session_id: int) -> None:
    """Increment the error count for a session."""
    session = get_crawl_session(db, session_id)
    if session:
        session.errors_count += 1
        db.commit()


def detect_missing_properties(
    db: Session,
    session_id: int,
    search_id: int,
    current_property_external_ids: List[str],
) -> dict:
    """Detect properties that are no longer visible in a search.
    
    Returns:
        dict with counts: missing_detected, marked_as_missing
    """
    # Get properties previously seen in this search
    from sqlalchemy import distinct
    
    previous_properties = (
        db.query(distinct(PropertyVisibility.property_id))
        .filter(PropertyVisibility.saved_search_id == search_id)
        .filter(PropertyVisibility.event_type == "seen")
        .all()
    )
    previous_ids = {p[0] for p in previous_properties}
    
    # Get current property IDs from external IDs
    current_properties = (
        db.query(Property)
        .filter(Property.idealista_id.in_(current_property_external_ids))
        .all()
    )
    current_ids = {p.id for p in current_properties}
    
    # Find missing properties
    missing_ids = previous_ids - current_ids
    
    missing_detected = 0
    marked_as_missing = 0
    
    for prop_id in missing_ids:
        missing_detected += 1
        
        # Create visibility event
        visibility = PropertyVisibility(
            event_type="missing",
            property_id=prop_id,
            crawl_session_id=session_id,
            saved_search_id=search_id,
        )
        db.add(visibility)
        
        # Check if property exists in ANY other search
        other_searches = (
            db.query(PropertyVisibility)
            .filter(PropertyVisibility.property_id == prop_id)
            .filter(PropertyVisibility.saved_search_id != search_id)
            .filter(PropertyVisibility.event_type == "seen")
            .filter(
                PropertyVisibility.timestamp > (datetime.utcnow() - timedelta(days=30))
            )
            .first()
        )
        
        prop = db.query(Property).get(prop_id)
        if prop and not other_searches:
            # Mark as missing globally
            if prop.status == "active":
                prop.status = "missing"
                prop.missing_since = datetime.utcnow()
                marked_as_missing += 1
        
        # Check for sold status (missing > 30 days)
        if prop and prop.missing_since:
            days_missing = (datetime.utcnow() - prop.missing_since).days
            if days_missing > 30:
                prop.status = "sold"
    
    db.commit()
    
    return {
        "missing_detected": missing_detected,
        "marked_as_missing": marked_as_missing,
    }


def get_session_properties(
    db: Session, session_id: int
) -> List[Property]:
    """Get all properties associated with a crawl session."""
    session = get_crawl_session(db, session_id)
    if session:
        return session.properties
    return []
