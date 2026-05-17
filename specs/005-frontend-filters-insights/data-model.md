# Data Model: Frontend Filters, Sorting & Insights

**Feature**: Frontend Filters, Sorting & Insights  
**Date**: 2026-05-17  
**Source**: Derived from feature spec and existing database schema

---

## Existing Entities (from Feature 004)

### Property

Represents a real estate listing from the crawler.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (UUID or crawl ID) |
| title | string | Property listing title |
| price | number | Current listing price in EUR |
| location | string | City/neighborhood location |
| bedrooms | number | Number of bedrooms |
| bathrooms | number | Number of bathrooms |
| area | number | Property area in square meters |
| imageUrl | string | URL to primary property image |
| url | string | Original listing URL |
| createdAt | Date | When property was first crawled |
| updatedAt | Date | When property was last updated |

### PriceHistory

Tracks price changes over time for a property.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| propertyId | string | Reference to Property.id |
| oldPrice | number | Previous price value |
| newPrice | number | New price value |
| changedAt | Date | When the change was detected |

---

## New/Extended Entities

### FilterState

Represents the current active filter criteria applied to the property list.

| Field | Type | Description |
|-------|------|-------------|
| priceMin | number | Minimum price filter (optional) |
| priceMax | number | Maximum price filter (optional) |
| location | string[] | Selected locations (multiple allowed) |
| bedroomsMin | number | Minimum bedroom count (optional) |
| bedroomsMax | number | Maximum bedroom count (optional) |
| hasPriceChange | boolean | Filter for properties with price history |

**Validation Rules**:
- `priceMin` must be >= 0
- `priceMax` must be >= `priceMin` if both specified
- `bedroomsMin` must be >= 0
- `bedroomsMax` must be >= `bedroomsMin` if both specified

### SortOption

Represents the selected sorting criteria and direction.

| Field | Type | Description |
|-------|------|-------------|
| field | 'price' \| 'createdAt' \| 'priceChange' | Field to sort by |
| direction | 'asc' \| 'desc' | Sort direction |

**Default**: `{ field: 'createdAt', direction: 'desc' }` (newest first)

### PriceChangeInfo

Calculated data for displaying price change indicators.

| Field | Type | Description |
|-------|------|-------------|
| amount | number | Absolute price change amount |
| percentage | number | Percentage change (-10.5 for 10.5% drop) |
| direction | 'up' \| 'down' | Price went up or down |
| changedAt | Date | When the change occurred |

### InsightStats

Calculated statistics for a set of properties.

| Field | Type | Description |
|-------|------|-------------|
| count | number | Total number of properties in filtered set |
| avgPrice | number | Average price across all properties |
| minPrice | number | Lowest price in set |
| maxPrice | number | Highest price in set |
| avgPriceChange | number | Average price change percentage (for properties with history) |
| priceDistribution | PriceBucket[] | Histogram data for chart |

### PriceBucket

Represents a single bucket in the price distribution histogram.

| Field | Type | Description |
|-------|------|-------------|
| range | string | Display label (e.g., "100k-150k") |
| min | number | Bucket minimum price |
| max | number | Bucket maximum price |
| count | number | Number of properties in this bucket |

---

## TypeScript Interfaces

```typescript
// types/property.ts

interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  imageUrl: string | null;
  url: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PriceHistory {
  id: string;
  propertyId: string;
  oldPrice: number;
  newPrice: number;
  changedAt: Date;
}

interface FilterState {
  priceMin?: number;
  priceMax?: number;
  location?: string[];
  bedroomsMin?: number;
  bedroomsMax?: number;
  hasPriceChange?: boolean;
}

interface SortOption {
  field: 'price' | 'createdAt' | 'priceChange';
  direction: 'asc' | 'desc';
}

interface PriceChangeInfo {
  amount: number;
  percentage: number;
  direction: 'up' | 'down';
  changedAt: Date;
}

interface InsightStats {
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPriceChange: number;
  priceDistribution: PriceBucket[];
}

interface PriceBucket {
  range: string;
  min: number;
  max: number;
  count: number;
}
```

---

## Data Flow

### Filter Application Flow

```
User selects filters
        ↓
Update URL query params (useFilters hook)
        ↓
Re-fetch / filter properties (useProperties hook)
        ↓
Re-render PropertyList with filtered results
        ↓
Update Insights stats based on new filtered set
```

### Insights Calculation Flow

```
Filtered properties array
        ↓
Calculate count (array.length)
        ↓
Calculate min/max/avg prices (reduce operations)
        ↓
Calculate avg price change (filter properties with history)
        ↓
Generate price buckets (binning algorithm)
        ↓
Render stats cards and chart
```

---

## Database Queries

### Fetch Properties with Price History

```sql
SELECT 
  p.*,
  ph.oldPrice as lastOldPrice,
  ph.newPrice as lastNewPrice,
  ph.changedAt as lastChangedAt
FROM properties p
LEFT JOIN (
  SELECT propertyId, oldPrice, newPrice, changedAt
  FROM price_history ph1
  WHERE changedAt = (
    SELECT MAX(changedAt) 
    FROM price_history ph2 
    WHERE ph2.propertyId = ph1.propertyId
  )
) ph ON p.id = ph.propertyId
ORDER BY p.createdAt DESC;
```

This query fetches all properties with their most recent price change (if any) for calculating price change indicators.
