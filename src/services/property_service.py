"""Property service for business logic."""
import base64
import logging
import urllib.request
from datetime import timedelta
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from src.database.models import PriceHistory, Property, SavedSearch

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

    def _get_or_create_saved_search(
        self,
        search_id: int,
        external_search_id: str,
    ) -> int:
        """Get a valid saved search ID or create one if needed.

        Args:
            search_id: The provided search ID (may be local extension ID).
            external_search_id: The external search ID from Idealista.

        Returns:
            Valid saved search ID from database.
        """
        # First, try to find by the provided search_id
        search = self.db.query(SavedSearch).filter(SavedSearch.id == search_id).first()

        if search:
            return search.id

        # If not found, try to find by external_search_id
        search = self.db.query(SavedSearch).filter(
            SavedSearch.external_search_id == external_search_id
        ).first()

        if search:
            return search.id

        # If still not found, create a new saved search
        logger.warning(
            f"Saved search not found (ID: {search_id}, external: {external_search_id}). "
            "Creating new saved search entry."
        )

        new_search = SavedSearch(
            external_search_id=external_search_id,
            name=f"Search {external_search_id}",
            url_path="/",
            full_url=f"https://www.idealista.com/{external_search_id}",
            description="Auto-created from extension batch",
        )
        self.db.add(new_search)
        self.db.flush()  # Get the ID

        logger.info(f"Created new saved search with ID: {new_search.id}")
        return new_search.id

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
        query = self.db.query(Property).options(selectinload(Property.price_history))

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

        # Set price history count on each property for serialization
        for prop in properties:
            prop.price_history_count = len(prop.price_history)

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
            self.db.query(Property).filter(Property.status == "active").count()
        )
        missing_properties = (
            self.db.query(Property).filter(Property.status == "missing").count()
        )
        sold_properties = (
            self.db.query(Property).filter(Property.status == "sold").count()
        )
        properties_with_drops = (
            self.db.query(Property)
            .filter(Property.price_drop_percentage > 0)
            .count()
        )

        properties_with_history = (
            self.db.query(Property.id)
            .join(PriceHistory, Property.id == PriceHistory.property_id)
            .distinct()
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

        # Average days to sell (for properties with sold_at and missing_since)
        avg_days_result = self.db.query(
            func.avg(
                func.julianday(Property.sold_at) - func.julianday(Property.missing_since)
            )
        ).filter(
            Property.sold_at.isnot(None),
            Property.missing_since.isnot(None),
        ).first()

        avg_days_to_sell = round(avg_days_result[0], 1) if avg_days_result[0] else None

        return {
            "total_properties": total_properties,
            "active_properties": active_properties,
            "missing_properties": missing_properties,
            "sold_properties": sold_properties,
            "avg_days_to_sell": avg_days_to_sell,
            "properties_with_price_drops": properties_with_drops,
            "properties_with_price_history": properties_with_history,
            "average_price": round(price_stats.average, 2) if price_stats.average else 0,
            "price_range": {
                "min": price_stats.min or 0,
                "max": price_stats.max or 0,
            },
            "properties_by_type": properties_by_type,
        }

    def get_crawl_history(self, days: int = 90) -> list[dict]:
        """Get daily crawl history with aggregated price change statistics.

        Args:
            days: Number of days of history to return (default 90).

        Returns:
            List of dicts with per-day crawl statistics, sorted by date descending.
        """
        from collections import defaultdict
        from datetime import datetime, timedelta

        cutoff = datetime.utcnow() - timedelta(days=days)

        # Price changes per day from price_history
        price_rows = (
            self.db.query(
                func.date(PriceHistory.change_date).label("date"),
                PriceHistory.change_type,
                PriceHistory.old_price,
                PriceHistory.new_price,
            )
            .filter(PriceHistory.change_date >= cutoff)
            .all()
        )

        # Aggregate price changes by date in Python
        entries_by_date: dict[str, dict] = defaultdict(
            lambda: {
                "new_properties": 0,
                "new_inactives": 0,
                "price_drops": 0,
                "price_increases": 0,
                "drop_amounts": [],
                "increase_amounts": [],
            }
        )

        for row in price_rows:
            date_str = str(row.date)
            entry = entries_by_date[date_str]

            if row.change_type == "initial":
                entry["new_properties"] += 1
            elif row.old_price is not None and row.new_price is not None:
                # Use actual price comparison to determine drop vs increase
                # (email crawler uses "update" for increases; extension uses "increase")
                if row.new_price < row.old_price:
                    entry["price_drops"] += 1
                    entry["drop_amounts"].append(row.old_price - row.new_price)
                elif row.new_price > row.old_price:
                    entry["price_increases"] += 1
                    entry["increase_amounts"].append(row.new_price - row.old_price)

        # Count currently-inactive properties by the date they became inactive
        missing_rows = (
            self.db.query(
                func.date(Property.missing_since).label("date"),
                func.count(Property.id).label("cnt"),
            )
            .filter(
                Property.status == "missing",
                Property.missing_since.isnot(None),
                Property.missing_since >= cutoff,
            )
            .group_by(func.date(Property.missing_since))
            .all()
        )

        sold_rows = (
            self.db.query(
                func.date(Property.sold_at).label("date"),
                func.count(Property.id).label("cnt"),
            )
            .filter(
                Property.status == "sold",
                Property.sold_at.isnot(None),
                Property.sold_at >= cutoff,
            )
            .group_by(func.date(Property.sold_at))
            .all()
        )

        for row in missing_rows:
            entries_by_date[str(row.date)]["new_inactives"] += row.cnt

        for row in sold_rows:
            entries_by_date[str(row.date)]["new_inactives"] += row.cnt

        # Build sorted result
        result = []
        for date_str, entry in sorted(entries_by_date.items(), reverse=True):
            drop_amounts = entry.pop("drop_amounts")
            increase_amounts = entry.pop("increase_amounts")
            result.append({
                "date": date_str,
                "new_properties": entry["new_properties"],
                "new_inactives": entry["new_inactives"],
                "price_drops": entry["price_drops"],
                "price_increases": entry["price_increases"],
                "avg_drop_amount": round(sum(drop_amounts) / len(drop_amounts), 2) if drop_amounts else None,
                "avg_increase_amount": round(sum(increase_amounts) / len(increase_amounts), 2) if increase_amounts else None,
            })

        return result

    def get_crawl_history_detail(self, date_str: str) -> dict:
        """Get detailed crawl history for a specific date.

        Args:
            date_str: Date string in YYYY-MM-DD format.

        Returns:
            Dict with lists of affected properties grouped by event type.
        """
        from datetime import datetime

        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()

        # New properties (first price history entry on this date)
        new_property_ids = (
            self.db.query(PriceHistory.property_id)
            .filter(
                PriceHistory.change_type == "initial",
                func.date(PriceHistory.change_date) == target_date,
            )
            .distinct()
            .all()
        )
        new_property_ids = {row[0] for row in new_property_ids}

        # Price change events on this date (exclude initial; categorize by actual price comparison)
        all_change_rows = (
            self.db.query(
                PriceHistory.property_id,
                PriceHistory.old_price,
                PriceHistory.new_price,
            )
            .filter(
                PriceHistory.change_type != "initial",
                PriceHistory.old_price.isnot(None),
                PriceHistory.new_price.isnot(None),
                func.date(PriceHistory.change_date) == target_date,
            )
            .all()
        )

        drop_rows = [r for r in all_change_rows if r[2] < r[1]]
        increase_rows = [r for r in all_change_rows if r[2] > r[1]]

        # Properties that went inactive on this date
        inactive_ids = (
            self.db.query(Property.id)
            .filter(
                Property.status.in_(["missing", "sold"]),
                func.date(Property.missing_since) == target_date,
            )
            .all()
        )
        sold_ids = (
            self.db.query(Property.id)
            .filter(
                Property.status == "sold",
                func.date(Property.sold_at) == target_date,
            )
            .all()
        )
        missing_ids = (
            self.db.query(Property.id)
            .filter(
                Property.status == "missing",
                func.date(Property.missing_since) == target_date,
            )
            .all()
        )

        # Fetch property details for all affected properties
        all_ids = set()
        all_ids.update(new_property_ids)
        all_ids.update({r[0] for r in drop_rows})
        all_ids.update({r[0] for r in increase_rows})
        all_ids.update({r[0] for r in inactive_ids})
        all_ids.update({r[0] for r in sold_ids})
        all_ids.update({r[0] for r in missing_ids})

        properties_map = {}
        if all_ids:
            props = (
                self.db.query(Property)
                .filter(Property.id.in_(all_ids))
                .all()
            )
            properties_map = {p.id: p for p in props}

        def prop_summary(prop_id):
            p = properties_map.get(prop_id)
            if not p:
                return None
            return {
                "id": p.id,
                "idealista_id": p.idealista_id,
                "title": p.title,
                "location": p.location,
                "current_price": p.current_price,
                "status": p.status,
                "property_url": p.property_url,
            }

        return {
            "date": date_str,
            "new_properties": [prop_summary(pid) for pid in new_property_ids if prop_summary(pid)],
            "price_drops": [
                {
                    **prop_summary(row[0]),
                    "old_price": row[1],
                    "new_price": row[2],
                    "drop_amount": row[1] - row[2] if row[1] and row[2] else None,
                }
                for row in drop_rows
                if prop_summary(row[0])
            ],
            "price_increases": [
                {
                    **prop_summary(row[0]),
                    "old_price": row[1],
                    "new_price": row[2],
                    "increase_amount": row[2] - row[1] if row[1] and row[2] else None,
                }
                for row in increase_rows
                if prop_summary(row[0])
            ],
            "new_missing": [prop_summary(row[0]) for row in missing_ids if prop_summary(row[0])],
            "new_sold": [prop_summary(row[0]) for row in sold_ids if prop_summary(row[0])],
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

        # Validate and get correct saved search ID
        valid_search_id = self._get_or_create_saved_search(search_id, external_search_id)

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
                    search_id=valid_search_id,
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

            # Download and store image
            PropertyService.download_and_store_image(prop)

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

        # Attempt to download image if we have URL but no data yet
        target = existing if existing else prop
        if target.image_url and not target.image_data:
            PropertyService.download_and_store_image(target)

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

    @staticmethod
    def download_and_store_image(prop: Property) -> bool:
        """Download image from prop.image_url and store as base64 in prop.image_data.

        Args:
            prop: Property object with image_url set.

        Returns:
            True if image was downloaded and stored successfully.
        """
        if not prop.image_url or prop.image_data:
            return False

        try:
            req = urllib.request.Request(prop.image_url, headers={"User-Agent": "idalista-tracker/1.0"})
            with urllib.request.urlopen(req, timeout=15) as response:
                image_bytes = response.read()
                content_type = response.headers.get("Content-Type", "image/jpeg")

            if len(image_bytes) < 100:
                logger.warning(f"Image too small for property {prop.idealista_id}: {len(image_bytes)} bytes")
                return False

            b64 = base64.b64encode(image_bytes).decode("ascii")
            prop.image_data = f"data:{content_type};base64,{b64}"
            logger.info(f"Downloaded image for property {prop.idealista_id}: {len(image_bytes)} bytes")
            return True
        except Exception as e:
            logger.warning(f"Failed to download image for property {prop.idealista_id} from {prop.image_url}: {e}")
            return False
