# Full Property Snapshot Crawler: Architecture & Operations Guide

## Overview

The Full Property Snapshot Crawler is an autonomous, hybrid system designed to extract and permanently preserve complete Idealista listing data (full descriptions, location hierarchy, structured physical features, and local photo galleries) for newly ingested real estate properties and all accumulated pending listings.

---

## 1. Unified Two-Stage Crawl Pipeline

Whenever a crawl is initiated in the Chrome extension, execution seamlessly follows a two-stage sequential workflow:

```
+-------------------------------------------------------------------------------+
|                    Stage 1: Search Discovery & Ingestion                      |
|  - Iterates over enabled saved searches                                       |
|  - Paginates and parses listing summaries                                     |
|  - Sends batches to POST /api/v1/properties/batch                             |
|  - All newly detected inclusions are committed with detail_status = 'pending' |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                    Stage 2: Automated Deep Analysis                           |
|  - Automatically triggers immediately following Stage 1                       |
|  - Queries GET /api/v1/crawl/pending-details?priority_only=false              |
|  - Sequentially opens background tabs (active: false)                         |
|  - Enforces polite jittered delay (2.5–5.0s) between listings                 |
|  - Extracts full descriptions, location hierarchy, features, and photos       |
|  - Submits snapshots to POST /api/v1/crawl/details/{idealista_id}             |
|  - Repeats until pending queue is completely exhausted                        |
+-------------------------------------------------------------------------------+
```

---

## 2. Browser Tab Lifecycle & Anti-Bot Protection

1. **Background Tabs**: Property detail pages open non-intrusively in the background (`active: false`), allowing the operator to continue working in other tabs uninterrupted.
2. **Anti-Bot Challenge Detection**: If Cloudflare Turnstile or a CAPTCHA appears:
   - The crawler automatically activates the tab (`active: true`) and brings it into focus.
   - Crawl execution pauses and notifies the operator: *"Reto anti-bot detectado. Resuélvelo en la pestaña activa para continuar."*
   - Once the operator solves the challenge and navigation completes, extraction resumes automatically.
3. **Resilience to Tab Close**:
   - If the operator closes the tab without solving the challenge, the listener detects closure (`chrome.tabs.onRemoved`), catches the error, records a retryable failure without discarding the listing, and cleanly halts execution.
   - Because newly detected properties are committed as `pending` before deep analysis begins, no data is lost.

---

## 3. Detail Crawl State Machine

The property detail lifecycle is strictly governed by four states:

1. **`legacy`**: Pre-existing listings discovered prior to snapshot feature release. Protected from crawlers to prevent backlog exhaustion and IP bans.
2. **`pending`**: Newly discovered properties awaiting full detail capture.
3. **`completed`**: Listing successfully crawled, textual snapshot stored, and photos downloaded locally.
4. **`discarded`**: Listing determined unrecoverable or deactivated:
   - `delisted`: HTTP 404, 410, or deactivated listing ("el anuncio ya no está publicado").
   - `extension_retries_exhausted`: 3 failed attempts in the Chrome extension.
   - `manual_discard`: Operator manually excluded the property.

---

## 4. Local Media Storage & Delivery

Listing photos are downloaded and persisted locally on the host filesystem:
- **Directory**: `data/media/properties/{idealista_id}/photo_{index:03d}_{hash}.jpg`
- **Delivery**: Mounted statically at `/media` via FastAPI `StaticFiles`.
- **Concurrency**: Image download pool limited to 3 concurrent requests to avoid server-side timeouts or rate limits.

---

## 5. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/properties/{property_id}/snapshot` | Retrieve full snapshot, features JSON, and photo URLs. |
| `GET` | `/api/v1/properties?detail_status={status}` | Filter properties by `legacy`, `pending`, `completed`, or `discarded`. |
| `GET` | `/api/v1/crawl/pending-details` | Poll pending detail queue for Chrome extension (`priority_only=false` returns all). |
| `POST` | `/api/v1/crawl/details/{idealista_id}` | Submit snapshot and gallery photos (`delisted: true` discards). |
| `POST` | `/api/v1/crawl/details/{idealista_id}/fail` | Report extension extraction failure or challenge timeout. |
| `POST` | `/api/v1/properties/{property_id}/requeue-detail` | Administrative reset back to `pending`. |
| `POST` | `/api/v1/properties/{property_id}/discard-detail` | Administrative discard with custom reason. |

---

## 6. Operator Controls in Extension Popup

1. **Real-Time Pending Badge**: Displays live counter of listings currently awaiting analysis (`Fichas pendientes: X`).
2. **Stage Indicator**: Distinct semantic badges showing current crawler stage:
   - `Etapa 1: Búsqueda`: Discovering new listings across saved searches.
   - `Etapa 2: Fichas`: Sequential deep analysis of pending listings with live progress (`5/68`).
   - `Reto Anti-Bot`: Paused waiting for manual challenge solving.
   - `Etapa: Inactivo`: Crawler idle.
3. **On-Demand Action Button**: "Analizar fichas pendientes" button allows operators to drain the pending detail queue at any time without re-running search discovery.

---

## 7. Frontend User Interface Presentation

When viewing a property in the web frontend:
- **Detail Status Pill**: Header badge clearly distinguishes `Ficha completa` (emerald), `Pendiente de análisis` (amber), `Histórico` (slate), or `Descartado` (rose).
- **Interactive Photo Gallery**: Carousel displaying locally preserved high-resolution photos with left/right navigation, index counter (`1 / 24`), and thumbnail strip. Keyboard navigation supports left and right arrow keys.
- **Descripción Completa**: Multiline formatted text preserving original line breaks.
- **Características y Equipamiento**: Structured tags organized by attribute category (`características básicas`, `edificio`, `equipamiento`).
