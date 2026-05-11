"""Services for managing saved searches."""
from typing import List, Optional

from sqlalchemy.orm import Session

from src.database.models import SavedSearch
from src.api.schemas import SavedSearchCreate


def get_saved_search(db: Session, search_id: int) -> Optional[SavedSearch]:
    """Get a saved search by ID."""
    return db.query(SavedSearch).filter(SavedSearch.id == search_id).first()


def get_saved_search_by_external_id(
    db: Session, external_id: str
) -> Optional[SavedSearch]:
    """Get a saved search by external ID."""
    return db.query(SavedSearch).filter(
        SavedSearch.external_search_id == external_id
    ).first()


def get_saved_searches(
    db: Session, skip: int = 0, limit: int = 100
) -> List[SavedSearch]:
    """Get all saved searches."""
    return (
        db.query(SavedSearch)
        .order_by(SavedSearch.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def create_saved_search(
    db: Session, search_data: SavedSearchCreate
) -> SavedSearch:
    """Create a new saved search."""
    db_search = SavedSearch(
        external_search_id=search_data.external_search_id,
        name=search_data.name,
        url_path=search_data.url_path,
        full_url=search_data.full_url,
        description=search_data.description,
        result_count=search_data.result_count,
    )
    db.add(db_search)
    db.commit()
    db.refresh(db_search)
    return db_search


def update_saved_search(
    db: Session, search: SavedSearch, search_data: SavedSearchCreate
) -> SavedSearch:
    """Update an existing saved search."""
    search.name = search_data.name
    search.url_path = search_data.url_path
    search.full_url = search_data.full_url
    search.description = search_data.description
    search.result_count = search_data.result_count
    
    db.commit()
    db.refresh(search)
    return search


def sync_saved_searches(
    db: Session, searches_data: List[SavedSearchCreate]
) -> dict:
    """Sync saved searches from extension.
    
    Returns:
        dict with counts: synced, created, updated
    """
    created = 0
    updated = 0
    
    for search_data in searches_data:
        existing = get_saved_search_by_external_id(db, search_data.external_search_id)
        
        if existing:
            # Update existing
            update_saved_search(db, existing, search_data)
            updated += 1
        else:
            # Create new
            create_saved_search(db, search_data)
            created += 1
    
    return {
        "synced": created + updated,
        "created": created,
        "updated": updated,
    }


def update_crawl_enabled(
    db: Session, search_id: int, enabled: bool
) -> Optional[SavedSearch]:
    """Update crawl enabled status for a search."""
    search = get_saved_search(db, search_id)
    if search:
        search.crawl_enabled = enabled
        db.commit()
        db.refresh(search)
    return search


def update_last_crawled(
    db: Session, search_id: int
) -> Optional[SavedSearch]:
    """Update last crawled timestamp."""
    from datetime import datetime
    
    search = get_saved_search(db, search_id)
    if search:
        search.last_crawled_at = datetime.utcnow()
        db.commit()
        db.refresh(search)
    return search
