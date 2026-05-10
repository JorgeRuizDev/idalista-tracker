"""Crawler service for orchestrating email fetching and property extraction."""
import logging
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from src.config import settings
from src.crawler.imap_client import EmailMessage, IMAPClient
from src.crawler.parser import EmailParser, ParsedProperty
from src.database.models import EmailSource, PriceHistory, Property

logger = logging.getLogger(__name__)


class CrawlResult:
    """Result of a crawl operation."""

    def __init__(self) -> None:
        """Initialize crawl result."""
        self.emails_processed = 0
        self.properties_found = 0
        self.new_properties = 0
        self.price_updates = 0
        self.errors = 0


class CrawlerService:
    """Service for crawling Gmail and processing property emails."""

    def __init__(
        self,
        db: Session,
        email_client: Optional[IMAPClient] = None,
        parser: Optional[EmailParser] = None,
    ) -> None:
        """Initialize the crawler service.

        Args:
            db: Database session.
            email_client: IMAP client instance. Creates new if None.
            parser: Email parser instance. Creates new if None.
        """
        self.db = db
        self.email_client = email_client or IMAPClient()
        self.parser = parser or EmailParser()
        self.sender_filter = settings.GMAIL_SENDER_FILTER

    def crawl(self, full_sync: bool = False) -> CrawlResult:
        """Run the crawl operation.

        Args:
            full_sync: If True, process all emails. If False, only unread.

        Returns:
            CrawlResult with statistics.
        """
        result = CrawlResult()

        try:
            with self.email_client:
                # Fetch emails
                if full_sync:
                    emails = self.email_client.fetch_all_emails(
                        sender_filter=self.sender_filter
                    )
                else:
                    emails = self.email_client.fetch_unread_emails(
                        sender_filter=self.sender_filter
                    )

                logger.info(f"Processing {len(emails)} emails...")

                for email_msg in emails:
                    try:
                        processed = self._process_email(email_msg, result)
                        if processed:
                            result.emails_processed += 1
                    except Exception as e:
                        logger.error(f"Error processing email {email_msg.message_id}: {e}")
                        result.errors += 1
                        # Store failed email
                        self._store_failed_email(email_msg, str(e))

        except Exception as e:
            logger.error(f"Crawl operation failed: {e}")
            raise

        logger.info(
            f"Crawl complete: {result.emails_processed} emails processed, "
            f"{result.properties_found} properties found, "
            f"{result.new_properties} new, {result.price_updates} updated, "
            f"{result.errors} errors"
        )

        return result

    def _process_email(self, email_msg: EmailMessage, result: CrawlResult) -> bool:
        """Process a single email.

        Args:
            email_msg: The email message to process.
            result: CrawlResult to update.

        Returns:
            True if email was processed successfully.
        """
        # Check if email already processed
        existing = (
            self.db.query(EmailSource)
            .filter(EmailSource.message_id == email_msg.message_id)
            .first()
        )

        if existing and existing.status == "processed":
            logger.debug(f"Email {email_msg.message_id} already processed, skipping")
            return False

        # Create or update email source record
        if existing:
            email_source = existing
            email_source.status = "pending"
            email_source.error_message = None
        else:
            email_source = EmailSource(
                message_id=email_msg.message_id,
                sender=email_msg.sender,
                subject=email_msg.subject,
                received_at=self._parse_date(email_msg.received_at),
                status="pending",
                raw_content=email_msg.body[:10000] if email_msg.body else None,  # Limit size
            )
            self.db.add(email_source)
            self.db.flush()  # Get the ID

        # Parse properties from email
        parsed_properties = self.parser.parse_email(
            sender=email_msg.sender,
            subject=email_msg.subject,
            body=email_msg.body,
        )

        properties_count = 0
        for parsed_prop in parsed_properties:
            try:
                new, updated = self._save_property(parsed_prop, email_source.id)
                if new:
                    result.new_properties += 1
                if updated:
                    result.price_updates += 1
                properties_count += 1
            except Exception as e:
                logger.error(f"Error saving property {parsed_prop.idealista_id}: {e}")
                result.errors += 1

        # Update email source record
        email_source.status = "processed"
        email_source.processed_at = datetime.utcnow()
        email_source.properties_count = properties_count

        result.properties_found += properties_count

        self.db.commit()
        return True

    def _save_property(
        self, parsed: ParsedProperty, email_id: int
    ) -> Tuple[bool, bool]:
        """Save or update a property.

        Args:
            parsed: Parsed property data.
            email_id: The email source ID.

        Returns:
            Tuple of (is_new, is_updated).
        """
        # Check if property exists
        existing = (
            self.db.query(Property)
            .filter(Property.idealista_id == parsed.idealista_id)
            .first()
        )

        if existing:
            # Update existing property
            is_new = False
            is_updated = self._update_property(existing, parsed, email_id)
            return is_new, is_updated
        else:
            # Create new property
            self._create_property(parsed, email_id)
            return True, False

    def _create_property(self, parsed: ParsedProperty, email_id: int) -> Property:
        """Create a new property.

        Args:
            parsed: Parsed property data.
            email_id: The email source ID.

        Returns:
            Created Property object.
        """
        property_obj = Property(
            idealista_id=parsed.idealista_id,
            title=parsed.title,
            property_type=parsed.property_type,
            location=parsed.location,
            original_price=parsed.original_price or parsed.current_price,
            current_price=parsed.current_price,
            price_drop_percentage=parsed.price_drop_percentage,
            size_m2=parsed.size_m2,
            bedrooms=parsed.bedrooms,
            floor=parsed.floor,
            has_elevator=parsed.has_elevator,
            property_url=parsed.property_url,
            image_url=parsed.image_url,
            email_id=email_id,
            is_active=True,
        )
        self.db.add(property_obj)
        self.db.flush()

        # Create initial price history entry
        price_history = PriceHistory(
            property_id=property_obj.id,
            old_price=None,
            new_price=parsed.current_price,
            change_type="initial",
            email_id=email_id,
        )
        self.db.add(price_history)

        logger.info(f"Created new property: {parsed.idealista_id} - {parsed.title[:50]}...")
        return property_obj

    def _update_property(
        self, existing: Property, parsed: ParsedProperty, email_id: int
    ) -> bool:
        """Update an existing property if price changed.

        Args:
            existing: Existing Property object.
            parsed: Parsed property data.
            email_id: The email source ID.

        Returns:
            True if property was updated.
        """
        # Check if price changed
        if existing.current_price == parsed.current_price:
            logger.debug(f"Property {parsed.idealista_id} price unchanged")
            return False

        old_price = existing.current_price
        new_price = parsed.current_price

        # Determine change type
        if new_price < old_price:
            change_type = "drop"
        else:
            change_type = "update"

        # Update property
        existing.current_price = new_price
        if parsed.price_drop_percentage is not None:
            existing.price_drop_percentage = parsed.price_drop_percentage
        else:
            # Recalculate
            drop_pct = ((existing.original_price - new_price) / existing.original_price) * 100
            existing.price_drop_percentage = round(drop_pct, 2)

        existing.updated_at = datetime.utcnow()

        # Create price history entry
        price_history = PriceHistory(
            property_id=existing.id,
            old_price=old_price,
            new_price=new_price,
            change_type=change_type,
            email_id=email_id,
        )
        self.db.add(price_history)

        logger.info(
            f"Updated property {parsed.idealista_id}: price {old_price} -> {new_price} ({change_type})"
        )
        return True

    def _store_failed_email(self, email_msg: EmailMessage, error: str) -> None:
        """Store a failed email for retry.

        Args:
            email_msg: The email message.
            error: Error message.
        """
        existing = (
            self.db.query(EmailSource)
            .filter(EmailSource.message_id == email_msg.message_id)
            .first()
        )

        if existing:
            existing.status = "failed"
            existing.error_message = error
            existing.processed_at = datetime.utcnow()
        else:
            email_source = EmailSource(
                message_id=email_msg.message_id,
                sender=email_msg.sender,
                subject=email_msg.subject,
                received_at=self._parse_date(email_msg.received_at),
                status="failed",
                error_message=error,
                raw_content=email_msg.body[:10000] if email_msg.body else None,
            )
            self.db.add(email_source)

        self.db.commit()

    def _parse_date(self, date_str: str) -> datetime:
        """Parse email date string to datetime.

        Args:
            date_str: Date string from email.

        Returns:
            Parsed datetime or current time if parsing fails.
        """
        try:
            from email.utils import parsedate_to_datetime

            return parsedate_to_datetime(date_str)
        except Exception:
            return datetime.utcnow()
