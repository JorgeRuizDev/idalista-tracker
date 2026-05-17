# Internal Data Contracts

**Feature**: Basic Property Frontend  
**Date**: 2026-05-17

## Overview

This frontend does not expose external APIs. All data access is internal via direct SQLite queries from React Server Components. This document defines the internal data contracts between the database layer and UI components.

## Data Fetching Functions

### `getPaginatedProperties(page: number, pageSize: number): PaginatedProperties`

**Location**: `frontend/lib/db.ts`

**Input**:
- `page`: 1-based page number
- `pageSize`: Number of items per page (default: 20, max: 100)

**Output**: `PaginatedProperties`

```typescript
{
  properties: Property[],
  pagination: {
    current_page: number;
    total_pages: number;
    total_properties: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
  }
}
```

**Error Handling**:
- Throws `DatabaseError` if connection fails
- Returns empty array if no properties exist

---

### `getPriceDistribution(): PriceDistribution`

**Location**: `frontend/lib/db.ts`

**Input**: None

**Output**: `PriceDistribution`

```typescript
{
  buckets: [
    { bucket_min: 100000, bucket_max: 200000, count: 15 },
    { bucket_min: 200000, bucket_max: 300000, count: 23 },
    // ...
  ],
  total_properties: 150,
  min_price: 100000,
  max_price: 950000,
  avg_price: 425000
}
```

**Error Handling**:
- Throws `DatabaseError` if query fails
- Returns empty buckets array if no properties exist

---

## Component Props Contracts

### PropertyList Component

```typescript
interface PropertyListProps {
  properties: Property[];
  pagination: PaginationInfo;
}
```

### PropertyCard Component

```typescript
interface PropertyCardProps {
  property: Property;
}
```

### PriceChart Component

```typescript
interface PriceChartProps {
  distribution: PriceDistribution;
}
```

### Pagination Component

```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
```

## URL Contract

The frontend uses URL query parameters for pagination state:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Current page number |

**Example URLs**:
- `/` - First page
- `/?page=2` - Second page
- `/?page=5` - Fifth page

## Database Connection Contract

**Location**: `frontend/lib/db.ts`

```typescript
// Singleton database connection
const db = new Database('idealista_properties.db', {
  readonly: true,  // Frontend only reads
  fileMustExist: true
});

// Connection is shared across requests in development
// In production (static export), data is fetched at build time
```

## Error Contracts

### DatabaseError

```typescript
class DatabaseError extends Error {
  constructor(
    message: string,
    public code: 'CONNECTION_FAILED' | 'QUERY_FAILED' | 'NOT_FOUND'
  ) {
    super(message);
  }
}
```

## Type Safety

All contracts are enforced via TypeScript interfaces defined in `frontend/types/property.ts`.

## Notes

- No authentication/authorization contracts (public read-only access)
- No rate limiting (local deployment only)
- No versioning (single deployment)
