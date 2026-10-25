# Data Model: Interactive Interval KPI & Zone Filters with Property Drilldown

**Feature**: `008-interval-filters-drilldown`  
**Date**: 2026-10-25

---

## 1. Entities & Schema Definitions

### 1.1 `IntervalMetricType` (Enumeration / Literal Type)

Represents the market movement category represented by the interval summary KPI cards.

| Value | Label (UI) | Semantic Definition | SQL / Service Filter Criteria |
|---|---|---|---|
| `all` | *Todos los Inmuebles* | All properties active or touched in interval | `date_from <= prop_date <= date_to` |
| `inclusions` | *Inclusiones* | Newly captured listings in the period | `Property.first_seen_at >= dt_start AND Property.first_seen_at < dt_end` |
| `sales` | *Ventas Concluidas* | Completed sales closed in the period | `Property.status == 'sold' AND Property.sold_at >= dt_start AND Property.sold_at < dt_end` |
| `price_drops` | *Rebajas de Precio* | Properties with price drops in period | `PriceHistory.change_date >= dt_start AND PriceHistory.change_date < dt_end AND PriceHistory.new_price < PriceHistory.old_price` |
| `price_increases` | *Aumentos de Precio* | Properties with price hikes in period | `PriceHistory.change_date >= dt_start AND PriceHistory.change_date < dt_end AND PriceHistory.new_price > PriceHistory.old_price` |

---

### 1.2 `IntervalDrilldownFilterState` (Frontend State Model)

Tracks the interactive drilldown filter parameters in the Interval Audit view.

```typescript
export interface IntervalDrilldownFilterState {
  /** Active market movement metric filter from KPI cards */
  metric: IntervalMetricType | null;
  /** Active canonical zone filter from territorial table */
  zone: string | null; // e.g., 'Gamonal', 'Burgos Centro', or null for all
  /** Active date range start (YYYY-MM-DD) */
  startDate: string;
  /** Active date range end (YYYY-MM-DD) */
  endDate: string;
  /** Pagination offset */
  offset: number;
  /** Page size limit */
  limit: number;
}
```

**Validation & Invariants:**
- `startDate` MUST be formatted as `YYYY-MM-DD` and MUST NOT exceed `endDate`.
- `zone`, when set, MUST match one of the 23 canonical zones or `'all'`.
- `offset` MUST be `>= 0`. When `metric`, `zone`, `startDate`, or `endDate` changes, `offset` MUST reset to `0`.

---

### 1.3 `PropertyQueryParams` (Extended API Contract)

Query parameters accepted by `GET /api/v1/properties`:

| Field | Type | Required | Description |
|---|---|---|---|
| `movement_type` | `Optional[str]` | No | `'inclusions'`, `'sales'`, `'price_drops'`, `'price_increases'` |
| `status` | `Optional[str]` | No | `'active'`, `'sold'`, `'all'`, `'missing'` |
| `zone` | `Optional[str]` | No | Normalized canonical zone name |
| `date_from` | `Optional[str]` | No | ISO Date `YYYY-MM-DD` |
| `date_to` | `Optional[str]` | No | ISO Date `YYYY-MM-DD` |
| `limit` | `int` | No | Default `24` (or `100`), max `1000` |
| `offset` | `int` | No | Default `0`, pagination offset |
| `sort_by` | `str` | No | `'discount_desc'`, `'date_desc'`, `'price_asc'`, etc. |

---

## 2. Component Interface Extensions

### 2.1 `IntervalMetricCardsProps`

```typescript
export interface IntervalMetricCardsProps {
  data: IntervalAudit | null;
  isLoading?: boolean;
  /** Currently active metric filter, or null if none is selected */
  selectedMetric?: IntervalMetricType | null;
  /** Callback fired when user clicks a KPI card to toggle or select it */
  onSelectMetric?: (metric: IntervalMetricType) => void;
}
```

### 2.2 `IntervalZoneTableProps`

```typescript
export interface IntervalZoneTableProps {
  zoneBreakdown: IntervalZoneMetric[];
  intervalLabel: string;
  /** Currently selected zone name, or null/all if no zone filter is applied */
  selectedZone?: string | null;
  /** Callback fired when user clicks a zone row to toggle or select it */
  onSelectZone?: (zone: string) => void;
}
```

---

## 3. State Transitions

```
[Default Overview: No drilldown filter]
       │
       ├── User clicks KPI Card (e.g. "Rebajas de Precio")
       │   └── State: { metric: 'price_drops', zone: null, offset: 0 }
       │       └── PropertyGrid renders: Price-dropped properties in interval
       │
       ├── User clicks Zone Row (e.g. "Gamonal")
       │   └── State: { metric: 'price_drops', zone: 'Gamonal', offset: 0 }
       │       └── PropertyGrid renders: Price-dropped properties in Gamonal
       │
       ├── User clicks active Zone Row again OR clicks "Clear Zone"
       │   └── State: { metric: 'price_drops', zone: null, offset: 0 }
       │       └── PropertyGrid renders: Price-dropped properties in all zones
       │
       ├── User clicks active KPI Card again OR clicks "Reset All"
       │   └── State: { metric: null, zone: null, offset: 0 }
       │       └── PropertyGrid renders: Unfiltered interval properties (or initial prompt)
       │
       └── User clicks Property Card
           └── PropertyDetailModal opens with complete property history
```
