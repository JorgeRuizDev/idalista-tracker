# Implementation Plan: Full Property Snapshot Crawler

**Branch**: `006-full-property-crawl` | **Date**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-full-property-crawl/spec.md`

## Summary

Implement a full web listing snapshot crawler for Idealista properties that captures the complete photo gallery, full description text, location hierarchy, and physical features. The feature strictly targets newly discovered properties, isolating existing database records as `legacy`. To overcome Idealista's aggressive anti-bot protections, the architecture uses a two-tier hybrid model: an autonomous backend crawler using Playwright stealth automation as the primary engine ("heavy machinery"), falling back to the Chrome extension running in the user's authentic browser session when bot challenges (e.g. CAPTCHAs, Cloudflare) arise. All gallery photo binaries are downloaded and persisted locally in media storage to safeguard against broken URLs when listings are delisted.

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript 5.x (Chrome Extension & Frontend)  
**Primary Dependencies**: FastAPI, SQLAlchemy 2.0, Playwright (async Python), Pydantic v2, aiofiles / httpx  
**Storage**: SQLite (`idealista_properties.db`), Local filesystem media storage (`data/media/properties/{idealista_id}/`) mounted via FastAPI `StaticFiles`  
**Testing**: `pytest`, `pytest-asyncio`, `pytest-cov`, Playwright test mocks  
**Target Platform**: Windows / Linux server (Backend API & Worker), Chrome Browser (Extension fallback)  
**Project Type**: Web service + Background automation + Chrome extension  
**Performance Goals**: Detail crawl pacing with 8–15s jittered delays between requests (anti-bot friendly), photo downloads pipelined with concurrency limit = 3, snapshot API query response < 200ms  
**Constraints**: Idealista anti-bot mechanisms (Cloudflare, rate limiting); sequential crawl pacing to prevent IP blocking; all photo binaries downloaded locally; strict discard rules (delisted or 3 failed extension attempts)  
**Scale/Scope**: ~100–500 new properties/month, ~20–50 photos/property (~10MB/listing), ~10,000 legacy records protected  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality
- ✅ Adheres to project linting and formatting (Black line-length 100, Flake8, Mypy strict typing).
- ✅ Clean service abstractions: `DetailCrawlerService` (orchestration), `PlaywrightCrawler` (stealth browser engine), `MediaStorageService` (image download & persistence).
- ✅ Strong typing across all Pydantic schemas and SQLAlchemy models.

### II. Testing Standards
- ✅ Unit tests for DOM parsing, feature extraction, and detail state machine transitions.
- ✅ Integration tests for database migration, legacy status isolation, and fallback API endpoints (`/api/crawl/pending-details`, `/api/crawl/details/{id}`).
- ✅ End-to-end tests with mocked web responses simulating clean listings, bot challenges, delisted (404) pages, and retry exhaustion.

### III. UX Consistency
- ✅ Four standardized status tags (`legacy`, `pending`, `completed`, `discarded`) with clear semantic meanings.
- ✅ Explicit discard reasons (`delisted`, `extension_retries_exhausted`, `manual_discard`).
- ✅ User-facing API error messages with actionable explanations and HTTP status codes.

### IV. Performance Requirements
- ✅ Background crawler is asynchronous and decoupled from property ingestion; zero impact on email crawler or search crawler responsiveness.
- ✅ Rate-limiting and adaptive cooldowns enforce polite pacing to avoid triggering IP blocks (<2% target block rate).
- ✅ Snapshot queries leverage indexed `property_id` and `detail_status` fields (< 200ms p95).

### V. Simplicity
- ✅ Local filesystem media storage mounted via FastAPI `StaticFiles` eliminates complex object storage dependencies for local deployment.
- ✅ Reuses existing Chrome extension architecture and communication patterns (`extension/src/services/api.ts`).
- ✅ Single-file migration script updates SQLite schema cleanly.

**Constitution Check**: ✅ PASSED — All architectural decisions align with the constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/006-full-property-crawl/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── detail-crawl-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── routes/
│   │   ├── crawl.py                 # Extended with pending-details and detail submission endpoints
│   │   └── properties.py            # Extended with snapshot retrieval and requeue/discard routes
│   └── schemas.py                   # Extended with PropertySnapshot, PropertyPhoto, and DetailStatus schemas
├── crawler/
│   ├── detail_crawler.py            # Playwright-based autonomous stealth browser crawler
│   ├── detail_parser.py             # DOM & JSON-LD parser for photos, descriptions, and features
│   └── scheduler.py                 # Scheduled background worker for pending detail crawls
├── database/
│   ├── migrate_detail_crawler.py    # Migration script: adds detail_status and new tables; marks legacy
│   └── models.py                    # Property (updated), PropertySnapshot, PropertyPhoto, DetailCrawlAttempt
└── services/
    ├── media_service.py             # Image download, compression, and local storage management
    └── property_service.py          # State transitions (legacy, pending, completed, discarded)

extension/
└── src/
    ├── background.ts                # Listens for fallback crawl alarms / tasks
    ├── services/
    │   ├── api.ts                   # Calls /pending-details and posts /details/{id}
    │   └── detail_crawler.ts        # Tab navigation and DOM snapshot extraction in user browser
    └── types/
        └── index.ts                 # Extended with DetailSnapshot types

data/
└── media/
    └── properties/                  # Local directory storing photo galleries ({idealista_id}/*.jpg)
```

**Structure Decision**: Multi-tier architecture extending the existing Python FastAPI backend (`src/`), database models (`src/database/`), and Chrome extension (`extension/`), with static media serving mounted at `/media`.

## Complexity Tracking

| Violation / Added Component | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| **Playwright Browser Dependency** | Required for executing client-side JavaScript, rendering dynamic photo galleries, and bypassing Idealista anti-bot signatures ("heavy machinery"). | Plain HTTP requests (`requests`/`httpx`) or lightweight parsers are blocked immediately by Idealista anti-bot mechanisms (Cloudflare/DataDome). |
| **Two-Tier Hybrid Architecture (Backend + Extension)** | Provides guaranteed fallback when server IP encounters CAPTCHAs, without requiring expensive residential proxy pools. | Relying solely on server scraping results in permanent blocking; relying solely on extension requires the user's browser to be active 24/7. |
| **Local File Media Storage** | Listing photos are permanently preserved locally before Idealista removes them upon delisting. | Storing only external CDN URLs results in broken images once listings are deactivated; storing image BLOBs directly in SQLite bloats the database. |
