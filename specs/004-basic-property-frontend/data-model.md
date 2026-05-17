# Data Model: Basic Property Frontend

**Feature**: Basic Property Frontend  
**Date**: 2026-05-17  
**Source**: Existing SQLite database (`idealista_properties.db`)

## Property Entity

The frontend consumes the existing `property` table from the SQLite database.

### Database Schema (Property Table)

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | INTEGER | Yes | Primary key, auto-increment |
| idealista_id | VARCHAR(20) | Yes | Unique external ID |
| title | VARCHAR(500) | Yes | Property listing title |
| property_type | VARCHAR(50) | No | House, apartment, etc. |
| location | VARCHAR(500) | Yes | Full location string |
| original_price | INTEGER | Yes | Initial listed price (EUR) |
| current_price | INTEGER | Yes | Current price (EUR) |
| price_drop_percentage | FLOAT | No | Calculated price drop % |
| size_m2 | INTEGER | No | Property size in square meters |
| bedrooms | INTEGER | No | Number of bedrooms |
| floor | VARCHAR(50) | No | Floor number/description |
| has_elevator | BOOLEAN | No | Whether property has elevator |
| property_url | VARCHAR(500) | Yes | Link to Idealista listing |
| image_url | VARCHAR(500) | No | Primary property image URL |
| created_at | DATETIME | Yes | When record was created |
| updated_at | DATETIME | Yes | When record was last updated |
| is_active | BOOLEAN | Yes | Whether property is active |
| status | VARCHAR(20) | Yes | "active", "missing", "sold" |

### TypeScript Interface

```typescript
interface Property {
  id: number;
  idealista_id: string;
  title: string;
  property_type: string | null;
  location: string;
  original_price: number;
  current_price: number;
  price_drop_percentage: number | null;
  size_m2: number | null;
  bedrooms: number | null;
  floor: string | null;
  has_elevator: boolean | null;
  property_url: string;
  image_url: string | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
  is_active: boolean;
  status: 'active' | 'missing' | 'sold';
}
```

### Price Distribution Data

For the histogram chart, we'll compute price buckets using SQL:

```typescript
interface PriceBucket {
  bucket_min: number;    // Lower bound of price range (EUR)
  bucket_max: number;    // Upper bound of price range (EUR)
  count: number;         // Number of properties in this bucket
}

interface PriceDistribution {
  buckets: PriceBucket[];
  total_properties: number;
  min_price: number;
  max_price: number;
  avg_price: number;
}
```

### Pagination Model

```typescript
interface PaginatedProperties {
  properties: Property[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_properties: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  };
}
```

## Data Access Patterns

### Query 1: Paginated Property List

```sql
SELECT 
  id,
  idealista_id,
  title,
  property_type,
  location,
  current_price,
  price_drop_percentage,
  size_m2,
  bedrooms,
  property_url,
  image_url,
  status
FROM property
WHERE is_active = 1
ORDER BY created_at DESC
LIMIT ? OFFSET ?;
```

**Parameters**:
- `LIMIT`: Page size (default: 20)
- `OFFSET`: (page - 1) * page_size

### Query 2: Total Count

```sql
SELECT COUNT(*) as total FROM property WHERE is_active = 1;
```

### Query 3: Price Distribution Buckets

```sql
-- Create 10 evenly-spaced buckets based on price range
WITH price_stats AS (
  SELECT 
    MIN(current_price) as min_price,
    MAX(current_price) as max_price,
    (MAX(current_price) - MIN(current_price)) / 10.0 as bucket_size
  FROM property
  WHERE is_active = 1
)
SELECT 
  CAST((current_price - min_price) / bucket_size AS INTEGER) * bucket_size + min_price as bucket_min,
  CAST((current_price - min_price) / bucket_size AS INTEGER) * bucket_size + min_price + bucket_size as bucket_max,
  COUNT(*) as count
FROM property, price_stats
WHERE is_active = 1
GROUP BY CAST((current_price - min_price) / bucket_size AS INTEGER)
ORDER BY bucket_min;
```

## Data Validation Rules

### Property List Display
- **Title**: Display as-is, truncate if > 100 chars with "..."
- **Price**: Format as EUR currency (e.g., "€450,000")
- **Location**: Display full string
- **Property Type**: Capitalize first letter, display "N/A" if null
- **Size**: Display with "m²" suffix, hide if null
- **Bedrooms**: Display with "bed" suffix, hide if null
- **Status Badge**: Color-coded (green=active, yellow=missing, red=sold)

### Price Distribution Chart
- **Minimum bucket size**: €10,000 (to avoid too many small buckets)
- **Maximum buckets**: 15 (for readability)
- **Empty buckets**: Skip in chart (no zero-height bars)
- **Currency**: Always display in EUR

## State Management

No complex state management needed. Data flows:

1. **Server Component** fetches initial data (paginated list + price distribution)
2. **Client Components** handle pagination navigation (URL query params)
3. **Recharts** handles chart interactivity internally

## Caching Strategy

- **Page-level**: Next.js caches server-rendered pages
- **Data**: SQLite queries are fast enough; no additional caching needed for MVP
- **Revalidation**: Manual refresh acceptable; no ISR needed for this use case
