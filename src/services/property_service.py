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

    def process_property_batch(
        self,
        session_id: int,
        search_id: int,
        external_search_id: str,
        page: int,
        properties_data: List[dict],
        metadata: dict,
    ) -> Tuple[List[dict], List[dict]]:
        """Process a batch of properties from the extension.

        Args:
            session_id: The crawl session ID.
            search_id: The saved search ID.
            external_search_id: The external search ID from Idealista.
            page: The page number being processed.
            properties_data: List of property data dictionaries.
            metadata: Batch metadata.

        Returns:
            Tuple of (results list, errors list).
        """
        from datetime import datetime

        from src.database.models import PropertyChange, PropertyVisibility

        results = []
        errors = []

        # Check for duplicate IDs within the batch
        seen_ids = set()
        duplicates = []

        for idx, prop_data in enumerate(properties_data):
            external_id = prop_data.get("external_id")
            if external_id in seen_ids:
                duplicates.append((idx, external_id))
            seen_ids.add(external_id)

        if duplicates:
            # Keep only the last occurrence of each duplicate
            for idx, external_id in duplicates:
                logger.warning(f"Duplicate ID in batch: {external_id} at index {idx}")

        for idx, prop_data in enumerate(properties_data):
            try:
                result = self._process_single_property(
                    session_id=session_id,
                    search_id=search_id,
                    external_search_id=external_search_id,
                    page=page,
                    prop_data=prop_data,
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Error processing property at index {idx}: {e}")
                errors.append({
                    "index": idx,
                    "external_id": prop_data.get("external_id"),
                    "code": "PROCESSING_ERROR",
                    "message": str(e),
                })

        self.db.commit()
        return results, errors

    def _process_single_property(
        self,
        session_id: int,
        search_id: int,
        external_search_id: str,
        page: int,
        prop_data: dict,
    ) -> dict:
        """Process a single property from batch data.

        Returns:
            dict with processing result.
        """
        from datetime import datetime

        from src.database.models import (
            PriceHistory,
            Property,
            PropertyChange,
            PropertyVisibility,
        )

        external_id = prop_data.get("external_id")
        title = prop_data.get("title", "")
        price = prop_data.get("price", 0)
        currency = prop_data.get("currency", "EUR")
        location = prop_data.get("location", "")
        url = prop_data.get("url", "")
        square_meters = prop_data.get("square_meters")
        bedrooms = prop_data.get("bedrooms")
        floor_info = prop_data.get("floor_info")
        description = prop_data.get("description")
        photos = prop_data.get("photos", [])

        # Check if property exists
        existing = self.get_property_by_idealista_id(external_id)

        changes = []

        if not existing:
            # Create new property
            prop = Property(
                idealista_id=external_id,
                title=title,
                location=location,
                original_price=price,
                current_price=price,
                size_m2=square_meters,
                bedrooms=bedrooms,
                floor=floor_info,
                has_elevator=self._parse_elevator(floor_info),
                property_url=url,
                image_url=photos[0] if photos else None,
                first_seen_at=datetime.utcnow(),
                last_seen_at=datetime.utcnow(),
                status="active",
                is_active=True,
            )
            self.db.add(prop)
            self.db.flush()  # Get prop.id

            # Record initial price history
            price_history = PriceHistory(
                property_id=prop.id,
                old_price=None,
                new_price=price,
                change_type="initial",
                change_date=datetime.utcnow(),
            )
            self.db.add(price_history)

            action = "created"
            property_id = prop.id

        else:
            # Update existing property
            existing.last_seen_at = datetime.utcnow()

            # Reactivate if missing or sold
            if existing.status in ("missing", "sold"):
                existing.status = "active"
                existing.missing_since = None

            # Check for changes
            if existing.current_price != price:
                changes.append({
                    "attribute": "price",
                    "old_value": existing.current_price,
                    "new_value": price,
                })

                # Update price drop percentage
                if existing.current_price > 0:
                    existing.price_drop_percentage = (
                        (existing.current_price - price) / existing.current_price * 100
                    )

                # Record price history
                price_history = PriceHistory(
                    property_id=existing.id,
                    old_price=existing.current_price,
                    new_price=price,
                    change_type="update" if price < existing.current_price else "increase",
                    change_date=datetime.utcnow(),
                )
                self.db.add(price_history)

                existing.current_price = price

            if existing.title != title:
                changes.append({
                    "attribute": "title",
                    "old_value": existing.title,
                    "new_value": title,
                })
                existing.title = title

            if existing.size_m2 != square_meters and square_meters is not None:
                changes.append({
                    "attribute": "square_meters",
                    "old_value": existing.size_m2,
                    "new_value": square_meters,
                })
                existing.size_m2 = square_meters

            if existing.bedrooms != bedrooms and bedrooms is not None:
                changes.append({
                    "attribute": "bedrooms",
                    "old_value": existing.bedrooms,
                    "new_value": bedrooms,
                })
                existing.bedrooms = bedrooms

            action = "updated" if changes else "seen"
            property_id = existing.id

        # Record visibility event
        visibility = PropertyVisibility(
            event_type="seen",
            property_id=property_id,
            crawl_session_id=session_id,
            saved_search_id=search_id,
            page_number=page,
        )
        self.db.add(visibility)

        return {
            "external_id": external_id,
            "action": action,
            "property_id": property_id,
            "changes": changes,
        }

    def _parse_elevator(self, floor_info: Optional[str]) -> Optional[bool]:
        """Parse elevator information from floor info string."""
        if not floor_info:
            return None
        if "con ascensor" in floor_info.lower():
            return True
        if "sin ascensor" in floor_info.lower():
            return False
        return None
