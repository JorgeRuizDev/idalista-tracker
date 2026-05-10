"""Property API routes."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.api.schemas import (
    PropertyDetailResponse,
    PropertyListResponse,
    PropertyPriceDropListResponse,
    PropertyResponse,
)
from src.services.property_service import PropertyService

router = APIRouter(prefix="/properties", tags=["properties"])


@router.get("", response_model=PropertyListResponse)
async def list_properties(
    min_price: Optional[int] = Query(None, description="Minimum price in euros"),
    max_price: Optional[int] = Query(None, description="Maximum price in euros"),
    location: Optional[str] = Query(None, description="Location substring search"),
    min_bedrooms: Optional[int] = Query(None, description="Minimum number of bedrooms"),
    has_price_drop: Optional[bool] = Query(None, description="Filter for price drops only"),
    sort_by: str = Query("created_at", description="Sort field: price, created_at, price_drop"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    limit: int = Query(100, ge=1, le=1000, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
) -> PropertyListResponse:
    """List all properties with optional filtering and sorting.

    Args:
        min_price: Minimum price filter.
        max_price: Maximum price filter.
        location: Location substring search.
        min_bedrooms: Minimum bedrooms filter.
        has_price_drop: Filter for price drops only.
        sort_by: Sort field.
        sort_order: Sort order.
        limit: Maximum results.
        offset: Pagination offset.
        db: Database session.

    Returns:
        Paginated list of properties.
    """
    service = PropertyService(db)
    properties, total = service.list_properties(
        min_price=min_price,
        max_price=max_price,
        location=location,
        min_bedrooms=min_bedrooms,
        has_price_drop=has_price_drop,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )

    return PropertyListResponse(
        items=[PropertyResponse.model_validate(p) for p in properties],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/price-drops", response_model=PropertyPriceDropListResponse)
async def get_price_drops(
    min_drop_percent: Optional[float] = Query(None, description="Minimum drop percentage"),
    limit: int = Query(100, ge=1, le=1000, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
) -> PropertyPriceDropListResponse:
    """Get properties with price drops, sorted by drop percentage.

    Args:
        min_drop_percent: Minimum drop percentage filter.
        limit: Maximum results.
        offset: Pagination offset.
        db: Database session.

    Returns:
        Paginated list of properties with price drops.
    """
    service = PropertyService(db)
    properties, total = service.get_price_drops(
        min_drop_percent=min_drop_percent,
        limit=limit,
        offset=offset,
    )

    return PropertyPriceDropListResponse(
        items=[PropertyResponse.model_validate(p) for p in properties],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{idealista_id}", response_model=PropertyDetailResponse)
async def get_property(
    idealista_id: str,
    db: Session = Depends(get_db),
) -> PropertyDetailResponse:
    """Get a single property by its idealista ID.

    Args:
        idealista_id: The idealista property ID.
        db: Database session.

    Returns:
        Property detail with price history.

    Raises:
        HTTPException: If property not found.
    """
    service = PropertyService(db)
    property_obj = service.get_property_with_history(idealista_id)

    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Property not found", "idealista_id": idealista_id},
        )

    return PropertyDetailResponse.model_validate(property_obj)
