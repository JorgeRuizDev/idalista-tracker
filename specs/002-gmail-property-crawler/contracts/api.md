# REST API Contracts

**Base URL**: `http://localhost:8000/api/v1`  
**Content-Type**: `application/json`

## Endpoints

### GET /properties

Retrieve all properties with optional filtering and sorting.

**Query Parameters**:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `min_price` | Integer | Minimum price in euros | `100000` |
| `max_price` | Integer | Maximum price in euros | `300000` |
| `location` | String | Location substring search | `Burgos` |
| `min_bedrooms` | Integer | Minimum number of bedrooms | `3` |
| `has_price_drop` | Boolean | Filter for price drops only | `true` |
| `sort_by` | String | Sort field: `price`, `created_at`, `price_drop` | `price_drop` |
| `sort_order` | String | `asc` or `desc` | `desc` |
| `limit` | Integer | Max results (default: 100, max: 1000) | `50` |
| `offset` | Integer | Pagination offset | `0` |

**Response (200 OK)**:

```json
{
  "items": [
    {
      "id": 1,
      "idealista_id": "109446213",
      "title": "Piso en Barriada Juan XXIII, Juan XXIII - Las Torres - G2, Burgos",
      "property_type": "Piso",
      "location": "Barriada Juan XXIII, Juan XXIII - Las Torres - G2, Burgos",
      "original_price": 189900,
      "current_price": 180000,
      "price_drop_percentage": 4.74,
      "size_m2": 80,
      "bedrooms": 4,
      "floor": "5ª planta",
      "has_elevator": false,
      "property_url": "https://www.idealista.com/inmueble/109446213/",
      "created_at": "2026-05-10T14:30:00Z",
      "updated_at": "2026-05-10T14:30:00Z",
      "is_active": true
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### GET /properties/{idealista_id}

Retrieve a single property by its idealista ID.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `idealista_id` | String | The idealista property ID |

**Response (200 OK)**:

```json
{
  "id": 1,
  "idealista_id": "109446213",
  "title": "Piso en Barriada Juan XXIII, Juan XXIII - Las Torres - G2, Burgos",
  "property_type": "Piso",
  "location": "Barriada Juan XXIII, Juan XXIII - Las Torres - G2, Burgos",
  "original_price": 189900,
  "current_price": 180000,
  "price_drop_percentage": 4.74,
  "size_m2": 80,
  "bedrooms": 4,
  "floor": "5ª planta",
  "has_elevator": false,
  "property_url": "https://www.idealista.com/inmueble/109446213/",
  "created_at": "2026-05-10T14:30:00Z",
  "updated_at": "2026-05-10T14:30:00Z",
  "is_active": true,
  "price_history": [
    {
      "id": 1,
      "old_price": null,
      "new_price": 189900,
      "change_date": "2026-05-08T13:44:02Z",
      "change_type": "initial"
    },
    {
      "id": 2,
      "old_price": 189900,
      "new_price": 180000,
      "change_date": "2026-05-10T14:30:00Z",
      "change_type": "drop"
    }
  ]
}
```

**Response (404 Not Found)**:

```json
{
  "error": "Property not found",
  "idealista_id": "109446213"
}
```

### GET /properties/price-drops

Retrieve properties with price drops, sorted by drop percentage.

**Query Parameters**:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `min_drop_percent` | Float | Minimum drop percentage | `5.0` |
| `limit` | Integer | Max results (default: 100) | `50` |
| `offset` | Integer | Pagination offset | `0` |

**Response (200 OK)**:

```json
{
  "items": [
    {
      "id": 1,
      "idealista_id": "109446213",
      "title": "Piso en Barriada Juan XXIII...",
      "location": "Barriada Juan XXIII...",
      "original_price": 189900,
      "current_price": 180000,
      "price_drop_percentage": 4.74,
      "property_url": "https://www.idealista.com/inmueble/109446213/",
      "updated_at": "2026-05-10T14:30:00Z"
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0
}
```

### POST /crawl/trigger

Manually trigger a crawl operation.

**Request Body** (optional):

```json
{
  "full_sync": false
}
```

- `full_sync`: If true, re-process all historical emails. Default: false (only new emails)

**Response (202 Accepted)**:

```json
{
  "job_id": "uuid-string",
  "status": "started",
  "started_at": "2026-05-10T14:30:00Z",
  "estimated_completion": "2026-05-10T14:35:00Z"
}
```

**Response (409 Conflict)** - If crawl already running:

```json
{
  "error": "Crawl already in progress",
  "current_job_id": "uuid-string",
  "started_at": "2026-05-10T14:00:00Z"
}
```

### GET /crawl/status

Get the status of the current or last crawl job.

**Response (200 OK)**:

```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "started_at": "2026-05-10T14:30:00Z",
  "completed_at": "2026-05-10T14:32:15Z",
  "emails_processed": 5,
  "properties_found": 5,
  "new_properties": 2,
  "price_updates": 3,
  "errors": 0,
  "next_scheduled_crawl": "2026-05-10T15:30:00Z"
}
```

**Status values**: `running`, `completed`, `failed`, `idle`

### GET /stats

Get overall statistics about tracked properties.

**Response (200 OK)**:

```json
{
  "total_properties": 150,
  "active_properties": 145,
  "properties_with_price_drops": 25,
  "average_price": 185000,
  "price_range": {
    "min": 95000,
    "max": 450000
  },
  "last_crawl": {
    "completed_at": "2026-05-10T14:32:15Z",
    "emails_processed": 5,
    "properties_found": 5
  },
  "properties_by_type": {
    "Piso": 80,
    "Casa": 45,
    "Ático": 15,
    "Dúplex": 10
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error code or message",
  "message": "Human-readable description",
  "details": {},
  "timestamp": "2026-05-10T14:30:00Z"
}
```

**HTTP Status Codes**:

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Operation already in progress |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Database or IMAP connection issue |

## Pagination

All list endpoints support pagination via `limit` and `offset`:

- `limit`: Number of items to return (default: 100, max: 1000)
- `offset`: Number of items to skip (for page 2 with limit 50, use offset 50)

Response includes:
- `total`: Total count of matching items
- `limit`: Applied limit
- `offset`: Applied offset

## Rate Limiting

Current implementation has no rate limiting (local use only).

Future: If exposing to external clients, implement:
- 100 requests per minute per IP
- 429 Too Many Requests response when exceeded
