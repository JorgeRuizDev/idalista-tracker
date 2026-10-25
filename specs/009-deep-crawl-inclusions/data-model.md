# Data Model: Automated Deep Crawl for Inclusions and Pending Listings

**Feature Branch**: `009-deep-crawl-inclusions`  
**Date**: 2026-10-25  
**Spec**: [spec.md](./spec.md)  

## Entities & Schemas

### 1. Property (Extended Lifecycle Entity)

Represents real estate listings tracked in the database (`idealista_properties.db`).

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK, Auto | Internal primary key |
| `idealista_id` | String(50) | Unique, Indexed, NOT NULL | Idealista portal listing identifier |
| `property_url` | String(500) | NOT NULL | Canonical listing web address |
| `detail_status` | String(20) | NOT NULL, Indexed, Default: `'legacy'` | Enum: `'legacy'`, `'pending'`, `'completed'`, `'discarded'` |
| `detail_updated_at` | DateTime | NULL | Timestamp when snapshot was completed or discarded |
| `discard_reason` | String(50) | NULL | Enum: `'delisted'`, `'extension_retries_exhausted'`, `'manual_discard'` |
| `backend_attempts` | Integer | NOT NULL, Default: 0 | Number of attempts made by backend crawler |
| `extension_attempts` | Integer | NOT NULL, Default: 0 | Number of attempts made by extension crawler |
| `fallback_to_extension` | Boolean | NOT NULL, Default: False | Flag indicating property requires Chrome extension execution |

#### State Machine

```
              [New Listing Ingested via Search Batch]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ detail_status: pending│◄───────────────────────┐
                     └───────────┬───────────┘                        │
                                 │                                    │
                  Deep Analysis via Chrome Extension                  │
                                 │                                    │
                ┌────────────────┴────────────────┐                   │
                │                                 │                   │
                ▼                                 ▼                   │
       [Success: DOM + Photos]            [Confirmed Delisted /       │
                │                          Ad Deactivated (404/410)]  │
                ▼                                 │                   │
┌───────────────────────────┐                     ▼                   │
│ detail_status: completed  │       ┌───────────────────────────┐     │
│ - PropertySnapshot stored │       │ detail_status: discarded  │     │
│ - PropertyPhotos stored   │       │ - reason: 'delisted'      │     │
│ - detail_updated_at set   │       └─────────────┬─────────────┘     │
└───────────────────────────┘                     │                   │
                                          [Operator Re-queue]─────────┘
```

---

### 2. PropertySnapshot (Rich Web Detail Entity)

Stores the full web snapshot captured during deep listing analysis (`property_snapshot` table).

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK, Auto | Primary key |
| `property_id` | Integer | FK to `property.id`, Unique, NOT NULL, Cascade Delete | Parent property reference (1:1) |
| `crawled_at` | DateTime | NOT NULL, Default: UTC Now | Timestamp when snapshot was captured |
| `source_engine` | String(30) | NOT NULL | Engine identifier (`'chrome_extension'` or `'backend_playwright'`) |
| `full_description` | Text | NOT NULL | Complete original description preserving formatting and line breaks |
| `neighborhood` | String(255) | NULL | Extracted neighborhood |
| `district` | String(255) | NULL | Extracted district |
| `city` | String(255) | NULL | Extracted municipality/city |
| `province` | String(255) | NULL | Extracted province |
| `latitude` | Float | NULL | Published latitude coordinate |
| `longitude` | Float | NULL | Published longitude coordinate |
| `features` | JSON | NULL | Structured dictionary/list of attributes (e.g. heating, elevator, terrace) |
| `photos_count` | Integer | NOT NULL, Default: 0 | Number of media assets downloaded |

---

### 3. PropertyPhoto (Local Media Entity)

Tracks each individual photo downloaded from the listing gallery (`property_photo` table).

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK, Auto | Primary key |
| `property_id` | Integer | FK to `property.id`, NOT NULL, Cascade Delete | Parent property reference (1:N) |
| `local_file_path` | String(500) | NOT NULL | Relative disk path (e.g., `media/properties/112870288/photo_0.jpg`) |
| `original_url` | String(1000) | NOT NULL | Original remote URL on Idealista CDN |
| `sequence_index` | Integer | NOT NULL, Default: 0 | Display order in listing gallery |
| `caption` | String(255) | NULL | Image title/caption if present in DOM |
| `file_size_bytes` | Integer | NULL | Downloaded file size in bytes |
| `content_type` | String(50) | NOT NULL, Default: `'image/jpeg'` | MIME type |
| `created_at` | DateTime | NOT NULL, Default: UTC Now | Timestamp of download |

*Unique Constraint*: `(property_id, sequence_index)`

---

### 4. DetailCrawlAttempt (Audit & Resilience Entity)

Logs each crawl attempt for operational auditing and failure handling (`detail_crawl_attempt` table).

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK, Auto | Primary key |
| `property_id` | Integer | FK to `property.id`, NOT NULL, Cascade Delete | Parent property reference |
| `attempt_source` | String(20) | NOT NULL | `'extension'` or `'backend'` |
| `attempt_number` | Integer | NOT NULL, Default: 1 | Sequential attempt counter |
| `http_status` | Integer | NULL | HTTP response code |
| `challenge_detected` | String(30) | NOT NULL, Default: `'none'` | `'none'`, `'captcha'`, `'cloudflare'`, `'rate_limit'` |
| `outcome` | String(30) | NOT NULL | `'success'`, `'retryable_error'`, `'delisted'`, `'permanent_failure'` |
| `error_message` | Text | NULL | Error or rejection details |
| `created_at` | DateTime | NOT NULL, Default: UTC Now | Attempt timestamp |
