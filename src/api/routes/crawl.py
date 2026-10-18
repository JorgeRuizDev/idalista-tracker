"""Crawl control API routes."""
import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.api.schemas import (
    CrawlHistoryDetailResponse,
    CrawlHistoryEntry,
    CrawlHistoryResponse,
    CrawlSessionCreate,
    CrawlSessionResponse,
    CrawlSessionCompleteRequest,
    CrawlStatusResponse,
    CrawlTriggerRequest,
    CrawlTriggerResponse,
    DetailCrawlFailRequest,
    DetailCrawlFailResponse,
    DetailSnapshotSubmitRequest,
    DetailSnapshotSubmitResponse,
    DetectMissingRequest,
    DetectMissingResponse,
    PendingDetailItem,
    PendingDetailsResponse,
)
from src.crawler.scheduler import get_next_run_time, start_scheduler, stop_scheduler
from src.crawler.service import CrawlerService
from src.database.models import Property
from src.services import crawl_service
from src.services.property_service import PropertyService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crawl", tags=["crawl"])

# Track current crawl job
current_job: Optional[dict] = None


@router.post("/trigger", response_model=CrawlTriggerResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_crawl(
    request: CrawlTriggerRequest,
    db: Session = Depends(get_db),
) -> CrawlTriggerResponse:
    """Manually trigger a crawl operation.

    Args:
        request: Crawl trigger request with optional full_sync flag.
        db: Database session.

    Returns:
        CrawlTriggerResponse with job details.

    Raises:
        HTTPException: If a crawl is already in progress.
    """
    global current_job

    # Check if crawl already running
    if current_job and current_job.get("status") == "running":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Crawl already in progress",
                "current_job_id": current_job["job_id"],
                "started_at": current_job["started_at"].isoformat(),
            },
        )

    # Create job record
    job_id = str(uuid4())
    started_at = datetime.utcnow()
    estimated_completion = started_at + timedelta(minutes=5)

    current_job = {
        "job_id": job_id,
        "status": "started",
        "started_at": started_at,
        "full_sync": request.full_sync,
        "result": None,
    }

    logger.info(f"Manual crawl triggered (job_id={job_id}, full_sync={request.full_sync})")

    # Start crawl in background (for now, run synchronously)
    try:
        service = CrawlerService(db)
        result = service.crawl(full_sync=request.full_sync)

        current_job["status"] = "completed"
        current_job["completed_at"] = datetime.utcnow()
        current_job["result"] = {
            "emails_processed": result.emails_processed,
            "properties_found": result.properties_found,
            "new_properties": result.new_properties,
            "price_updates": result.price_updates,
            "errors": result.errors,
        }

        logger.info(f"Manual crawl completed (job_id={job_id})")

    except Exception as e:
        current_job["status"] = "failed"
        current_job["error"] = str(e)
        logger.error(f"Manual crawl failed (job_id={job_id}): {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Crawl failed", "message": str(e)},
        )

    return CrawlTriggerResponse(
        job_id=job_id,
        status="started",
        started_at=started_at,
        estimated_completion=estimated_completion,
    )


@router.get("/status", response_model=CrawlStatusResponse)
async def get_crawl_status() -> CrawlStatusResponse:
    """Get the status of the current or last crawl job.

    Returns:
        CrawlStatusResponse with current status and statistics.
    """
    global current_job

    if current_job is None:
        # No crawl has been run yet
        return CrawlStatusResponse(
            status="idle",
            next_scheduled_crawl=get_next_run_time(),
        )

    result = current_job.get("result", {})

    return CrawlStatusResponse(
        job_id=current_job.get("job_id"),
        status=current_job.get("status", "idle"),
        started_at=current_job.get("started_at"),
        completed_at=current_job.get("completed_at"),
        emails_processed=result.get("emails_processed", 0),
        properties_found=result.get("properties_found", 0),
        new_properties=result.get("new_properties", 0),
        price_updates=result.get("price_updates", 0),
        errors=result.get("errors", 0),
        next_scheduled_crawl=get_next_run_time(),
    )


# Extension Crawler Endpoints

@router.post("/sessions", response_model=CrawlSessionResponse, status_code=status.HTTP_201_CREATED)
def create_crawl_session(
    request: CrawlSessionCreate,
    db: Session = Depends(get_db),
) -> CrawlSessionResponse:
    """Create a new crawl session from the extension."""
    session = crawl_service.create_crawl_session(db, request)
    return session


@router.get("/sessions/{session_id}", response_model=CrawlSessionResponse)
def get_crawl_session(
    session_id: int,
    db: Session = Depends(get_db),
) -> CrawlSessionResponse:
    """Get a crawl session by ID."""
    session = crawl_service.get_crawl_session(db, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crawl session not found",
        )
    return session


@router.post("/sessions/{session_id}/complete", response_model=CrawlSessionResponse)
def complete_crawl_session(
    session_id: int,
    request: CrawlSessionCompleteRequest,
    db: Session = Depends(get_db),
) -> CrawlSessionResponse:
    """Mark a crawl session as completed."""
    session = crawl_service.complete_crawl_session(db, session_id, request)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crawl session not found",
        )
    return session


@router.post(
    "/sessions/{session_id}/searches/{search_id}/detect-missing",
    response_model=DetectMissingResponse,
)
def detect_missing_properties(
    session_id: int,
    search_id: int,
    request: DetectMissingRequest,
    db: Session = Depends(get_db),
) -> DetectMissingResponse:
    """Detect properties that are no longer visible in a search."""
    result = crawl_service.detect_missing_properties(
        db, session_id, search_id, request.current_property_external_ids,
        external_search_id=request.external_search_id,
    )
    return DetectMissingResponse(**result)


@router.get("/history", response_model=CrawlHistoryResponse)
def get_crawl_history(
    days: int = 90,
    db: Session = Depends(get_db),
) -> CrawlHistoryResponse:
    """Get daily crawl history with aggregated price change statistics.

    Args:
        days: Number of days of history to return (default 90).
        db: Database session.

    Returns:
        CrawlHistoryResponse with per-day statistics.
    """
    service = PropertyService(db)
    entries = service.get_crawl_history(days=min(days, 365))
    return CrawlHistoryResponse(entries=[CrawlHistoryEntry(**e) for e in entries])


@router.get("/history/{date}", response_model=CrawlHistoryDetailResponse)
def get_crawl_history_detail(
    date: str,
    db: Session = Depends(get_db),
) -> CrawlHistoryDetailResponse:
    """Get detailed crawl history for a specific date.

    Args:
        date: Date string in YYYY-MM-DD format.
        db: Database session.

    Returns:
        CrawlHistoryDetailResponse with lists of affected properties.
    """
    service = PropertyService(db)
    detail = service.get_crawl_history_detail(date)
    return CrawlHistoryDetailResponse(**detail)


# ============= Detail Crawler Endpoints (006-full-property-crawl) =============


@router.get("/pending-details", response_model=PendingDetailsResponse)
def get_pending_details(
    limit: int = Query(5, ge=1, le=20, description="Max listings to return"),
    priority_only: bool = Query(True, description="Filter for listings delegated to extension"),
    db: Session = Depends(get_db),
) -> PendingDetailsResponse:
    """Retrieve listings pending detail crawl for Chrome extension fallback."""
    service = PropertyService(db)
    pending_props = service.get_pending_detail_properties(
        limit=limit, priority_only=priority_only
    )
    items = [
        PendingDetailItem(
            property_id=p.id,
            idealista_id=p.idealista_id,
            property_url=p.property_url,
            extension_attempts=p.extension_attempts,
        )
        for p in pending_props
    ]
    return PendingDetailsResponse(pending_count=len(items), items=items)


@router.post("/details/{idealista_id}", response_model=DetailSnapshotSubmitResponse)
async def submit_property_detail(
    idealista_id: str,
    request: DetailSnapshotSubmitRequest,
    db: Session = Depends(get_db),
) -> DetailSnapshotSubmitResponse:
    """Accept extracted detail snapshot from backend or Chrome extension."""
    service = PropertyService(db)
    prop = service.get_property_by_idealista_id(idealista_id)
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property {idealista_id} not found",
        )

    if request.delisted:
        service.mark_detail_discarded(prop.id, reason="delisted")
        service.record_backend_attempt(
            prop.id,
            outcome="delisted",
            http_status=404,
            error_message="Marked delisted in submission",
        )
        return DetailSnapshotSubmitResponse(
            status="discarded",
            property_id=prop.id,
            idealista_id=prop.idealista_id,
            detail_status="discarded",
            photos_downloaded=0,
        )

    payload_dict = request.model_dump()
    updated_prop = await service.save_property_snapshot(prop.id, payload_dict)

    photos_count = (
        updated_prop.snapshot.photos_count if updated_prop.snapshot else len(request.photos)
    )
    return DetailSnapshotSubmitResponse(
        status="success",
        property_id=updated_prop.id,
        idealista_id=updated_prop.idealista_id,
        detail_status=updated_prop.detail_status,
        photos_downloaded=photos_count,
    )


@router.post("/details/{idealista_id}/fail", response_model=DetailCrawlFailResponse)
def report_detail_crawl_failure(
    idealista_id: str,
    request: DetailCrawlFailRequest,
    db: Session = Depends(get_db),
) -> DetailCrawlFailResponse:
    """Record a failed detail crawl attempt from the Chrome extension."""
    service = PropertyService(db)
    prop = service.get_property_by_idealista_id(idealista_id)
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Property {idealista_id} not found",
        )

    updated_prop = service.record_extension_attempt(
        prop.id,
        challenge=request.error_type,
        outcome="permanent_failure" if prop.extension_attempts >= 2 else "retryable_error",
        http_status=request.http_status,
        error_message=request.error_message,
    )

    return DetailCrawlFailResponse(
        status="recorded",
        idealista_id=updated_prop.idealista_id,
        current_attempts=updated_prop.extension_attempts,
        detail_status=updated_prop.detail_status,
        discard_reason=updated_prop.discard_reason,
    )
