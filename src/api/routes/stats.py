"""Statistics API routes."""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.api.schemas import LastCrawl, StatsResponse
from src.api.routes.crawl import current_job
from src.crawler.scheduler import get_next_run_time
from src.services.property_service import PropertyService

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
async def get_statistics(db: Session = Depends(get_db)) -> StatsResponse:
    """Get overall statistics about tracked properties.

    Args:
        db: Database session.

    Returns:
        Statistics response with aggregate data.
    """
    service = PropertyService(db)
    stats = service.get_statistics()

    # Get last crawl info
    last_crawl = LastCrawl()
    if current_job and current_job.get("status") == "completed":
        last_crawl = LastCrawl(
            completed_at=current_job.get("completed_at"),
            emails_processed=current_job.get("result", {}).get("emails_processed", 0),
            properties_found=current_job.get("result", {}).get("properties_found", 0),
        )

    return StatsResponse(
        total_properties=stats["total_properties"],
        active_properties=stats["active_properties"],
        properties_with_price_drops=stats["properties_with_price_drops"],
        average_price=stats["average_price"],
        price_range=stats["price_range"],
        last_crawl=last_crawl,
        properties_by_type=stats["properties_by_type"],
    )
