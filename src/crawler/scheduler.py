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

    # Add the crawl job
    trigger = IntervalTrigger(hours=settings.CRAWL_INTERVAL_HOURS)

    sched.add_job(
        scheduled_crawl,
        trigger=trigger,
        id="property_crawl",
        name="Property Email Crawl",
        replace_existing=True,
        next_run_time=datetime.utcnow() + timedelta(minutes=1),  # Start 1 minute after startup
    )

    logger.info(
        f"Scheduler initialized with {settings.CRAWL_INTERVAL_HOURS} hour interval"
    )

    return sched


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
