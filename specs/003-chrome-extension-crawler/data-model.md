# Data Model: Chrome Extension Property Crawler

**Date**: 2026-05-10  
**Feature**: Chrome Extension Property Crawler  
**Branch**: 003-chrome-extension-crawler

---

## Entity Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ CrawlSession    │────<│ SavedSearch     │────<│ Property        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                              │
         │                      ┌─────────────────┐     │
         └─────────────────────>│ PropertyHistory │<────┘
                                └─────────────────┘
                                         │
                                ┌─────────────────┐
                                │ PropertyChange  │
                                └─────────────────┘
```

---

## 1. CrawlSession

Represents a single crawling operation from start to completion.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key (generated) |
| `started_at` | DateTime | Yes | When the crawl session started |
| `ended_at` | DateTime | No | When the crawl session completed (null if running) |
| `status` | Enum | Yes | `running`, `completed`, `paused`, `failed` |
| `server_url` | String | Yes | The crawl server URL used for this session |
| `searches_crawled` | Array[UUID] | Yes | List of SavedSearch IDs that were processed |
| `total_properties` | Integer | Yes | Total properties processed in this session |
| `pages_processed` | Integer | Yes | Total pages processed across all searches |
| `errors_count` | Integer | Yes | Number of errors encountered |
| `human_like_enabled` | Boolean | Yes | Whether human-like behavior was enabled |
| `created_by_extension` | String | Yes | Extension version identifier |

### Validation Rules

- `status` must be one of: `running`, `completed`, `paused`, `failed`
- `ended_at` must be >= `started_at` if set
- `total_properties` >= 0
- `errors_count` >= 0

### State Transitions

```
         ┌─────────┐
    ┌───>│ RUNNING │<──────┐
    │    └────┬────┘       │
    │         │             │
complete    pause          resume
    │         │             │
    │         ▼             │
    │    ┌─────────┐        │
    └────│ PAUSED  │────────┘
         └────┬────┘
              │
           complete
              │
         ┌────┴────┐
         │COMPLETED│
         └─────────┘
              │
           fail
              │
         ┌────┴────┐
         │ FAILED  │
         └─────────┘
```

---

## 2. SavedSearch

Represents a saved search/filter configuration from Idealista.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key (generated) |
| `external_search_id` | String | Yes | The ID from Idealista (e.g., "115265817") |
| `name` | String | Yes | The search name (e.g., "Viviendas en Briviesca") |
| `url` | String | Yes | The relative URL path (e.g., "/venta-viviendas/briviesca-burgos/") |
| `full_url` | String | Yes | The complete URL |
| `description` | String | No | Human-readable description of filters |
| `result_count` | Integer | No | Last known result count |
| `created_at` | DateTime | Yes | When this record was first created |
| `last_crawled_at` | DateTime | No | When this search was last crawled |
| `is_active` | Boolean | Yes | Whether this search is still in Idealista |
| `crawl_enabled` | Boolean | Yes | Whether user has selected this for crawling |

### Validation Rules

- `external_search_id` must be unique
- `url` must start with "/"
- `full_url` must be a valid URL
- `result_count` >= 0 if set

---

## 3. Property

Represents a real estate listing from Idealista.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key (generated) |
| `external_id` | String | Yes | The property ID from Idealista (e.g., "109363171") |
| `title` | String | Yes | Full property title |
| `price` | Integer | Yes | Price in EUR |
| `currency` | String | Yes | Currency code (always "EUR") |
| `location` | String | Yes | Location string (e.g., "Calle Mayor, Briviesca") |
| `url` | String | Yes | Full URL to property detail page |
| `square_meters` | Integer | No | Property size in m² |
| `bedrooms` | Integer | No | Number of bedrooms |
| `floor_info` | String | No | Floor and elevator info (e.g., "Planta 2ª exterior con ascensor") |
| `description` | String | No | Property description (may be truncated) |
| `photos` | Array[String] | No | Array of photo URLs |
| `first_seen_at` | DateTime | Yes | When this property was first crawled |
| `last_seen_at` | DateTime | Yes | When this property was last seen |
| `status` | Enum | Yes | `active`, `missing`, `sold` |
| `current_search_ids` | Array[UUID] | Yes | Which saved searches currently contain this property |

### Validation Rules

- `external_id` must be unique
- `price` >= 0
- `square_meters` >= 0 if set
- `bedrooms` >= 0 if set
- `status` must be one of: `active`, `missing`, `sold`
- `url` must be valid

### Status Logic

| Status | Condition |
|--------|-----------|
| `active` | Property was seen in the most recent crawl of at least one saved search |
| `missing` | Property was not seen in the most recent crawl of any saved search that previously contained it |
| `sold` | Property has been `missing` for more than 30 days |

---

## 4. PropertyHistory

Records the complete visibility history of a property across crawl sessions.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key (generated) |
| `property_id` | UUID | Yes | Reference to Property |
| `crawl_session_id` | UUID | Yes | Reference to CrawlSession |
| `event_type` | Enum | Yes | `seen`, `missing` |
| `timestamp` | DateTime | Yes | When this event occurred |
| `saved_search_id` | UUID | Yes | Which saved search this event relates to |

### Validation Rules

- `event_type` must be one of: `seen`, `missing`
- `timestamp` must be within the crawl session time range
- Combination of (`property_id`, `crawl_session_id`, `saved_search_id`) should be unique

### Event Semantics

| Event Type | Meaning |
|------------|---------|
| `seen` | Property was found in the search results during this crawl session |
| `missing` | Property was NOT found in search results where it previously existed |

---

## 5. PropertyChange

Records specific attribute changes to a property over time.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | Yes | Primary key (generated) |
| `property_id` | UUID | Yes | Reference to Property |
| `crawl_session_id` | UUID | Yes | Reference to CrawlSession when change was detected |
| `attribute_name` | Enum | Yes | Which attribute changed |
| `old_value` | JSON | No | Previous value (null if new property) |
| `new_value` | JSON | Yes | New value |
| `timestamp` | DateTime | Yes | When this change was detected |
| `change_type` | Enum | Yes | `created`, `updated`, `deleted` |

### Trackable Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `price` | Integer | Price in EUR |
| `square_meters` | Integer | Size in m² |
| `bedrooms` | Integer | Number of bedrooms |
| `floor_info` | String | Floor and elevator info |
| `description` | String | Property description |
| `photos` | Array | Photo URLs |
| `title` | String | Property title |
| `location` | String | Location string |

### Validation Rules

- `attribute_name` must be one of the trackable attributes
- `change_type` must be one of: `created`, `updated`, `deleted`
- `old_value` and `new_value` must match the type of the attribute

### Change Detection Logic

```python
if property_not_in_db:
    create PropertyChange(type='created', old_value=null, new_value=new_value)
elif old_value != new_value:
    create PropertyChange(type='updated', old_value=old_value, new_value=new_value)
```

---

## 6. CrawlConfiguration (Extension Storage)

User settings for the Chrome extension (stored in Chrome Storage API).

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `server_url` | String | Yes | - | Base URL of crawl server API |
| `human_like_enabled` | Boolean | Yes | true | Enable human-like behavior |
| `min_page_delay` | Integer | Yes | 2000 | Minimum delay on page load (ms) |
| `max_page_delay` | Integer | Yes | 8000 | Maximum delay on page load (ms) |
| `min_navigation_delay` | Integer | Yes | 5000 | Minimum delay between pages (ms) |
| `max_navigation_delay` | Integer | Yes | 15000 | Maximum delay between pages (ms) |
| `max_retries` | Integer | Yes | 5 | Max retry attempts for failed requests |
| `retry_base_delay` | Integer | Yes | 1000 | Base delay for exponential backoff (ms) |
| `rate_limit_pause` | Integer | Yes | 300000 | Pause duration on rate limit (5 min) |
| `rate_limit_max_events` | Integer | Yes | 3 | Max rate limit events before stopping |

### Validation Rules

- `server_url` must be valid URL
- `min_*_delay` < `max_*_delay`
- All delay values >= 0
- `max_retries` >= 0

---

## Relationships

### One-to-Many Relationships

- **CrawlSession** → PropertyHistory (a session has many history entries)
- **CrawlSession** → PropertyChange (a session may have many changes)
- **SavedSearch** → Property (a search contains many properties over time)
- **Property** → PropertyHistory (a property has many history entries)
- **Property** → PropertyChange (a property may have many changes)

### Many-to-Many Relationships

- **SavedSearch** ↔ **Property** (properties can appear in multiple searches)
  - Tracked via `Property.current_search_ids` array
  - Tracked via `PropertyHistory.saved_search_id`

---

## Data Flow

### Batch Ingestion Flow

```
1. Extension POST /api/v1/properties/batch
   └─> Body: {session_id, search_id, page, properties[]}

2. API Processes Each Property:
   a. Check if external_id exists
   b. If new: Create Property, PropertyChange(type='created')
   c. If existing: Update last_seen_at, check for changes
   d. If changed: Create PropertyChange(type='updated')
   e. Create PropertyHistory(type='seen')
   f. Update Property.current_search_ids

3. After Batch Complete:
   a. Find properties in search not in batch
   b. Create PropertyHistory(type='missing') for each
   c. Update Property.status if appropriate
```

### Missing Property Detection

```python
# After processing all properties from a search
previous_properties = get_properties_from_search(search_id, previous_session)
current_properties = get_properties_from_search(search_id, current_session)

missing_properties = previous_properties - current_properties

for prop in missing_properties:
    create PropertyHistory(
        property_id=prop.id,
        event_type='missing',
        crawl_session_id=current_session.id,
        saved_search_id=search_id
    )
    
    # Check if property exists in ANY other search
    if prop.id not in any_other_active_search:
        prop.status = 'missing'
        
        # Check if missing for > 30 days
        if days_since_last_seen(prop) > 30:
            prop.status = 'sold'
```

---

## Indexes

### MongoDB Indexes (Recommended)

```javascript
// For fast lookups by external ID
db.properties.createIndex({ external_id: 1 }, { unique: true })

// For status queries
db.properties.createIndex({ status: 1 })

// For missing property detection
db.properties.createIndex({ current_search_ids: 1, last_seen_at: 1 })

// For history lookups
db.property_history.createIndex({ property_id: 1, timestamp: -1 })
db.property_history.createIndex({ crawl_session_id: 1 })

// For change tracking
db.property_changes.createIndex({ property_id: 1, timestamp: -1 })

// For session queries
db.crawl_sessions.createIndex({ status: 1 })
db.crawl_sessions.createIndex({ started_at: -1 })

// For search lookups
db.saved_searches.createIndex({ external_search_id: 1 }, { unique: true })
```

---

## Schema Migration Notes

### From Previous Version

1. **Existing Property Collection**: Add `current_search_ids` array field
2. **New Collections**: Create `property_history` and `property_changes`
3. **Backfill**: Create initial `PropertyHistory` entries for all existing properties with `event_type='seen'`

### Data Retention

- PropertyHistory: Keep indefinitely (for complete audit trail)
- PropertyChange: Keep indefinitely (for price tracking history)
- CrawlSession: Keep indefinitely (session metadata is small)
- Consider archiving old sessions after 2 years if storage becomes concern
