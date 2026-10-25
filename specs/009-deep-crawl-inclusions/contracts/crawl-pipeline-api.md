# API Contracts: Automated Deep Crawl Pipeline & Snapshot Delivery

**Feature Branch**: `009-deep-crawl-inclusions`  
**Date**: 2026-10-25  
**Spec**: [spec.md](../spec.md)  

## Endpoints Summary

| Method | Endpoint | Consumer | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/crawl/pending-details` | Chrome Extension | Retrieve listings awaiting deep analysis |
| `POST` | `/api/v1/crawl/details/{idealista_id}` | Chrome Extension | Submit extracted snapshot and download photos |
| `POST` | `/api/v1/crawl/details/{idealista_id}/fail` | Chrome Extension | Report crawl errors or bot challenges |
| `GET` | `/api/v1/properties/{property_id}/snapshot` | Frontend UI | Fetch complete snapshot and local media URLs |

---

### 1. `GET /api/v1/crawl/pending-details`

Retrieve listings pending detail analysis. Used by the extension to feed the deep crawl queue.

#### Query Parameters
- `limit` (optional, default: 50, integer): Maximum items to fetch.
- `priority_only` (optional, default: false, boolean): When false, returns all `pending` listings ordered by newest first.

#### Response: `200 OK`
```json
{
  "pending_count": 68,
  "items": [
    {
      "property_id": 2191,
      "idealista_id": "112870288",
      "property_url": "https://www.idealista.com/inmueble/112870288/",
      "extension_attempts": 0
    }
  ]
}
```

---

### 2. `POST /api/v1/crawl/details/{idealista_id}`

Submit property snapshot extracted by the Chrome extension. Downloads all remote photos to local filesystem and transitions status to `completed` (or `discarded` if `delisted: true`).

#### Request Body
```json
{
  "source_engine": "chrome_extension",
  "delisted": false,
  "full_description": "Fantástico piso reformado de 3 habitaciones...",
  "neighborhood": "Centro",
  "district": "Distrito Centro",
  "city": "Madrid",
  "province": "Madrid",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "features": {
    "características básicas": [
      "85 m² construidos",
      "3 habitaciones",
      "1 baño",
      "Segunda mano/buen estado",
      "Armarios empotrados"
    ],
    "edificio": [
      "Planta 3ª exterior",
      "Con ascensor"
    ],
    "equipamiento": [
      "Aire acondicionado",
      "Calefacción individual"
    ]
  },
  "photos": [
    {
      "original_url": "https://img3.idealista.com/blur/WEB_DETAIL/0/id.pro.es.image.master/12/34/56/112870288.jpg",
      "sequence_index": 0,
      "caption": "Salón principal luminoso"
    }
  ]
}
```

#### Response: `200 OK`
```json
{
  "status": "success",
  "property_id": 2191,
  "idealista_id": "112870288",
  "detail_status": "completed",
  "photos_downloaded": 18
}
```

#### Delisted Listing Submission
If `delisted: true` is passed, the server immediately marks `detail_status = 'discarded'` with `discard_reason = 'delisted'`.

---

### 3. `POST /api/v1/crawl/details/{idealista_id}/fail`

Report when extraction fails due to anti-bot challenges or navigation errors.

#### Request Body
```json
{
  "source_engine": "chrome_extension",
  "error_type": "bot_challenge",
  "error_message": "Turnstile challenge detected and not solved"
}
```

#### Response: `200 OK`
```json
{
  "status": "failure_recorded",
  "idealista_id": "112870288",
  "current_attempts": 1,
  "detail_status": "pending"
}
```

---

### 4. `GET /api/v1/properties/{property_id}/snapshot`

Fetch the full snapshot and local photo URLs for rendering in the web interface modal.

#### Path Parameters
- `property_id` (integer): Internal property ID.

#### Response: `200 OK`
```json
{
  "property_id": 2191,
  "idealista_id": "112870288",
  "detail_status": "completed",
  "snapshot": {
    "crawled_at": "2026-10-25T21:40:00Z",
    "source_engine": "chrome_extension",
    "full_description": "Fantástico piso reformado de 3 habitaciones...",
    "neighborhood": "Centro",
    "district": "Distrito Centro",
    "city": "Madrid",
    "province": "Madrid",
    "latitude": 40.4168,
    "longitude": -3.7038,
    "features": {
      "características básicas": ["85 m² construidos", "3 habitaciones", "1 baño"],
      "edificio": ["Planta 3ª exterior", "Con ascensor"]
    },
    "photos": [
      {
        "id": 101,
        "sequence_index": 0,
        "local_file_path": "/media/properties/112870288/photo_0.jpg",
        "original_url": "https://img3.idealista.com/...",
        "caption": "Salón principal luminoso"
      }
    ]
  }
}
```

#### Response: `404 Not Found`
If property has not been crawled (`detail_status` is `pending`, `legacy`, or `discarded`), returns HTTP 404 with error message:
```json
{
  "detail": "Property 2191 or detail snapshot not found"
}
```
