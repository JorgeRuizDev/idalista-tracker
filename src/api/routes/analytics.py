"""Analytics API routes for time interval audit and market trends."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.api.schemas import IntervalAuditResponse, MarketTrendsResponse
from src.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/interval", response_model=IntervalAuditResponse)
def get_interval_audit(
    start_date: str = Query(..., description="Start date of interval (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date of interval (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
) -> IntervalAuditResponse:
    """Audit market activity across a custom calendar interval or preset month.

    Args:
        start_date: Interval start date in YYYY-MM-DD format.
        end_date: Interval end date in YYYY-MM-DD format.
        db: Database session.

    Returns:
        IntervalAuditResponse with 5 core market KPIs and territorial breakdown.
    """
    service = AnalyticsService(db)
    result = service.get_interval_audit(start_date=start_date, end_date=end_date)
    return IntervalAuditResponse(**result)


@router.get("/trends", response_model=MarketTrendsResponse)
def get_market_trends(
    db: Session = Depends(get_db),
) -> MarketTrendsResponse:
    """Retrieve monthly market trends time series from May to October 2026.

    Returns:
        MarketTrendsResponse with monthly €/m², active listings, and price drops vs sales.
    """
    service = AnalyticsService(db)
    trends = service.get_monthly_trends()
    return MarketTrendsResponse(**trends)
