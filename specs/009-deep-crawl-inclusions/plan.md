# Implementation Plan: Automated Deep Crawl for Inclusions and Pending Listings

**Branch**: `009-deep-crawl-inclusions` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-deep-crawl-inclusions/spec.md`

## Summary

Automate the full listing snapshot analysis pipeline so that every crawl execution seamlessly performs in-depth extraction (full photo gallery, complete description text, location hierarchy, and structured physical features) for all newly detected property inclusions as well as all accumulated listings currently in `pending` status. Execution uses authentic browser tab navigation inside the Chrome extension (non-active background tabs with polite pacing of 2.5–5s) to bypass anti-bot blocks cleanly, downloads all gallery photos to persistent local storage (`data/media/properties/{id}/`), and provides an interactive, rich photo gallery, full description, and equipment tags within the web frontend's property detail modal.

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript 5.x (Chrome Extension & Frontend)  
**Primary Dependencies**: FastAPI, SQLAlchemy 2.0, Pydantic v2, aiofiles, httpx, React 18, Vite, Tailwind CSS, Lucide React, Chrome Extension Manifest V3  
**Storage**: SQLite (`idealista_properties.db`), Persistent filesystem media storage (`data/media/properties/{idealista_id}/`) served via FastAPI `StaticFiles` at `/media`  
**Testing**: `pytest`, `pytest-asyncio`, `pytest-cov`, `vitest`, `@testing-library/react`  
**Target Platform**: Windows / Linux server (Backend API & Static media), Chrome Browser (Extension Manifest V3 & Web UI)  
**Project Type**: Web service + Chrome extension + React Single-Page Application  
**Performance Goals**: Extension crawl pacing at 2.5–5.0s jittered delay between listings; snapshot retrieval API response < 100ms; frontend modal full photo gallery load < 500ms  
**Constraints**: Zero-blocking rate on Idealista anti-bot (Cloudflare/Turnstile); all photo binaries downloaded and preserved locally in persistent media storage; non-intrusive background tabs (`active: false`) that focus only when an interactive CAPTCHA requires manual solving; resilient against browser close / interrupted sessions  
**Scale/Scope**: ~70 backlog pending properties, ~100–300 new inclusions/month, ~15–30 photos/property (~10MB/listing), ~2,200 legacy records protected  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality
- ✅ Adheres to project linting and formatting (Black line-length 100, Flake8, Mypy strict typing for Python; ESLint and Prettier for TypeScript).
- ✅ Clean modular separation: Extension crawler service orchestrates multi-stage lifecycle, backend property service manages state machine, and dedicated media service handles photo persistence.
- ✅ Strong typing across all TypeScript schemas and Pydantic request/response models.

### II. Testing Standards
- ✅ Contract tests for `/api/v1/crawl/pending-details` and `/api/v1/properties/{id}/snapshot`.
- ✅ Unit tests for extension crawler state orchestration, background tab management, and error/challenge handling.
- ✅ Frontend component tests for `PropertyDetailModal` verifying gallery rendering, description formatting, and status pill display with mock snapshots.

### III. UX Consistency
- ✅ Four standardized status tags (`legacy`, `pending`, `completed`, `discarded`) with distinct semantic colors across extension and frontend.
- ✅ Extension popup surfaces clear stage indicator (*"Etapa 1: Búsqueda"* / *"Etapa 2: Analizando ficha 5/68..."*) and real-time pending counters.
- ✅ Non-intrusive navigation: tabs open in the background without stealing user focus, alerting the user only when a CAPTCHA requires solving.
- ✅ Accessible property detail modal with keyboard navigation (Esc to close, left/right arrows for photos).

### IV. Performance Requirements
- ✅ Polite pacing (2.5–5.0s jittered delay) ensures crawling mimics human browsing and avoids triggering anti-bot bans.
- ✅ Photos downloaded concurrently (concurrency limit = 3) on the backend without blocking the extension response.
- ✅ Snapshot queries leverage indexed `property_id` and `detail_status` fields (< 100ms p95).

### V. Simplicity
- ✅ Reuses existing database models (`PropertySnapshot`, `PropertyPhoto`) and FastAPI endpoints without introducing complex new database schemas.
- ✅ Avoids fragile residential proxy infrastructure by leveraging the authentic user browser session for deep extraction.
- ✅ Standard filesystem storage for local images mounted directly through FastAPI static files.

**Constitution Check**: ✅ PASSED — All architectural decisions strictly adhere to project constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/009-deep-crawl-inclusions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── crawl-pipeline-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── routes/
│   │   ├── crawl.py                 # Endpoint GET /pending-details and POST /details/{id}
│   │   └── properties.py            # Endpoint GET /{property_id}/snapshot
│   └── schemas.py                   # PropertySnapshotResponse, PendingDetailsResponse schemas
├── services/
│   ├── media_service.py             # Download & persistent storage of gallery photos
│   └── property_service.py          # State transitions and batch ingestion
└── database/
    └── models.py                    # Property, PropertySnapshot, PropertyPhoto

extension/
├── src/
│   ├── background.ts                # Message handling for unified crawl and alarm lifecycle
│   ├── popup/
│   │   ├── index.html               # Popup UI: pending counter, stage indicators, action buttons
│   │   └── index.ts                 # Popup event handlers, live status display
│   ├── services/
│   │   ├── api.ts                   # fetchPendingDetails, submitPropertyDetail, reportDetailCrawlFailure
│   │   ├── crawler.ts               # Two-stage orchestration (Search Discovery -> Deep Analysis)
│   │   └── detail_crawler.ts        # Background tab lifecycle, captcha detection, DOM extraction loop
│   └── types/
│       └── index.ts                 # CrawlStage, DetailSnapshotPayload, PendingDetailListing

frontend/
├── src/
│   ├── components/
│   │   └── modal/
│   │       └── PropertyDetailModal.tsx   # Interactive full photo gallery, full description, features tags
│   ├── services/
│   │   └── api.ts                   # Added getPropertySnapshot API call
│   └── types/
│       └── property.ts              # Extended with PropertySnapshot, PropertyPhoto types
```

## Implementation Strategy

### Milestone 1: Extension Unified Pipeline & Background Deep Crawler (MVP)
1. Update `extension/src/services/detail_crawler.ts`:
   - Implement `runFullPendingDetailQueue()` that fetches all pending properties (`priority_only=false`).
   - Open non-active background tabs (`active: false`).
   - Detect Turnstile/CAPTCHA challenges; bring tab to focus (`active: true`) and pause execution until solved.
   - If user closes challenge tab, cleanly stop without discarding listings.
   - Extract full description, features, and photos via DOM/JSON-LD and submit to backend.
   - Close tab and enforce 2.5–5.0s jittered delay before next property.
2. Update `extension/src/services/crawler.ts`:
   - Chain Stage 1 (Search Discovery) directly into Stage 2 (Deep Analysis) so every crawl run automatically exhausts the pending queue.
3. Update `extension/src/popup/`:
   - Add real-time "Fichas pendientes: X" counter.
   - Add dedicated "Analizar fichas pendientes" button.
   - Add real-time stage progress bar and status text.

### Milestone 2: Backend Snapshot Verification & Robust Ingestion
1. Verify `src/api/routes/crawl.py` and `src/services/property_service.py`:
   - Ensure `POST /api/v1/properties/batch` commits all new inclusions as `detail_status = 'pending'` before returning.
   - Ensure `POST /api/v1/crawl/details/{idealista_id}` handles gallery downloads smoothly and marks `completed`.
   - Ensure `GET /api/v1/crawl/pending-details?priority_only=false` returns all pending properties correctly ordered.

### Milestone 3: Web Frontend Rich Presentation
1. Update `frontend/src/services/api.ts` and `frontend/src/types/property.ts`:
   - Add `getPropertySnapshot` and snapshot type definitions.
2. Update `frontend/src/components/modal/PropertyDetailModal.tsx`:
   - Fetch snapshot on open.
   - Replace single photo with full interactive local gallery carousel (with thumbnails and counter).
   - Render full description with line breaks preserved.
   - Render structured feature tag badges.
   - Display status pill in header (`Ficha completa` / `Pendiente`).
