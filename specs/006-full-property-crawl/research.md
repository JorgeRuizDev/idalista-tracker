# Phase 0 Research: Full Property Snapshot Crawler

**Feature**: Full Property Snapshot Crawler  
**Branch**: `006-full-property-crawl`  
**Date**: 2026-10-17  

## Executive Summary

This document consolidates architectural research and technology evaluations for implementing a full listing web snapshot crawler (photo gallery, description, location attributes) for Idealista properties. The crawler must withstand aggressive anti-bot defenses using a hybrid execution model: an autonomous backend browser crawler ("heavy machinery") as the primary executor, falling back to the authenticated user's Chrome extension when bot challenges (e.g., CAPTCHAs, Cloudflare interstitials) arise.

---

## Decision 1: Primary Backend Crawler Engine ("Heavy Machinery")

### Context
Idealista employs advanced anti-bot protections (Cloudflare, DataDome, behavioral analysis, TLS fingerprinting, and device telemetry). Simple HTTP request libraries (like `requests` or `httpx` with BeautifulSoup) get blocked almost immediately with HTTP 403 or challenge interstitials. The user explicitly required "heavy machinery" for the backend worker.

### Decision
**Adopt `playwright` (async Python) with browser stealth configuration and realistic viewport/fingerprint emulation.**

### Rationale
1. **Full JavaScript & DOM Execution**: Idealista listing galleries and location accordions rely on client-side hydration and lazy-loaded elements. Playwright renders the entire page, executes scripts, and captures high-resolution gallery URLs from rendered DOM and image attributes (`srcset`, `data-ondemand-img`).
2. **Stealth Capabilities**: With proper args (`--disable-blink-features=AutomationControlled`, realistic user agents, language headers, masked `navigator.webdriver`), Playwright evades automated headless browser detection signatures.
3. **Async Native**: Seamlessly integrates with the existing FastAPI and `asyncio` event loop already present in `src/crawler/`.
4. **Network Interception**: Playwright allows intercepting image requests and extracting clean media asset URLs or response buffers directly without triggering secondary anti-bot challenges.

### Alternatives Evaluated
- **`curl_cffi` / `tls-client`**: Excellent at TLS fingerprint impersonation, but lacks a browser runtime to execute JavaScript-heavy photo galleries, interactive floor plans, and dynamic maps.
- **`undetected-chromedriver` (Selenium)**: Effective against Cloudflare, but lacks native async Python integration, is prone to driver binary version mismatches, and has higher resource overhead than Playwright.
- **Headless Chrome via Puppeteer**: Requires Node.js backend infrastructure, complicating the existing Python FastAPI backend architecture.

---

## Decision 2: Photo & Media Persistence Architecture

### Context
Idealista listings contain between 10 and 50+ high-resolution photographs. Clarification confirmed that **all gallery photo binaries must be downloaded locally** because remote CDN links break or return 404 once a listing is delisted.

### Decision
**Implement a dedicated local media storage pipeline with FastAPI static mounting:**
- Storage root: `data/media/properties/{idealista_id}/` (configurable via `settings.MEDIA_DIR`).
- File naming: `photo_{sequence_index:03d}_{photo_hash}.jpg`.
- Database storage: Store relative file path (`properties/{idealista_id}/photo_001.jpg`), original source CDN URL, display sequence index, width, height, and content size.
- Delivery: FastAPI mounts `data/media` under route `/media`, enabling local serving for the Next.js frontend and external inspection.

### Rationale
- Downloading images directly during or immediately after page extraction guarantees 100% preservation before Idealista deactivates the listing.
- Organizing files hierarchically by `idealista_id` prevents directory entry limits from being exceeded on standard filesystems.
- Serving via FastAPI static mount keeps the architecture self-contained without requiring S3 or cloud buckets for local development.

### Alternatives Evaluated
- **Database BLOB Storage (SQLite)**: Storing 30+ multi-megabyte images inside SQLite would cause database bloat (growing into gigabytes quickly), degradation in query latency, and high memory consumption during backups.
- **External CDN URLs Only**: Rejected by user requirement; when properties are delisted, Idealista invalidates CDN URLs, causing permanent image loss.

---

## Decision 3: Database Schema Migration & Legacy Classification

### Context
Existing properties in the database (crawled via email alerts or basic search crawls) must NOT be backfilled or re-crawled. Only new properties should receive the full crawl. Each property must track its detail crawl lifecycle (`legacy`, `pending`, `completed`, `discarded`).

### Decision
**Extend `Property` model and introduce three normalized supporting tables:**
1. **`Property.detail_status`**: Column `VARCHAR(20) NOT NULL DEFAULT 'legacy'` indexed.
   - Values: `'legacy'`, `'pending'`, `'completed'`, `'discarded'`.
   - Migration sets `detail_status = 'legacy'` for all existing records.
   - Future discovery ingestion defaults new records to `detail_status = 'pending'`.
2. **`PropertySnapshot`**: Contains 1-to-1 relationship with `Property`:
   - `crawled_at` (UTC timestamp)
   - `full_description` (Text)
   - `neighborhood`, `district`, `city`, `province`
   - `latitude`, `longitude`
   - `amenities` (JSON structured dictionary)
   - `floor_plan_available` (Boolean)
3. **`PropertyPhoto`**: Contains 1-to-many relationship with `Property`:
   - `local_file_path`, `original_url`, `sequence_index`, `caption`
4. **`DetailCrawlAttempt`**: Contains audit log of each crawl attempt:
   - `source` (`'backend'`, `'extension'`)
   - `attempt_number`, `http_status`, `challenge_type`, `outcome`, `error_message`, `created_at`

### Rationale
- Normalizing snapshot data and photos prevents bloating the core `property` table which is frequently queried for list and filter views.
- Defaulting `detail_status = 'legacy'` guarantees existing database records are safely isolated on first startup.

---

## Decision 4: Hybrid Fallback Protocol (Backend ↔ Chrome Extension)

### Context
When the backend crawler encounters Cloudflare Turnstile, CAPTCHAs, or persistent IP blocks, crawling must not crash or halt. Instead, listings must be delegated to the Chrome extension to leverage the user's authentic browser session.

### Decision
**Design a lightweight REST queue contract for extension fallback:**
1. When backend crawler detects a CAPTCHA or blocking interstitial, it logs a `DetailCrawlAttempt` with `challenge_type = 'captcha_blocked'`, increments `backend_attempts`, and flags `fallback_to_extension = True`.
2. Chrome Extension periodically or on-demand polls:
   `GET /api/crawl/pending-details?limit=5`
3. Extension navigates to the listing URL in an inactive/pinned tab with human-like delays (mimicking the existing search crawler in `extension/src/services/crawler.ts`), extracts DOM and photos, and posts the snapshot:
   `POST /api/crawl/details/{idealista_id}`
4. If the extension encounters 3 failed attempts or detects delisting ("anuncio ya no publicado" / HTTP 404), the property transitions to `discarded`.

### Rationale
- Reuses the existing extension infrastructure (`extension/src/services/crawler.ts` and `api.ts`), requiring only an additional task type for detail extraction.
- The user is already authenticated in Chrome on Idealista, naturally bypassing bot challenges that trip server-side data centers.

---

## Decision 5: Discard State Machine & Retry Limits

### Context
The discard policy must balance resilience against permanent page deletion versus transient bot challenges.

### Decision
**Strict two-condition discard rule:**
- **Trigger A (Delisted)**: If either backend or extension crawler receives HTTP 404, HTTP 410, or page text confirming delisting ("Este anuncio ya no está publicado"), the property IMMEDIATELY transitions to `discarded` with `discard_reason = 'delisted'`.
- **Trigger B (Extension Failure Ceiling)**: If delegated to the extension and the extension fails 3 consecutive times, the property transitions to `discarded` with `discard_reason = 'extension_retries_exhausted'`.
- **Manual Override**: Administrator can manually transition any property to `discarded` or re-queue it back to `pending`.

---

## Next Steps
Proceed to Phase 1:
- `data-model.md`
- `contracts/detail-crawl-api.md`
- `quickstart.md`
- `plan.md`
