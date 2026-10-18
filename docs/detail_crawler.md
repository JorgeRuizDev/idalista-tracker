# Full Property Snapshot Crawler: Architecture & Operations Guide

## Overview

The Full Property Snapshot Crawler is an autonomous, hybrid system designed to extract and permanently preserve complete Idealista listing data (full descriptions, location hierarchy, structured physical features, and local photo galleries) for newly ingested real estate properties.

---

## 1. Hybrid Two-Tier Architecture

Idealista uses aggressive anti-bot protections (Cloudflare Turnstile, CAPTCHAs, TLS fingerprinting, and rate limiting). To ensure uninterrupted extraction without reliance on costly residential proxy networks, the system operates across two collaborative tiers:

```
                  +-----------------------------------+
                  |      New Property Ingested        |
                  |     (detail_status = 'pending')   |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |  Tier 1: Backend Playwright       |
                  |  - Headless Chromium Stealth      |
                  |  - 8–15s jittered pacing          |
                  +-----------------+-----------------+
                                    |
                    +---------------+---------------+
                    | Clean Response                | Bot Challenge / 3 Fails
                    v                               v
    +------------------------------+  +-------------------------------+
    |  Snapshot Persisted to DB    |  | Flag fallback_to_extension    |
    |  Photos Saved to Disk        |  +---------------+---------------+
    |  detail_status = 'completed' |                  |
    +------------------------------+                  v
                                      +-------------------------------+
                                      | Tier 2: Chrome Extension      |
                                      | - Authentic User Session      |
                                      | - Hidden Background Tab       |
                                      | - Max 3 Attempts              |
                                      +---------------+---------------+
                                                      |
                                     +----------------+---------------+
                                     | Success                        | 3 Fails
                                     v                                v
                      +------------------------------+  +-------------------------------+
                      |  detail_status = 'completed' |  |  detail_status = 'discarded'  |
                      |  All photos stored locally   |  |  reason: 'extension_retries' |
                      +------------------------------+  +-------------------------------+
```

### Tier 1: Autonomous Backend Crawler (Playwright Stealth)
- **Engine**: Headless Chromium with stealth args (`--disable-blink-features=AutomationControlled`, realistic headers, viewport 1920x1080).
- **Pacing**: Jittered requests between 8.0s and 15.0s to maintain low request volume.
- **Extraction**: DOM comments, location breadcrumbs, structured feature list (`li`), and high-resolution photo URLs.
- **Failover Trigger**: If a Cloudflare challenge, CAPTCHA, or HTTP 429 is encountered, or 3 backend attempts fail, the listing is automatically delegated to the Chrome extension (`fallback_to_extension = True`).

### Tier 2: Chrome Extension Fallback Tier
- **Engine**: Runs inside the operator's authentic browser session where Cloudflare clearance cookies and authentic mouse movements are valid.
- **Polling**: Polls `GET /api/v1/crawl/pending-details?priority_only=true` every 2 minutes via Chrome alarms.
- **Execution**: Opens listing in a hidden tab, extracts DOM/JSON-LD attributes via content script, and submits results back to `POST /api/v1/crawl/details/{idealista_id}`.
- **Discard Ceiling**: If the extension fails 3 times, the listing is discarded with `discard_reason = 'extension_retries_exhausted'`.

---

## 2. Detail Crawl State Machine

The property detail lifecycle is strictly governed by four states:

1. **`legacy`**: Pre-existing listings discovered prior to the feature release. Protected from crawlers to prevent massive backlog exhaustion and IP bans.
2. **`pending`**: Newly discovered properties awaiting full detail capture.
3. **`completed`**: Listing successfully crawled, textual snapshot stored, and photos downloaded locally.
4. **`discarded`**: Listing determined unrecoverable or deactivated:
   - `delisted`: HTTP 404, 410, or "anuncio no publicado" page.
   - `extension_retries_exhausted`: 3 failed attempts in the Chrome extension.
   - `manual_discard`: Operator manually excluded the property.

---

## 3. Local Media Storage

Listing photos are downloaded and persisted locally on the host filesystem:
- **Directory**: `data/media/properties/{idealista_id}/photo_{index:03d}_{hash}.jpg`
- **Delivery**: Mounted statically at `/media` via FastAPI `StaticFiles`.
- **Concurrency**: Image download pool limited to 3 concurrent requests to avoid server-side timeouts or rate limits.

---

## 4. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/properties/{property_id}/snapshot` | Retrieve full snapshot, features JSON, and photo URLs. |
| `GET` | `/api/v1/properties?detail_status={status}` | Filter properties by `legacy`, `pending`, `completed`, or `discarded`. |
| `GET` | `/api/v1/crawl/pending-details` | Poll pending detail queue for Chrome extension. |
| `POST` | `/api/v1/crawl/details/{idealista_id}` | Submit snapshot and gallery photos. |
| `POST` | `/api/v1/crawl/details/{idealista_id}/fail` | Report extension extraction failure. |
| `POST` | `/api/v1/properties/{property_id}/requeue-detail` | Administrative reset back to `pending`. |
| `POST` | `/api/v1/properties/{property_id}/discard-detail` | Administrative discard with custom reason. |

---

## 5. Operations & Troubleshooting

### Running Database Migration
```powershell
python -m src.database.migrate_detail_crawler
```

### Manual Detail Crawl via CLI
```powershell
python -m src.crawler.detail_service --property-id <idealista_id>
```

### Simulating Delisted Page
```powershell
python -m src.crawler.detail_service --simulate-404 --property-id <idealista_id>
```
