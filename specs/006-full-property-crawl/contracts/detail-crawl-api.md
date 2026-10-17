# Phase 1 Interface Contracts: Detail Crawl API

**Feature**: Full Property Snapshot Crawler  
**Branch**: `006-full-property-crawl`  
**Date**: 2026-10-17  

This document specifies the REST API endpoints and data schemas for property detail snapshot retrieval, crawl queue management, and the hybrid fallback protocol between the backend and the Chrome extension.

---

## 1. Property Detail Snapshot Retrieval

### `GET /api/properties/{property_id}/snapshot`

Retrieves the full web snapshot (complete photo gallery, full description, and location metadata) for a property.

**Parameters**:
- `property_id` (path, integer): Internal property ID.

**Responses**:

#### 200 OK
```json
{
  "property_id": 142,
  "idealista_id": "104829104",
  "detail_status": "completed",
  "detail_updated_at": "2026-10-17T15:30:00Z",
  "snapshot": {
    "crawled_at": "2026-10-17T15:30:00Z",
    "source_engine": "backend_playwright",
    "full_description": "Espectacular piso reformado en pleno barrio de Salamanca...",
    "neighborhood": "Goya",
    "district": "Salamanca",
    "city": "Madrid",
    "province": "Madrid",
    "latitude": 40.4241,
    "longitude": -3.6765,
    "features": {
      "built_meters": 125,
      "usable_meters": 110,
      "rooms": 3,
      "bathrooms": 2,
      "floor": "3ª planta exterior",
      "elevator": true,
      "energy_certificate": "C",
      "condition": "Segunda mano/buen estado",
      "air_conditioning": true,
      "heating": "Gas natural individual"
    },
    "photos": [
      {
        "id": 892,
        "sequence_index": 0,
        "local_url": "/media/properties/104829104/photo_000_a1b2c3d4.jpg",
        "caption": "Salón principal",
        "file_size_bytes": 348210
      },
      {
        "id": 893,
        "sequence_index": 1,
        "local_url": "/media/properties/104829104/photo_001_e5f6g7h8.jpg",
        "caption": "Cocina equipada",
        "file_size_bytes": 289400
      }
    ]
  }
}
```

#### 404 Not Found
```json
{
  "detail": "Property 142 or detail snapshot not found"
}
```

---

## 2. Detail Status Filtering & Ingestion Queries

### `GET /api/properties` (Extended)

Extends existing property query endpoint with `detail_status` filter parameter.

**Query Parameters**:
- `detail_status` (optional, string): Filter by status (`legacy`, `pending`, `completed`, `discarded`).
- `limit` (optional, integer, default 50).
- `offset` (optional, integer, default 0).

**Response (Summary in items)**:
```json
{
  "total": 350,
  "items": [
    {
      "id": 142,
      "idealista_id": "104829104",
      "title": "Piso en venta en calle Goya",
      "current_price": 450000,
      "detail_status": "completed",
      "detail_updated_at": "2026-10-17T15:30:00Z",
      "discard_reason": null,
      "photos_count": 24
    },
    {
      "id": 143,
      "idealista_id": "104829205",
      "title": "Ático con terraza",
      "current_price": 590000,
      "detail_status": "pending",
      "detail_updated_at": null,
      "discard_reason": null,
      "photos_count": 0
    }
  ]
}
```

---

## 3. Chrome Extension Hybrid Fallback Protocol

### `GET /api/crawl/pending-details`

Called by the Chrome extension to retrieve listings that require human-session detail extraction due to backend anti-bot challenges or backlog.

**Query Parameters**:
- `limit` (optional, integer, default 5, max 20).
- `priority_only` (optional, boolean, default true): If `true`, returns properties with `fallback_to_extension = true`.

**Response (200 OK)**:
```json
{
  "pending_count": 12,
  "items": [
    {
      "property_id": 143,
      "idealista_id": "104829205",
      "property_url": "https://www.idealista.com/inmueble/104829205/",
      "extension_attempts": 0
    }
  ]
}
```

---

### `POST /api/crawl/details/{idealista_id}`

Called by either the backend Playwright service or the Chrome extension to submit the extracted web snapshot and photo assets.

**Request Payload (JSON or multipart)**:
```json
{
  "source_engine": "chrome_extension",
  "full_description": "Ático luminoso en venta...",
  "neighborhood": "Chamberí",
  "district": "Almagro",
  "city": "Madrid",
  "province": "Madrid",
  "latitude": 40.4312,
  "longitude": -3.6911,
  "features": {
    "rooms": 2,
    "bathrooms": 1,
    "terrace": true,
    "elevator": true
  },
  "photos": [
    {
      "original_url": "https://img3.idealista.com/blur/WEB_DETAIL_TOP-L-L/0/id/104829205/1.jpg",
      "sequence_index": 0,
      "caption": "Terraza exterior"
    },
    {
      "original_url": "https://img3.idealista.com/blur/WEB_DETAIL_TOP-L-L/0/id/104829205/2.jpg",
      "sequence_index": 1,
      "caption": "Salón"
    }
  ]
}
```

**Behavior**:
- The backend downloads and persists each photo binary into `data/media/properties/{idealista_id}/`.
- On success, updates `Property.detail_status = 'completed'` and commits `PropertySnapshot` and `PropertyPhoto` rows.
- If payload indicates `delisted: true` or HTTP 404 was encountered, updates `Property.detail_status = 'discarded'` with `discard_reason = 'delisted'`.

**Response (200 OK)**:
```json
{
  "status": "success",
  "property_id": 143,
  "idealista_id": "104829205",
  "detail_status": "completed",
  "photos_downloaded": 2
}
```

---

### `POST /api/crawl/details/{idealista_id}/fail`

Called when a crawl attempt fails (e.g. extension fails or challenge encountered).

**Request Payload**:
```json
{
  "source_engine": "chrome_extension",
  "error_type": "bot_challenge",
  "error_message": "Cloudflare challenge page loaded without completion",
  "http_status": 403
}
```

**Behavior**:
- Increments `extension_attempts`.
- Logs `DetailCrawlAttempt`.
- If `extension_attempts >= 3`, automatically transitions `Property.detail_status = 'discarded'` with `discard_reason = 'extension_retries_exhausted'`.

**Response (200 OK)**:
```json
{
  "status": "recorded",
  "idealista_id": "104829205",
  "current_attempts": 3,
  "detail_status": "discarded",
  "discard_reason": "extension_retries_exhausted"
}
```

---

## 4. Administrative Control Endpoints

### `POST /api/properties/{property_id}/requeue-detail`

Manually resets a discarded or failed property back to `pending`.

**Response (200 OK)**:
```json
{
  "property_id": 143,
  "detail_status": "pending",
  "backend_attempts": 0,
  "extension_attempts": 0,
  "discard_reason": null
}
```

### `POST /api/properties/{property_id}/discard-detail`

Manually marks a property as discarded.

**Request Payload**:
```json
{
  "reason": "manual_discard",
  "note": "Duplicate listing or out of region"
}
```

**Response (200 OK)**:
```json
{
  "property_id": 143,
  "detail_status": "discarded",
  "discard_reason": "manual_discard"
}
```
