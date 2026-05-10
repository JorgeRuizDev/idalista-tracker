"""Crawl control API routes."""
import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.api.schemas import CrawlStatusResponse, CrawlTriggerRequest, CrawlTriggerResponse
from src.crawler.scheduler import get_next_run_time, start_scheduler, stop_scheduler
from src.crawler.service import CrawlerService

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
