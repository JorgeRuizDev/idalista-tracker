"""Property service for business logic."""
import logging
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.database.models import PriceHistory, Property

logger = logging.getLogger(__name__)


class PropertyService:
    """Service for property business logic."""

    def __init__(self, db: Session) -> None:
        """Initialize the property service.

        Args:
            db: Database session.
        """
        self.db = db

    def get_property_by_idealista_id(self, idealista_id: str) -> Optional[Property]:
        """Get a property by its idealista ID.

        Args:
            idealista_id: The idealista property ID.

        Returns:
            Property object or None if not found.
        """
        return (
            self.db.query(Property)
            .filter(Property.idealista_id == idealista_id)
            .first()
        )

    def get_property_with_history(self, idealista_id: str) -> Optional[Property]:
        """Get a property with its price history.

        Args:
            idealista_id: The idealista property ID.

        Returns:
            Property object with price_history loaded, or None.
        """
        prop = self.get_property_by_idealista_id(idealista_id)
        if prop:
            # Force load price history
            _ = prop.price_history
        return prop

    def list_properties(
        self,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        location: Optional[str] = None,
        min_bedrooms: Optional[int] = None,
        has_price_drop: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Property], int]:
        """List properties with filtering and pagination.

        Args:
            min_price: Minimum price filter.
            max_price: Maximum price filter.
            location: Location substring filter.
            min_bedrooms: Minimum bedrooms filter.
            has_price_drop: Filter for properties with price drops.
            sort_by: Sort field (price, created_at, price_drop).
            sort_order: Sort order (asc, desc).
            limit: Maximum results.
            offset: Pagination offset.

        Returns:
            Tuple of (properties list, total count).
        """
        query = self.db.query(Property)

        # Apply filters
        if min_price is not None:
            query = query.filter(Property.current_price >= min_price)

        if max_price is not None:
            query = query.filter(Property.current_price <= max_price)

        if location:
            query = query.filter(Property.location.ilike(f"%{location}%"))

        if min_bedrooms is not None:
            query = query.filter(Property.bedrooms >= min_bedrooms)

        if has_price_drop:
            query = query.filter(Property.price_drop_percentage > 0)

        # Get total count before pagination
        total = query.count()

        # Apply sorting
        sort_column = getattr(Property, sort_by, Property.created_at)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Apply pagination
        properties = query.offset(offset).limit(limit).all()

        return properties, total

    def get_price_drops(
        self,
        min_drop_percent: Optional[float] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Property], int]:
        """Get properties with price drops.

        Args:
            min_drop_percent: Minimum drop percentage filter.
            limit: Maximum results.
            offset: Pagination offset.

        Returns:
            Tuple of (properties list, total count).
        """
        query = self.db.query(Property).filter(Property.price_drop_percentage > 0)

        if min_drop_percent is not None:
            query = query.filter(Property.price_drop_percentage >= min_drop_percent)

        # Get total count
        total = query.count()

        # Sort by drop percentage (highest first)
        properties = (
            query.order_by(Property.price_drop_percentage.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return properties, total

    def get_statistics(self) -> dict:
        """Get aggregate statistics about properties.

        Returns:
            Dictionary with statistics.
        """
        # Basic counts
        total_properties = self.db.query(Property).count()
        active_properties = (
            self.db.query(Property).filter(Property.is_active == True).count()
        )
        properties_with_drops = (
            self.db.query(Property)
            .filter(Property.price_drop_percentage > 0)
            .count()
        )

        # Price statistics
        price_stats = self.db.query(
            func.avg(Property.current_price).label("average"),
            func.min(Property.current_price).label("min"),
            func.max(Property.current_price).label("max"),
        ).first()

        # Properties by type
        type_counts = (
            self.db.query(Property.property_type, func.count(Property.id))
            .filter(Property.property_type.isnot(None))
            .group_by(Property.property_type)
            .all()
        )

        properties_by_type = {t[0]: t[1] for t in type_counts}

        return {
            "total_properties": total_properties,
            "active_properties": active_properties,
            "properties_with_price_drops": properties_with_drops,
            "average_price": round(price_stats.average, 2) if price_stats.average else 0,
            "price_range": {
                "min": price_stats.min or 0,
                "max": price_stats.max or 0,
            },
            "properties_by_type": properties_by_type,
        }
