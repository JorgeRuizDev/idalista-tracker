"""Unit tests for bot challenge classification and pacing calculations."""
import pytest

from src.crawler.detail_crawler import PlaywrightDetailCrawler, classify_challenge


def test_classify_challenge_cloudflare():
    """Test detecting Cloudflare challenge pages."""
    html = "<html><title>Just a moment...</title><body>Checking if the site connection is secure cf-challenge</body></html>"
    assert classify_challenge(403, html) == "cloudflare"
    assert classify_challenge(503, html) == "cloudflare"
    assert classify_challenge(200, html) == "cloudflare"


def test_classify_challenge_captcha():
    """Test detecting CAPTCHA challenge pages."""
    html = "<html><body><form id='challenge-form'><div class='g-recaptcha'></div>Demuestra que no eres un robot</form></body></html>"
    assert classify_challenge(403, html) == "captcha"
    assert classify_challenge(200, html) == "captcha"


def test_classify_challenge_rate_limit():
    """Test detecting HTTP 429 rate limit."""
    assert classify_challenge(429, "") == "rate_limit"
    assert classify_challenge(200, "Too Many Requests - demasiadas peticiones") == "rate_limit"


def test_classify_challenge_clean_page():
    """Test clean listing page produces 'none'."""
    html = "<html><body><h1>Piso en venta</h1><div class='comment'>Espectacular piso</div></body></html>"
    assert classify_challenge(200, html) == "none"


@pytest.mark.asyncio
async def test_jittered_delay_range():
    """Test that crawler request pacing produces delays strictly within 8.0 and 15.0 seconds."""
    crawler = PlaywrightDetailCrawler(min_delay_seconds=8.0, max_delay_seconds=15.0)
    for _ in range(20):
        delay = await crawler.get_jittered_delay()
        assert 8.0 <= delay <= 15.0
