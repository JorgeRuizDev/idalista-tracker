# Research: Automated Deep Crawl for Inclusions and Pending Listings

**Feature Branch**: `009-deep-crawl-inclusions`  
**Date**: 2026-10-25  
**Spec**: [spec.md](./spec.md)  

## Phase 0: Outline & Research

### 1. Unified Crawl Execution & Pipeline Chaining

**Context**:  
Currently, the Chrome extension runs search crawls via `extension/src/services/crawler.ts`. When a search returns listings, they are sent in batches to `POST /api/v1/properties/batch`, where new properties are saved with `detail_status = 'pending'`. However, search execution currently terminates after pagination completes, leaving newly detected inclusions and pre-existing pending records unanalyzed.

**Decision**:  
Implement a two-stage sequential execution pipeline in `extension/src/services/crawler.ts`:
1. **Stage 1 (Discovery)**: Iterates over selected saved searches, parses listings, and sends batches to `POST /api/v1/properties/batch`. All newly discovered properties are committed to the database with `detail_status = 'pending'`.
2. **Stage 2 (Deep Analysis)**: Automatically triggers immediately following Stage 1 completion. Queries `GET /api/v1/crawl/pending-details?priority_only=false&limit=100`, processes the listings in a sequential loop (opening a background tab, extracting the DOM/JSON-LD, submitting to `POST /api/v1/crawl/details/{idealista_id}`, and closing the tab), repeating until `pending_count == 0` or operator cancels.

**Alternatives Considered**:
- *Parallel Discovery and Deep Analysis*: Spawning detail extraction tabs while search pagination is still happening. Rejected because navigating multiple Idealista URLs simultaneously significantly increases the risk of triggering Cloudflare rate limits and IP fingerprinting.
- *Manual Only (Button in popup)*: Only running deep analysis when the operator clicks a button. Rejected because the explicit requirement is: *"Cada vez que se ejecute el crawler, los que están en pending y nuevas inclusiones que detecte el crawler deberán analizarse en profundidad"*. However, a standalone button will also be provided for on-demand processing without re-running search discovery.

---

### 2. Browser Tab Lifecycle & Anti-Bot Protection in Extension

**Context**:  
Idealista employs aggressive anti-bot protections (Cloudflare Turnstile, CAPTCHA, HTTP 403) when automated scrapers (e.g. Playwright headless) attempt page loads. When running inside the user's authentic Chrome session, navigation uses the user's real browser fingerprints, cookies, and TLS handshake. However, occasional challenges (Turnstile or CAPTCHA) can still occur.

**Decision**:
- **Background Tabs**: Detail pages are opened with `chrome.tabs.create({ url, active: false })`. This keeps them non-intrusive while the operator works in other tabs.
- **Challenge Detection & User Prompt**: The content script or DOM evaluation inspects `document.title`, `document.body.innerText`, and common challenge selectors (`#challenge-running`, `.cf-turnstile`, `iframe[src*="turnstile"]`, `g-recaptcha`).
- If a challenge is detected:
  1. The tab is brought to the foreground: `chrome.tabs.update(tabId, { active: true })`.
  2. The crawl loop pauses and emits a status update to the extension popup: *"Reto anti-bot detectado. Por favor, resuélvelo en la pestaña activa."*
  3. The crawler polls the tab state until the challenge clears (DOM switches to listing page), then proceeds with extraction.
- **Resilience to Tab Close / Abandonment**:
  If the operator closes the challenge tab without solving it, the tab listener detects removal (`chrome.tabs.onRemoved`), catches the error, logs a retryable attempt without discarding the listing, and stops the crawler cleanly. Because new inclusions are registered in the database as `pending` before deep analysis begins, no data is lost.

**Alternatives Considered**:
- *Silent Skip on Challenge*: Immediately skipping challenged listings without user intervention. Rejected because once a challenge appears, subsequent requests will also be challenged. Pausing and allowing manual resolution clears the challenge cookie for all subsequent requests in that session.

---

### 3. Pacing & Throttling Between Detail Pages

**Context**:  
Navigating dozens of property pages too rapidly can trigger temporary session throttles.

**Decision**:
Enforce a jittered delay of 2.5 to 5.0 seconds between closing one detail tab and opening the next. In addition, allow 2.0 to 3.0 seconds after `tabs.onUpdated` status completes to ensure full DOM hydration and lazy-loaded image sources (`data-ondemand-img`).

**Rationale**:
This mimics authentic browsing behavior while completing ~12–15 detailed listings per minute. A backlog of 68 properties will complete in ~5 minutes without risking session bans.

---

### 4. Frontend Media & Snapshot Presentation

**Context**:  
The web frontend's property detail modal (`frontend/src/components/modal/PropertyDetailModal.tsx`) currently only displays initial listing summary fields and a single cover thumbnail or image proxy.

**Decision**:
- Extend `frontend/src/services/api.ts` with `getPropertySnapshot(propertyId: number | string): Promise<PropertySnapshotResponse>`.
- In `PropertyDetailModal.tsx`:
  - When opened, query `getPropertySnapshot(property.id)`.
  - If a snapshot exists (`detail_status === 'completed'`), replace the single photo with the full array of high-resolution local media URLs (`photo.local_file_path` served via FastAPI `/media/...`).
  - Render an interactive carousel with previous/next controls, index badge (`1 / 28`), and scrollable thumbnail strip.
  - Render a dedicated "Descripción Completa" section preserving whitespace and formatting.
  - Render a structured "Equipamiento y Características" grid/badge list parsed from `snapshot.features`.
  - Display a detail status pill in the modal header:
    - `completed` → Emerald badge: *"Ficha completa verificada"*
    - `pending` → Amber badge: *"Pendiente de análisis profundo"*
    - `legacy` → Slate badge: *"Histórico"*
    - `discarded` → Rose badge: *"Descartado / Anuncio retirado"*

**Rationale**:
This fulfills all requirements of User Story 3 without changing the visual language of the existing application.
