# Data Model: Rebuild Property & Market Analytics Frontend

**Feature**: Rebuild Property & Market Analytics Frontend  
**Branch**: `007-rebuild-analytics-frontend`  
**Date**: 2026-10-18  

---

## 1. Core Domain Entities

### Property (Inmueble)
Represents a property listing tracked from Idealista.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Internal primary key |
| `idealista_id` | String | External unique identifier on Idealista |
| `title` | String | Clean title of the listing (used for zone extraction) |
| `address` | String | Extracted street / location snippet |
| `zone` | String | Normalized canonical zone (e.g. "Gamonal - San Bruno - G9") |
| `property_type` | String | Category ("Piso", "Ático", "Chalet", "Dúplex") |
| `original_price` | Integer | Initial listing price in EUR |
| `current_price` | Integer | Latest / closing price in EUR |
| `discount_amount` | Integer | `original_price - current_price` (0 if no drop) |
| `discount_pct` | Float | Percentage price reduction from original |
| `size_m2` | Integer | Surface area in square meters |
| `price_per_m2` | Integer | `current_price / size_m2` |
| `bedrooms` | Integer | Number of bedrooms |
| `floor` | String | Floor descriptor (e.g. "3ª planta exterior") |
| `has_elevator` | Boolean | True if building has elevator |
| `status` | String | `'active'`, `'sold'`, or `'missing'` |
| `first_seen_at` | DateTime | Timestamp when first crawled / listed |
| `last_seen_at` | DateTime | Timestamp of most recent crawler verification |
| `sold_at` | DateTime | Timestamp when listing was identified as sold |
| `days_on_market` | Integer | Duration in days (`sold_at - first_seen_at` if sold, or `now - first_seen_at` if active) |
| `photos` | List[String] | Array of image URLs |
| `property_url` | String | Direct external URL to original Idealista listing |
| `price_history` | List[PriceHistoryEntry] | Chronological array of price changes |

---

### NormalizedZone (Zona Geográfica)
Represents a normalized neighborhood or district with aggregate statistics.

| Field | Type | Description |
| :--- | :--- | :--- |
| `zone` | String | Canonical zone name |
| `total` | Integer | Total properties registered historically |
| `active` | Integer | Count of currently active listings |
| `sold` | Integer | Count of sold listings |
| `missing` | Integer | Count of missing / delisted properties |
| `avg_price` | Integer | Mean price across properties in this zone |
| `avg_m2` | Integer | Mean price per square meter in EUR |
| `avg_days_to_sell` | Integer | Average days on market before sale |
| `avg_discount_pct` | Float | Average discount percentage granted on sold properties |

---

### PriceHistoryEntry (Historial de Precios)
Represents an individual price change observation.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer | Entry ID |
| `property_id` | Integer | Foreign key to Property |
| `old_price` | Integer (optional) | Previous price in EUR |
| `new_price` | Integer | New price in EUR |
| `change_date` | String | Date of change (YYYY-MM-DD) |
| `change_type` | String | `'initial'`, `'drop'`, `'increase'` |
| `diff_amount` | Integer | Amount difference in EUR |
| `diff_pct` | Float | Percentage change |

---

### IntervalAudit (Auditoría de Intervalo Temporal)
Represents aggregated market dynamics within a selected calendar date interval `[start_date, end_date]`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `interval_label` | String | Display name (e.g. "Julio 2026" or "01/07/2026 a 31/07/2026") |
| `start_date` | String | ISO date YYYY-MM-DD |
| `end_date` | String | ISO date YYYY-MM-DD |
| `inclusions` | Integer | Count of new properties listed during the interval |
| `sales` | Integer | Count of properties sold during the interval |
| `drops_count` | Integer | Number of price drops detected |
| `avg_drop_pct` | Float | Average price drop percentage in interval |
| `total_drop_amount` | Integer | Total EUR value reduced in interval |
| `increases_count` | Integer | Number of price increases detected |
| `avg_inc_pct` | Float | Average price increase percentage in interval |
| `avg_days_to_sell` | Integer | Average time in days to sell for properties closed in interval |
| `zone_breakdown` | List[IntervalZoneMetric] | Territorial breakdown within this specific interval |

---

### IntervalZoneMetric (Desglose Territorial en Intervalo)

| Field | Type | Description |
| :--- | :--- | :--- |
| `zone` | String | Canonical zone name |
| `inclusions` | Integer | New properties listed in this zone during interval |
| `sales` | Integer | Properties sold in this zone during interval |
| `avg_days_to_sell` | Integer | Average days on market until sale in this zone |
| `avg_discount_pct` | Float | Average negotiation discount applied in this zone |
| `avg_sale_price` | Integer | Average transaction closing price in EUR |

---

## 2. Frontend Client State Model

### FilterState
```typescript
interface FilterState {
  soldStatus: 'all' | 'only_active' | 'only_sold';
  zone: string; // 'all' or canonical zone name
  priceMin?: number;
  priceMax?: number;
  dateStart?: string; // YYYY-MM-DD
  dateEnd?: string;   // YYYY-MM-DD
  onlyDeals: boolean; // only properties with price reduction
  searchQuery: string;
  sortBy: 'discount_desc' | 'days_desc' | 'price_asc' | 'price_desc' | 'm2_asc' | 'date_desc';
}
```

### IntervalAuditState
```typescript
interface IntervalAuditState {
  selectedPreset: string; // '2026-05' | '2026-06' | ... | 'custom'
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  isLoading: boolean;
  data: IntervalAudit | null;
}
```
