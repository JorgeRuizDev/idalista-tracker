"""APScheduler configuration for automatic crawling."""
import logging
from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from src.config import settings
from src.database.session import get_db_session

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None


def get_scheduler() -> AsyncIOScheduler:
    """Get or create the global scheduler instance.

    Returns:
        AsyncIOScheduler instance.
    """
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler()
    return scheduler


async def scheduled_crawl() -> None:
    """The scheduled crawl job."""
    logger.info("Starting scheduled crawl job...")

    try:
        with get_db_session() as db:
            from src.crawler.service import CrawlerService

            service = CrawlerService(db)
            result = service.crawl(full_sync=False)

            logger.info(
                f"Scheduled crawl complete: {result.emails_processed} emails, "
                f"{result.properties_found} properties, {result.new_properties} new, "
                f"{result.price_updates} updates, {result.errors} errors"
            )
    except Exception as e:
        logger.error(f"Scheduled crawl failed: {e}")


def init_scheduler() -> AsyncIOScheduler:
    """Initialize and configure the scheduler.

    Returns:
        Configured AsyncIOScheduler instance.
    """
    sched = get_scheduler()

    # Email crawler is DISABLED - only extension crawler is used
    # To re-enable email crawling, uncomment the following block:
    #
    # trigger = IntervalTrigger(hours=settings.CRAWL_INTERVAL_HOURS)
    # sched.add_job(
    #     scheduled_crawl,
    #     trigger=trigger,
    #     id="property_crawl",
    #     name="Property Email Crawl",
    #     replace_existing=True,
    #     next_run_time=datetime.utcnow() + timedelta(minutes=1),
    # )
    # logger.info(
    #     f"Scheduler initialized with {settings.CRAWL_INTERVAL_HOURS} hour interval"
    # )

    logger.info("Email crawler scheduler is DISABLED - extension crawler only")

    # Detail crawler scheduled job (runs every 2 minutes to process pending queues)
    sched.add_job(
        scheduled_detail_crawl,
        trigger=IntervalTrigger(minutes=2),
        id="detail_crawl",
        name="Property Detail Snapshot Crawl",
        replace_existing=True,
        next_run_time=datetime.utcnow() + timedelta(seconds=15),
    )
    logger.info("Property Detail Crawler scheduled every 2 minutes")

    return sched


async def scheduled_detail_crawl() -> None:
    """Scheduled background worker to poll pending detail properties and crawl them."""
    logger.info("Polling for pending property detail crawls...")
    try:
        with get_db_session() as db:
            from src.crawler.detail_crawler import PlaywrightDetailCrawler
            from src.services.property_service import PropertyService

            service = PropertyService(db)
            # Fetch pending listings that have not exceeded backend attempts and are not flagged priority for extension
            pending_props = service.get_pending_detail_properties(limit=5)
            # Filter for backend eligible: not already delegated to extension
            backend_candidates = [
                p for p in pending_props if not p.fallback_to_extension and p.backend_attempts < 3
            ]

            if not backend_candidates:
                logger.debug("No backend candidates pending detail crawling")
                return

            crawler = PlaywrightDetailCrawler()

            for prop in backend_candidates:
                logger.info(f"Detail crawling property {prop.idealista_id} ({prop.property_url})...")
                # Apply polite jittered pacing (8–15s)
                await crawler.apply_polite_pacing()

                try:
                    result = await crawler.extract_listing_details(prop.property_url)
                except Exception as e:
                    logger.warning(f"Error crawling property {prop.idealista_id}: {e}")
                    service.record_backend_attempt(
                        prop.id,
                        challenge="none",
                        outcome="retryable_error",
                        error_message=str(e),
                    )
                    continue

                if result.get("is_delisted"):
                    logger.info(f"Property {prop.idealista_id} confirmed delisted; marking discarded")
                    service.mark_detail_discarded(prop.id, reason="delisted")
                    service.record_backend_attempt(
                        prop.id,
                        outcome="delisted",
                        http_status=result.get("http_status"),
                    )
                elif result.get("challenge", "none") != "none":
                    logger.warning(
                        f"Challenge {result['challenge']} encountered on {prop.idealista_id}"
                    )
                    service.record_backend_attempt(
                        prop.id,
                        challenge=result["challenge"],
                        outcome="retryable_error",
                        http_status=result.get("http_status"),
                    )
                else:
                    logger.info(f"Successfully extracted snapshot for property {prop.idealista_id}")
                    await service.save_property_snapshot(prop.id, result)
                    service.record_backend_attempt(
                        prop.id,
                        challenge="none",
                        outcome="success",
                        http_status=result.get("http_status"),
                    )

    except Exception as e:
        logger.error(f"Scheduled detail crawl job failed: {e}")


def start_scheduler() -> None:
    """Start the scheduler."""
    sched = get_scheduler()
    if not sched.running:
        sched.start()
        logger.info("Scheduler started")
    else:
        logger.warning("Scheduler already running")


def stop_scheduler() -> None:
    """Stop the scheduler."""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
        scheduler = None
    else:
        logger.warning("Scheduler not running")


def get_next_run_time() -> Optional[datetime]:
    """Get the next scheduled crawl time.

    Returns:
        Next crawl datetime or None if scheduler not running.
    """
    sched = get_scheduler()
    if not sched or not sched.running:
        return None

    job = sched.get_job("property_crawl")
    if job:
        return job.next_run_time

    return None
