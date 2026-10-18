"""Playwright-based autonomous stealth browser crawler for Idealista property detail pages."""

import asyncio
import logging
import random
from typing import Any, Dict, Optional

from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from src.crawler.detail_parser import DetailParser

logger = logging.getLogger(__name__)


def classify_challenge(status_code: Optional[int], html_content: str) -> str:
    """Classify anti-bot challenges from HTTP status and response HTML.

    Args:
        status_code: HTTP response status code.
        html_content: Page HTML content.

    Returns:
        One of 'none', 'captcha', 'cloudflare', 'rate_limit'.
    """
    if status_code == 429:
        return "rate_limit"

    lower = (html_content or "").lower()

    if status_code in (403, 503):
        if any(
            k in lower
            for k in ["cloudflare", "cf-challenge", "challenge-platform", "just a moment"]
        ):
            return "cloudflare"
        if any(k in lower for k in ["captcha", "recaptcha", "hcaptcha", "turnstile", "geetest"]):
            return "captcha"
        return "cloudflare"

    if any(
        k in lower
        for k in ["cf-challenge", "challenge-platform", "checking if the site connection is secure"]
    ):
        return "cloudflare"

    if any(
        k in lower
        for k in ["g-recaptcha", "hcaptcha", "cf-turnstile", "demuestra que no eres un robot"]
    ):
        return "captcha"

    if "demasiadas peticiones" in lower or "too many requests" in lower:
        return "rate_limit"

    return "none"


class PlaywrightDetailCrawler:
    """Autonomous stealth Playwright crawler for Idealista listing details."""

    def __init__(
        self,
        min_delay_seconds: float = 8.0,
        max_delay_seconds: float = 15.0,
        headless: bool = True,
    ) -> None:
        """Initialize crawler with pacing limits.

        Args:
            min_delay_seconds: Minimum delay between successive requests (anti-bot friendly).
            max_delay_seconds: Maximum delay between successive requests.
            headless: Whether to launch Chromium in headless mode.
        """
        self.min_delay_seconds = min_delay_seconds
        self.max_delay_seconds = max_delay_seconds
        self.headless = headless
        self.parser = DetailParser()

    async def get_jittered_delay(self) -> float:
        """Calculate random jittered delay in seconds (8–15s)."""
        return random.uniform(self.min_delay_seconds, self.max_delay_seconds)

    async def apply_polite_pacing(self) -> None:
        """Sleep for a jittered delay to prevent triggering IP blocks."""
        delay = await self.get_jittered_delay()
        logger.info(f"Applying polite crawler pacing delay: {delay:.2f}s")
        await asyncio.sleep(delay)

    async def extract_listing_details(self, url: str) -> Dict[str, Any]:
        """Navigate to listing URL with stealth configuration and extract details.

        Args:
            url: Listing web URL.

        Returns:
            Dict containing parsed listing snapshot or challenge / delisted indicators.
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=self.headless,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-infobars",
                    "--window-size=1920,1080",
                ],
            )
            try:
                context = await browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    ),
                    locale="es-ES",
                    timezone_id="Europe/Madrid",
                    extra_http_headers={
                        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
                        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124"',
                        "Sec-Ch-Ua-Mobile": "?0",
                        "Sec-Ch-Ua-Platform": '"Windows"',
                    },
                )

                # Stealth evasions
                await context.add_init_script(
                    "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
                )

                page = await context.new_page()

                logger.info(f"Navigating to {url}...")
                response = await page.goto(url, wait_until="domcontentloaded", timeout=35000)

                status_code = response.status if response else 200

                # Check if HTTP 404 or 410 (delisted)
                if status_code in (404, 410):
                    logger.warning(f"Listing delisted with HTTP {status_code}: {url}")
                    return {
                        "is_delisted": True,
                        "http_status": status_code,
                        "challenge": "none",
                        "photos": [],
                    }

                # Gallery hydration interaction: scroll down slightly to hydrate lazy-loaded photos
                try:
                    await page.evaluate("window.scrollBy(0, 400)")
                    await page.wait_for_timeout(1500)
                except Exception as e:
                    logger.debug(f"Scroll evaluation notice: {e}")

                html_content = await page.content()

                # Check anti-bot challenges
                challenge = classify_challenge(status_code, html_content)
                if challenge != "none":
                    logger.warning(
                        f"Anti-bot challenge detected ({challenge}, HTTP {status_code}) on {url}"
                    )
                    return {
                        "challenge": challenge,
                        "http_status": status_code,
                        "is_delisted": False,
                        "raw_html": html_content,
                    }

                # Parse listing content
                parsed_data = self.parser.parse_html(html_content, http_status=status_code)
                parsed_data["http_status"] = status_code
                parsed_data["challenge"] = "none"
                parsed_data["source_engine"] = "backend_playwright"
                return parsed_data

            finally:
                await browser.close()
