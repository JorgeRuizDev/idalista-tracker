"""Canonical Zones API routes."""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.api.schemas import NormalizedZoneResponse
from src.services.zone_service import ZoneService

router = APIRouter(prefix="/zones", tags=["zones"])


@router.get("", response_model=List[NormalizedZoneResponse])
def get_zones_census(
    db: Session = Depends(get_db),
) -> List[NormalizedZoneResponse]:
    """Retrieve canonical 23-zone census statistics for Burgos.

    Returns:
        List of 23 zones with counts (total, active, sold, missing) and price/market averages.
    """
    service = ZoneService(db)
    census = service.get_zones_census()
    return [NormalizedZoneResponse(**item) for item in census]
