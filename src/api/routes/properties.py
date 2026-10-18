"""Property API routes."""
import base64
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.api.schemas import (
    BatchIngestionRequest,
    BatchIngestionResponse,
    PropertyDetailResponse,
    DiscardDetailRequest,
    DiscardDetailResponse,
    PropertyItem,
    PropertyListResponse,
    PropertyPhotoResponse,
    PropertyPriceDropListResponse,
    PropertyResponse,
    PropertySnapshotData,
    PropertySnapshotResponse,
    RequeueDetailResponse,
)
from src.database.models import Property
from src.services.media_service import MediaService
from src.services.property_service import PropertyService

router = APIRouter(prefix="/properties", tags=["properties"])


@router.get("", response_model=PropertyListResponse)
async def list_properties(
    status: Optional[str] = Query(None, description="Listing status: 'all', 'active', 'sold', 'missing'"),
    zone: Optional[str] = Query(None, description="Normalized canonical zone name"),
    min_price: Optional[int] = Query(None, description="Minimum price in euros"),
    max_price: Optional[int] = Query(None, description="Maximum price in euros"),
    date_from: Optional[str] = Query(None, description="Start date filter YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="End date filter YYYY-MM-DD"),
    has_price_drop: Optional[bool] = Query(None, description="Filter for price drops only"),
    search: Optional[str] = Query(None, description="Search keyword in title, address, zone"),
    location: Optional[str] = Query(None, description="Location substring search"),
    min_bedrooms: Optional[int] = Query(None, description="Minimum number of bedrooms"),
    detail_status: Optional[str] = Query(None, description="Filter by detail status (legacy, pending, completed, discarded)"),
    sort_by: str = Query("discount_desc", description="Sort field: discount_desc, days_desc, price_asc, price_desc, m2_asc, date_desc"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    limit: int = Query(100, ge=1, le=1000, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
) -> PropertyListResponse:
    """List properties with extended sales filters, canonical zones, and metrics.

    Args:
        status: Status filter ('all', 'active', 'sold', 'missing').
        zone: Canonical zone filter.
        min_price: Minimum price filter.
        max_price: Maximum price filter.
        date_from: Start date filter YYYY-MM-DD.
        date_to: End date filter YYYY-MM-DD.
        has_price_drop: Filter for price drops only.
        search: Search substring query.
        location: Location substring search.
        min_bedrooms: Minimum bedrooms filter.
        detail_status: Filter by detail crawl status.
        sort_by: Sort field.
        sort_order: Sort order.
        limit: Maximum results.
        offset: Pagination offset.
        db: Database session.

    Returns:
        Paginated list of properties with sold-specific and pricing metrics.
    """
    service = PropertyService(db)
    properties, total = service.list_properties(
        min_price=min_price,
        max_price=max_price,
        location=location,
        min_bedrooms=min_bedrooms,
        has_price_drop=has_price_drop,
        detail_status=detail_status,
        status=status,
        zone=zone,
        date_from=date_from,
        date_to=date_to,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )

    items = [
        PropertyItem(
            id=p.id,
            idealista_id=p.idealista_id,
            title=p.title,
            address=getattr(p, "address", p.location),
            zone=getattr(p, "zone", "Burgos Centro / Otras Zonas"),
            property_type=p.property_type,
            original_price=p.original_price,
            current_price=p.current_price,
            discount_amount=getattr(p, "discount_amount", 0),
            discount_pct=getattr(p, "discount_pct", 0.0),
            size_m2=p.size_m2,
            price_per_m2=getattr(p, "price_per_m2", None),
            bedrooms=p.bedrooms,
            floor=p.floor,
            has_elevator=p.has_elevator,
            status=p.status,
            first_seen_at=p.first_seen_at,
            last_seen_at=p.last_seen_at,
            sold_at=p.sold_at,
            days_on_market=getattr(p, "days_on_market", None),
            photos=getattr(p, "photos_list", [p.image_url] if p.image_url else []),
            property_url=p.property_url,
            price_history_count=getattr(p, "price_history_count", 0),
            detail_status=getattr(p, "detail_status", "legacy"),
            discard_reason=getattr(p, "discard_reason", None),
        )
        for p in properties
    ]

    return PropertyListResponse(
        items=items,
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


@router.get("/{idealista_id}/image")
async def get_property_image(
    idealista_id: str,
    db: Session = Depends(get_db),
):
    """Serve a property's downloaded image.

    Falls back to redirecting to the original image_url if no local copy exists.
    """
    from fastapi.responses import RedirectResponse

    prop = db.query(Property).filter(Property.idealista_id == idealista_id).first()

    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    if prop.image_data:
        # Parse the data URL: data:image/jpeg;base64,xxxx
        match = re.match(r"data:(.+);base64,(.+)", prop.image_data)
        if match:
            media_type = match.group(1)
            raw_bytes = base64.b64decode(match.group(2))
            return Response(content=raw_bytes, media_type=media_type)

    if prop.image_url:
        return RedirectResponse(url=prop.image_url)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No image available")


@router.get("/{property_id}/snapshot", response_model=PropertySnapshotResponse)
async def get_property_snapshot(
    property_id: str,
    db: Session = Depends(get_db),
) -> PropertySnapshotResponse:
    """Retrieve full web snapshot and photo gallery metadata for a property.

    Args:
        property_id: Internal property ID or idealista ID.
        db: Database session.

    Returns:
        Full PropertySnapshotResponse with structured features and media paths.
    """
    prop = None
    if property_id.isdigit():
        prop = db.query(Property).filter(Property.id == int(property_id)).first()
    if not prop:
        prop = db.query(Property).filter(Property.idealista_id == property_id).first()

    if not prop or not prop.snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property {property_id} or detail snapshot not found",
        )

    media_service = MediaService()
    photos_response = [
        PropertyPhotoResponse(
            id=p.id,
            sequence_index=p.sequence_index,
            local_url=media_service.format_media_url(p.local_file_path),
            original_url=p.original_url,
            caption=p.caption,
            file_size_bytes=p.file_size_bytes,
            content_type=p.content_type,
        )
        for p in prop.photos
    ]

    snapshot_data = PropertySnapshotData(
        crawled_at=prop.snapshot.crawled_at,
        source_engine=prop.snapshot.source_engine,
        full_description=prop.snapshot.full_description,
        neighborhood=prop.snapshot.neighborhood,
        district=prop.snapshot.district,
        city=prop.snapshot.city,
        province=prop.snapshot.province,
        latitude=prop.snapshot.latitude,
        longitude=prop.snapshot.longitude,
        features=prop.snapshot.features,
        photos=photos_response,
    )

    return PropertySnapshotResponse(
        property_id=prop.id,
        idealista_id=prop.idealista_id,
        detail_status=prop.detail_status,
        detail_updated_at=prop.detail_updated_at,
        snapshot=snapshot_data,
    )


@router.post("/{property_id}/requeue-detail", response_model=RequeueDetailResponse)
async def requeue_property_detail(
    property_id: str,
    db: Session = Depends(get_db),
) -> RequeueDetailResponse:
    """Manually reset a discarded or failed property back to pending detail crawl."""
    prop = None
    if property_id.isdigit():
        prop = db.query(Property).filter(Property.id == int(property_id)).first()
    if not prop:
        prop = db.query(Property).filter(Property.idealista_id == property_id).first()

    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property {property_id} not found",
        )

    service = PropertyService(db)
    updated = service.requeue_detail(prop.id)

    return RequeueDetailResponse(
        property_id=updated.id,
        detail_status=updated.detail_status,
        backend_attempts=updated.backend_attempts,
        extension_attempts=updated.extension_attempts,
        discard_reason=updated.discard_reason,
    )


@router.post("/{property_id}/discard-detail", response_model=DiscardDetailResponse)
async def discard_property_detail(
    property_id: str,
    request: DiscardDetailRequest,
    db: Session = Depends(get_db),
) -> DiscardDetailResponse:
    """Manually mark a property as discarded from detail crawling."""
    prop = None
    if property_id.isdigit():
        prop = db.query(Property).filter(Property.id == int(property_id)).first()
    if not prop:
        prop = db.query(Property).filter(Property.idealista_id == property_id).first()

    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property {property_id} not found",
        )

    service = PropertyService(db)
    try:
        updated = service.mark_detail_discarded(prop.id, reason=request.reason)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return DiscardDetailResponse(
        property_id=updated.id,
        detail_status=updated.detail_status,
        discard_reason=updated.discard_reason or "manual_discard",
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


@router.post("/batch", response_model=BatchIngestionResponse)
async def ingest_property_batch(
    request: BatchIngestionRequest,
    db: Session = Depends(get_db),
) -> BatchIngestionResponse:
    """Ingest a batch of properties from the Chrome extension.

    Args:
        request: Batch ingestion request with properties and metadata.
        db: Database session.

    Returns:
        Batch ingestion response with results and statistics.
    """
    import time
    from datetime import datetime

    start_time = time.time()
    service = PropertyService(db)

    results, errors = service.process_property_batch(
        session_id=request.session_id,
        search_id=request.search_id,
        external_search_id=request.external_search_id,
        page=request.page,
        properties_data=[p.model_dump() for p in request.properties],
        metadata=request.metadata.model_dump(),
    )

    processing_time = int((time.time() - start_time) * 1000)

    created = sum(1 for r in results if r.get("action") == "created")
    updated = sum(1 for r in results if r.get("action") == "updated")
    seen = sum(1 for r in results if r.get("action") == "seen")
    invalid = len(errors)

    return BatchIngestionResponse(
        success=len(errors) == 0 or len(results) > 0,
        summary={
            "total_received": len(request.properties),
            "created": created,
            "updated": updated,
            "seen": seen,
            "invalid": invalid,
        },
        results=results,
        errors=errors,
        meta={
            "processed_at": datetime.utcnow().isoformat(),
            "processing_time_ms": processing_time,
            "api_version": "1.0.0",
        },
    )
