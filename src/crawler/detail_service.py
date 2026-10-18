"""CLI and service runner for manual and test detail crawls."""

import argparse
import asyncio
import logging
import sys

from src.database.models import Property
from src.database.session import get_db_session
from src.services.property_service import PropertyService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def run_detail_crawl(property_id_or_idealista: str, simulate_404: bool = False) -> None:
    """Run detail crawl for a specific property."""
    with get_db_session() as db:
        service = PropertyService(db)
        prop = (
            db.query(Property)
            .filter(
                (Property.idealista_id == property_id_or_idealista)
                | (
                    Property.id
                    == (int(property_id_or_idealista) if property_id_or_idealista.isdigit() else -1)
                )
            )
            .first()
        )

        if not prop:
            logger.error(f"Property {property_id_or_idealista} not found")
            sys.exit(1)

        if simulate_404:
            logger.info(f"Simulating 404 delisted page for property {prop.idealista_id}")
            service.mark_detail_discarded(prop.id, reason="delisted")
            service.record_backend_attempt(prop.id, outcome="delisted", http_status=404)
            logger.info("Property marked discarded with reason: delisted")
            return

        from src.crawler.detail_crawler import PlaywrightDetailCrawler

        crawler = PlaywrightDetailCrawler()
        logger.info(f"Crawling detail for {prop.idealista_id} at {prop.property_url}...")
        result = await crawler.extract_listing_details(prop.property_url)

        if result.get("is_delisted"):
            service.mark_detail_discarded(prop.id, reason="delisted")
            service.record_backend_attempt(
                prop.id, outcome="delisted", http_status=result.get("http_status")
            )
            logger.info(f"Property {prop.idealista_id} delisted")
        elif result.get("challenge", "none") != "none":
            service.record_backend_attempt(
                prop.id,
                challenge=result["challenge"],
                outcome="retryable_error",
                http_status=result.get("http_status"),
            )
            logger.warning(f"Challenge {result['challenge']} encountered")
        else:
            await service.save_property_snapshot(prop.id, result)
            service.record_backend_attempt(
                prop.id,
                challenge="none",
                outcome="success",
                http_status=result.get("http_status"),
            )
            logger.info(f"Successfully saved detail snapshot for {prop.idealista_id}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Detail crawler runner")
    parser.add_argument("--property-id", required=True, help="Property ID or Idealista ID")
    parser.add_argument(
        "--simulate-404", action="store_true", help="Simulate a 404 delisted listing"
    )
    args = parser.parse_args()

    asyncio.run(run_detail_crawl(args.property_id, simulate_404=args.simulate_404))


if __name__ == "__main__":
    main()
