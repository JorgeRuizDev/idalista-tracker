"""Property API routes."""

import base64
import re
import urllib.request
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.api.schemas import (
    BatchIngestionRequest,
    BatchIngestionResponse,
    DiscardDetailRequest,
    DiscardDetailResponse,
    PriceHistoryResponse,
    PropertyDetailResponse,
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
    movement_type: Optional[str] = Query(
        None,
        description="Market movement type: 'inclusions', 'sales', 'price_drops', 'price_increases'",
    ),
    status: Optional[str] = Query(
        None, description="Listing status: 'all', 'active', 'sold', 'missing'"
    ),
    zone: Optional[str] = Query(None, description="Normalized canonical zone name"),
    min_price: Optional[int] = Query(None, description="Minimum price in euros"),
    max_price: Optional[int] = Query(None, description="Maximum price in euros"),
    date_from: Optional[str] = Query(None, description="Start date filter YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="End date filter YYYY-MM-DD"),
    has_price_drop: Optional[bool] = Query(None, description="Filter for price drops only"),
    search: Optional[str] = Query(None, description="Search keyword in title, address, zone"),
    location: Optional[str] = Query(None, description="Location substring search"),
    min_bedrooms: Optional[int] = Query(None, description="Minimum number of bedrooms"),
    detail_status: Optional[str] = Query(
        None, description="Filter by detail status (legacy, pending, completed, discarded)"
    ),
    sort_by: str = Query(
        "discount_desc",
        description="Sort field: discount_desc, days_desc, price_asc, price_desc, m2_asc, date_desc",
    ),
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
        movement_type=movement_type,
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
            return Response(
                content=raw_bytes,
                media_type=media_type,
                headers={"Cache-Control": "public, max-age=86400"},
            )

    # Check local downloaded gallery photos
    if prop.photos:
        first_photo = sorted(prop.photos, key=lambda x: x.sequence_index)[0]
        media_service = MediaService()
        local_disk_path = media_service.media_root / first_photo.local_file_path.lstrip("/")
        if local_disk_path.exists() and local_disk_path.stat().st_size > 0:
            raw_bytes = local_disk_path.read_bytes()
            content_type = first_photo.content_type or "image/jpeg"
            try:
                b64 = base64.b64encode(raw_bytes).decode("ascii")
                prop.image_data = f"data:{content_type};base64,{b64}"
                db.commit()
            except Exception:
                db.rollback()
            return Response(
                content=raw_bytes,
                media_type=content_type,
                headers={"Cache-Control": "public, max-age=86400"},
            )

    if prop.image_url:
        try:
            req = urllib.request.Request(
                prop.image_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                raw_bytes = resp.read()
                content_type = resp.headers.get("Content-Type", "image/jpeg")
                try:
                    b64 = base64.b64encode(raw_bytes).decode("ascii")
                    prop.image_data = f"data:{content_type};base64,{b64}"
                    db.commit()
                except Exception:
                    db.rollback()
                return Response(
                    content=raw_bytes,
                    media_type=content_type,
                    headers={"Cache-Control": "public, max-age=86400"},
                )
        except Exception:
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
    """Get a single property by its idealista ID (or internal numeric ID).

    Args:
        idealista_id: The idealista property ID or database ID.
        db: Database session.

    Returns:
        Property detail with price history and normalized metrics.

    Raises:
        HTTPException: If property not found.
    """
    service = PropertyService(db)
    property_obj = service.get_property_with_history(idealista_id)
    if not property_obj and idealista_id.isdigit():
        property_obj = db.query(Property).filter(Property.id == int(idealista_id)).first()
        if property_obj:
            _ = property_obj.price_history

    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "Property not found", "idealista_id": idealista_id},
        )

    # Normalize zone and domain metrics
    from datetime import datetime
    from src.services.zone_service import normalize_zone

    p_zone = normalize_zone(property_obj.title, property_obj.location)
    setattr(property_obj, "zone", p_zone)
    setattr(property_obj, "address", getattr(property_obj, "address", property_obj.location))

    orig_p = property_obj.original_price or 0
    cur_p = property_obj.current_price or 0
    if orig_p and cur_p and orig_p > cur_p:
        disc_amount = orig_p - cur_p
        disc_pct = round((disc_amount / orig_p) * 100.0, 1)
    else:
        disc_amount = 0
        disc_pct = 0.0
    setattr(property_obj, "discount_amount", disc_amount)
    setattr(property_obj, "discount_pct", disc_pct)

    if property_obj.size_m2 and cur_p:
        setattr(property_obj, "price_per_m2", round(cur_p / property_obj.size_m2))

    days_on_market = None
    if property_obj.first_seen_at:
        if property_obj.status == "sold":
            end_time = property_obj.sold_at or property_obj.last_seen_at
            if end_time:
                days_on_market = max(0, (end_time - property_obj.first_seen_at).days)
        else:
            days_on_market = max(0, (datetime.utcnow() - property_obj.first_seen_at).days)
    setattr(property_obj, "days_on_market", days_on_market)

    media_service = MediaService()
    photos_list = [
        media_service.format_media_url(ph.local_file_path)
        for ph in sorted(getattr(property_obj, "photos", []), key=lambda p: p.sequence_index)
    ]
    if not photos_list:
        if property_obj.image_data or property_obj.image_url:
            photos_list = [f"/api/v1/properties/{property_obj.idealista_id}/image"]

    history_items = [
        PriceHistoryResponse.model_validate(h)
        for h in getattr(property_obj, "price_history", [])
    ]

    return PropertyDetailResponse(
        id=property_obj.id,
        idealista_id=property_obj.idealista_id,
        title=property_obj.title,
        property_type=property_obj.property_type,
        location=property_obj.location,
        original_price=orig_p,
        current_price=cur_p,
        price_drop_percentage=property_obj.price_drop_percentage,
        size_m2=property_obj.size_m2,
        bedrooms=property_obj.bedrooms,
        floor=property_obj.floor,
        has_elevator=property_obj.has_elevator,
        property_url=property_obj.property_url,
        image_url=property_obj.image_url,
        image_data=property_obj.image_data,
        first_seen_at=property_obj.first_seen_at,
        last_seen_at=property_obj.last_seen_at,
        missing_since=property_obj.missing_since,
        sold_at=property_obj.sold_at,
        status=property_obj.status,
        detail_status=getattr(property_obj, "detail_status", "legacy"),
        detail_updated_at=getattr(property_obj, "detail_updated_at", None),
        discard_reason=getattr(property_obj, "discard_reason", None),
        photos_count=len(photos_list),
        created_at=property_obj.created_at,
        updated_at=property_obj.updated_at,
        is_active=property_obj.is_active,
        price_history_count=len(history_items),
        zone=p_zone,
        address=getattr(property_obj, "address", property_obj.location),
        discount_amount=disc_amount,
        discount_pct=disc_pct,
        price_per_m2=round(cur_p / property_obj.size_m2) if (property_obj.size_m2 and cur_p) else None,
        days_on_market=days_on_market,
        photos=photos_list,
        price_history=history_items,
    )


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
