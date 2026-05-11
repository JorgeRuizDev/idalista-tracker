"""API routes for saved searches management."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.api.schemas import (
    SavedSearchResponse,
    SavedSearchSyncRequest,
    SavedSearchSyncResponse,
)
from src.services import saved_search_service

router = APIRouter(prefix="/searches", tags=["searches"])


@router.get("", response_model=dict)
def get_saved_searches(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> dict:
    """Get all saved searches."""
    searches = saved_search_service.get_saved_searches(db, skip=skip, limit=limit)
    return {"searches": searches}


@router.post("/sync", response_model=SavedSearchSyncResponse)
def sync_saved_searches(
    request: SavedSearchSyncRequest,
    db: Session = Depends(get_db),
) -> SavedSearchSyncResponse:
    """Sync saved searches from the extension."""
    result = saved_search_service.sync_saved_searches(db, request.searches)
    return SavedSearchSyncResponse(**result)


@router.get("/{search_id}", response_model=SavedSearchResponse)
def get_saved_search(
    search_id: int,
    db: Session = Depends(get_db),
) -> SavedSearchResponse:
    """Get a specific saved search by ID."""
    search = saved_search_service.get_saved_search(db, search_id)
    if not search:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved search not found",
        )
    return search
