# API Contracts: Chrome Extension Property Crawler

**Date**: 2026-05-10  
**Base URL**: `{configured_server_url}/api/v1`

---

## Authentication

**No authentication required** for the batch endpoint. The extension communicates directly with the user's local or self-hosted backend.

*Future consideration: If exposing API to internet, add API key or token-based auth.*

---

## Endpoints

### 1. Batch Property Ingestion

**POST** `/properties/batch`

Accepts a batch of properties from a crawl session page.

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

#### Request Body

```typescript
interface BatchIngestionRequest {
  // The crawl session identifier (from backend)
  session_id: number;  // Integer ID from CrawlSession table
  
  // The saved search being crawled (from backend)
  search_id: number;   // Integer ID from SavedSearch table
  
  // External search ID from Idealista (for reference)
  external_search_id: string;
  
  // Page number being processed
  page: number;        // >= 1
  
  // Properties found on this page
  properties: PropertyData[];
  
  // Batch metadata
  metadata: {
    // When this page was crawled (ISO 8601)
    crawled_at: string;
    
    // Extension version
    extension_version: string;
    
    // Human-like behavior was active
    human_like_used: boolean;
  };
}

interface PropertyData {
  // Property ID from Idealista
  external_id: string;  // Required, e.g., "109363171"
  
  // Property title
  title: string;        // Required, e.g., "Piso en Calle Mayor, Briviesca"
  
  // Price in EUR
  price: number;        // Required, integer >= 0
  
  // Currency code
  currency: string;     // Required, always "EUR"
  
  // Location string
  location: string;     // Required, e.g., "Calle Mayor, Briviesca"
  
  // Full URL to property detail
  url: string;          // Required, valid URL
  
  // Square meters (if available)
  square_meters?: number;  // Optional, integer >= 0
  
  // Number of bedrooms (if available)
  bedrooms?: number;       // Optional, integer >= 0
  
  // Floor and elevator info (if available)
  floor_info?: string;     // Optional, e.g., "Planta 2ª exterior con ascensor"
  
  // Property description (may be truncated)
  description?: string;    // Optional, max 2000 chars
  
  // Photo URLs
  photos?: string[];       // Optional, array of valid URLs
}
```

#### Example Request

```json
{
  "session_id": 1,
  "search_id": 1,
  "external_search_id": "115265817",
  "page": 1,
  "properties": [
    {
      "external_id": "109363171",
      "title": "Piso en Calle Mayor, Briviesca",
      "price": 150000,
      "currency": "EUR",
      "location": "Calle Mayor, Briviesca",
      "url": "https://www.idealista.com/inmueble/109363171/",
      "square_meters": 134,
      "bedrooms": 3,
      "floor_info": "Planta 2ª exterior sin ascensor",
      "description": "Se vende este magnífico piso en la localidad de Briviesca...",
      "photos": [
        "https://img4.idealista.com/blur/480_360_mq/0/id.pro.es.image.master/da/7b/1b/1372367799.webp"
      ]
    },
    {
      "external_id": "104426196",
      "title": "Casa o chalet independiente en Calle Ávila, 2, Briviesca",
      "price": 590000,
      "currency": "EUR",
      "location": "Calle Ávila, 2, Briviesca",
      "url": "https://www.idealista.com/inmueble/104426196/",
      "square_meters": 600,
      "bedrooms": 5,
      "floor_info": "Garaje incluido",
      "description": "ESPECIAL CASA CON DEPENDENCIAS EXTERIORES Y GRAN JARDIN...",
      "photos": [
        "https://img4.idealista.com/blur/480_360_mq/0/id.pro.es.image.master/e9/c1/80/1220247596.webp"
      ]
    }
  ],
  "metadata": {
    "crawled_at": "2026-05-10T14:30:00Z",
    "extension_version": "1.0.0",
    "human_like_used": true
  }
}
```

---

### 2. Response Format

#### Success Response (200 OK)

```typescript
interface BatchIngestionResponse {
  // Whether the batch was successfully processed
  success: boolean;
  
  // Summary of operations
  summary: {
    // Total properties received
    total_received: number;
    
    // New properties created
    created: number;
    
    // Existing properties updated
    updated: number;
    
    // Properties marked as seen in this session
    seen: number;
    
    // Invalid entries (not processed)
    invalid: number;
  };
  
  // Details for each processed property
  results: PropertyResult[];
  
  // Any errors encountered
  errors: PropertyError[];
  
  // Processing metadata
  meta: {
    // When the batch was processed
    processed_at: string;
    
    // Processing time in milliseconds
    processing_time_ms: number;
    
    // API version
    api_version: string;
  };
}

interface PropertyResult {
  // Property external ID
  external_id: string;
  
  // Operation performed
  action: 'created' | 'updated' | 'seen' | 'error';
  
  // Property ID in database (if created/updated)
  property_id?: number;
  
  // List of changes detected (if updated)
  changes?: PropertyChangeInfo[];
}

interface PropertyChangeInfo {
  // Which attribute changed
  attribute: 'price' | 'square_meters' | 'bedrooms' | 'floor_info' | 
             'description' | 'photos' | 'title' | 'location';
  
  // Old value
  old_value: any;
  
  // New value  
  new_value: any;
}

interface PropertyError {
  // Property external ID (if identifiable)
  external_id?: string;
  
  // Index in the properties array
  index: number;
  
  // Error code
  code: string;
  
  // Human-readable error message
  message: string;
  
  // Which field caused the error (if applicable)
  field?: string;
}
```

#### Example Success Response

```json
{
  "success": true,
  "summary": {
    "total_received": 30,
    "created": 5,
    "updated": 25,
    "seen": 30,
    "invalid": 0
  },
  "results": [
    {
      "external_id": "109363171",
      "action": "updated",
      "property_id": 1234,
      "changes": [
        {
          "attribute": "price",
          "old_value": 145000,
          "new_value": 150000
        }
      ]
    },
    {
      "external_id": "104426196",
      "action": "seen",
      "property_id": 5678
    },
    {
      "external_id": "999999999",
      "action": "created",
      "property_id": 9999
    }
  ],
  "errors": [],
  "meta": {
    "processed_at": "2026-05-10T14:30:02Z",
    "processing_time_ms": 145,
    "api_version": "1.0.0"
  }
}
```

---

### 3. Error Responses

#### 400 Bad Request

Invalid request format or validation errors.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "properties[0].price",
        "message": "Price must be a non-negative integer"
      },
      {
        "field": "session_id",
        "message": "Session not found"
      }
    ]
  }
}
```

#### 404 Not Found

Session or search ID not found.

```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Crawl session not found",
    "details": {
      "session_id": 12345
    }
  }
}
```

#### 409 Conflict

Duplicate property IDs in the same batch.

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_IDS",
    "message": "Duplicate external_ids found in batch",
    "details": {
      "duplicates": ["109363171"]
    }
  }
}
```

#### 422 Unprocessable Entity

Server cannot process the request (e.g., invalid data state).

```json
{
  "success": false,
  "error": {
    "code": "UNPROCESSABLE",
    "message": "Cannot process batch: search is not active"
  }
}
```

#### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "retry_after": 60,
      "limit": 100,
      "remaining": 0,
      "reset_at": "2026-05-10T14:31:00Z"
    }
  }
}
```

#### 500 Internal Server Error

Server error during processing.

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Additional Backend Endpoints

### Create Crawl Session

**POST** `/crawl/sessions`

Initialize a new crawl session.

#### Request

```json
{
  "server_url": "http://localhost:8000",
  "human_like_enabled": true,
  "extension_version": "1.0.0",
  "selected_search_ids": [1, 2, 3]
}
```

#### Response (201 Created)

```json
{
  "id": 1,
  "status": "running",
  "started_at": "2026-05-10T14:30:00Z",
  "total_properties": 0,
  "pages_processed": 0,
  "searches_crawled": 0
}
```

---

### Get Saved Searches

**GET** `/searches`

Retrieve all saved searches from the database.

#### Response (200 OK)

```json
{
  "searches": [
    {
      "id": 1,
      "external_search_id": "115265817",
      "name": "Viviendas en Briviesca",
      "url_path": "/venta-viviendas/briviesca-burgos/",
      "full_url": "https://www.idealista.com/venta-viviendas/briviesca-burgos/",
      "result_count": 79,
      "crawl_enabled": true,
      "last_crawled_at": "2026-05-09T10:00:00Z"
    }
  ]
}
```

---

### Sync Saved Searches

**POST** `/searches/sync`

Update the saved searches list from the extension (when user has selected searches on the page).

#### Request

```json
{
  "searches": [
    {
      "external_search_id": "115265817",
      "name": "Viviendas en Briviesca",
      "url": "/venta-viviendas/briviesca-burgos/",
      "full_url": "https://www.idealista.com/venta-viviendas/briviesca-burgos/",
      "result_count": 79,
      "description": "Comprar viviendas en Briviesca, Burgos"
    }
  ]
}
```

#### Response (200 OK)

```json
{
  "synced": 1,
  "created": 0,
  "updated": 1
}
```

---

### Complete Crawl Session

**POST** `/crawl/sessions/{session_id}/complete`

Mark a crawl session as completed.

#### Request

```json
{
  "total_properties": 500,
  "pages_processed": 20,
  "searches_crawled": 2
}
```

#### Response (200 OK)

```json
{
  "id": 1,
  "status": "completed",
  "ended_at": "2026-05-10T15:45:00Z",
  "total_properties": 500,
  "pages_processed": 20,
  "searches_crawled": 2
}
```

---

### Detect Missing Properties

**POST** `/crawl/sessions/{session_id}/searches/{search_id}/detect-missing`

After processing all pages of a search, call this to detect missing properties.

#### Request

```json
{
  "current_property_external_ids": ["109363171", "104426196", "..."]
}
```

#### Response (200 OK)

```json
{
  "missing_detected": 5,
  "marked_as_missing": 3,
  "properties": [
    {
      "id": 123,
      "idealista_id": "987654321",
      "status": "missing",
      "missing_since": "2026-05-10T14:35:00Z"
    }
  ]
}
```

---

## Extension API Methods

The Chrome extension exposes the following methods for internal communication:

### 1. Start Crawl Session

```typescript
// Message from popup to background
interface StartCrawlMessage {
  type: 'START_CRAWL';
  payload: {
    search_ids: number[];  // Database IDs of selected searches
    server_url: string;
  };
}

// Response
interface StartCrawlResponse {
  success: boolean;
  session_id?: number;
  error?: string;
}
```

### 2. Get Crawl Status

```typescript
// Message from popup to background
interface GetStatusMessage {
  type: 'GET_STATUS';
}

// Response
interface GetStatusResponse {
  is_running: boolean;
  session_id?: number;
  current_search?: {
    id: number;
    name: string;
  };
  current_page?: number;
  progress: {
    total_searches: number;
    completed_searches: number;
    total_pages: number;
    total_properties: number;
  };
}
```

### 3. Pause Crawl

```typescript
interface PauseCrawlMessage {
  type: 'PAUSE_CRAWL';
}

interface PauseCrawlResponse {
  success: boolean;
  can_resume: boolean;
}
```

### 4. Resume Crawl

```typescript
interface ResumeCrawlMessage {
  type: 'RESUME_CRAWL';
}

interface ResumeCrawlResponse {
  success: boolean;
  session_id?: number;
  error?: string;
}
```

### 5. Get Saved Searches

```typescript
interface GetSearchesMessage {
  type: 'GET_SEARCHES';
}

interface GetSearchesResponse {
  searches: Array<{
    id: number;
    external_id: string;
    name: string;
    url: string;
    result_count?: number;
    description?: string;
    last_crawled_at?: string;
    crawl_enabled: boolean;
  }>;
}
```

### 6. Save Configuration

```typescript
interface SaveConfigMessage {
  type: 'SAVE_CONFIG';
  payload: {
    server_url: string;
    human_like_enabled: boolean;
    min_page_delay: number;
    max_page_delay: number;
    min_navigation_delay: number;
    max_navigation_delay: number;
  };
}

interface SaveConfigResponse {
  success: boolean;
  error?: string;
}
```

### 7. Get Configuration

```typescript
interface GetConfigMessage {
  type: 'GET_CONFIG';
}

interface GetConfigResponse {
  config: {
    server_url: string;
    human_like_enabled: boolean;
    min_page_delay: number;
    max_page_delay: number;
    min_navigation_delay: number;
    max_navigation_delay: number;
  };
}
```

---

## Content Script API

Content scripts extract data from the page and return structured data:

### Extract Saved Searches

```typescript
// Content script execution result
interface ExtractedSavedSearch {
  external_id: string;
  name: string;
  url: string;
  full_url: string;
  result_count?: number;
  description?: string;
}

// Function signature
function extractSavedSearches(): ExtractedSavedSearch[];
```

### Extract Property Listings

```typescript
// Content script execution result
interface ExtractedProperty {
  external_id: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  url: string;
  square_meters?: number;
  bedrooms?: number;
  floor_info?: string;
  description?: string;
  photos: string[];
}

// Function signature
function extractPropertyListings(): ExtractedProperty[];
```

### Get Pagination Info

```typescript
interface PaginationInfo {
  current_page: number;
  has_next_page: boolean;
  next_page_url?: string;
  total_pages?: number;
}

// Function signature
function getPaginationInfo(): PaginationInfo;
```

---

## Rate Limiting

### Server-Side Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /properties/batch | 100 requests | 60 seconds |
| Other endpoints | 1000 requests | 60 seconds |

### Extension Behavior

- Extension implements exponential backoff on 429 responses
- After 3 rate limit events, crawl pauses and notifies user
- Minimum 1 second between batch requests

---

## Versioning

API versioning follows semantic versioning:
- Major version in URL path: `/api/v1/...`
- Minor versions in response header: `X-API-Version: 1.2.3`
- Breaking changes require new major version
