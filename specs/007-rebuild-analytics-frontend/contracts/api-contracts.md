# API Contracts: Rebuild Property & Market Analytics Frontend

**Base URL**: `http://localhost:8000/api/v1`

---

## 1. List Properties with Extended Filters

### Endpoint
`GET /api/v1/properties`

### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | string | No | Filter by listing status: `'all'`, `'active'`, `'sold'`, `'missing'` (default: `'all'`). |
| `zone` | string | No | Normalized canonical zone name (e.g., `"Gamonal - San Bruno - G9"`). |
| `min_price` | integer | No | Lower price bound in EUR. |
| `max_price` | integer | No | Upper price bound in EUR. |
| `date_from` | string | No | ISO date `YYYY-MM-DD`. Filters properties listed or sold after this date. |
| `date_to` | string | No | ISO date `YYYY-MM-DD`. Filters properties listed or sold before this date. |
| `has_price_drop`| boolean | No | When true, returns only properties with `original_price > current_price`. |
| `search` | string | No | Substring match on title, address or zone. |
| `sort_by` | string | No | Sort field: `'discount_desc'`, `'days_desc'`, `'price_asc'`, `'price_desc'`, `'m2_asc'`, `'date_desc'` (default: `'discount_desc'`). |
| `limit` | integer | No | Page size (1 - 1000, default: 100). |
| `offset` | integer | No | Pagination offset (default: 0). |

### Success Response (200 OK)
```json
{
  "items": [
    {
      "id": 10,
      "idealista_id": "111427424",
      "title": "Piso en Avenida Reyes Católicos, Los Vadillos - R. Sanitaria - Pozanos, Burgos",
      "address": "Avenida Reyes Católicos, 15",
      "zone": "Los Vadillos - Reyes Católicos",
      "property_type": "Piso",
      "original_price": 300000,
      "current_price": 280000,
      "discount_amount": 20000,
      "discount_pct": 6.7,
      "size_m2": 95,
      "price_per_m2": 2947,
      "bedrooms": 2,
      "floor": "4ª planta exterior",
      "has_elevator": true,
      "status": "sold",
      "first_seen_at": "2026-05-11T11:59:50",
      "last_seen_at": "2026-07-30T11:57:56",
      "sold_at": "2026-09-10T22:16:40",
      "days_on_market": 122,
      "photos": [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
      ],
      "property_url": "https://www.idealista.com/inmueble/111427424/",
      "price_history_count": 2
    }
  ],
  "total": 2190,
  "limit": 100,
  "offset": 0
}
```

---

## 2. Canonical Zones Census & Statistics

### Endpoint
`GET /api/v1/zones`

### Description
Returns the 23 normalized canonical zones across the database with active, sold, and pricing aggregates.

### Success Response (200 OK)
```json
[
  {
    "zone": "Los Vadillos - Reyes Católicos",
    "total": 243,
    "active": 99,
    "sold": 104,
    "missing": 40,
    "avg_price": 247050,
    "avg_m2": 2409,
    "avg_days_to_sell": 79,
    "avg_discount_pct": 7.7
  },
  {
    "zone": "Villa Pilar",
    "total": 235,
    "active": 182,
    "sold": 38,
    "missing": 15,
    "avg_price": 282680,
    "avg_m2": 2560,
    "avg_days_to_sell": 84,
    "avg_discount_pct": 4.7
  },
  {
    "zone": "Gamonal - San Bruno - G9",
    "total": 230,
    "active": 87,
    "sold": 106,
    "missing": 37,
    "avg_price": 163797,
    "avg_m2": 2006,
    "avg_days_to_sell": 76,
    "avg_discount_pct": 5.7
  }
]
```

---

## 3. Time Interval Audit & Calendar Analytics

### Endpoint
`GET /api/v1/analytics/interval`

### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `start_date` | string | Yes | Start of interval (`YYYY-MM-DD`). |
| `end_date` | string | Yes | End of interval (`YYYY-MM-DD`). |

### Success Response (200 OK)
```json
{
  "start_date": "2026-07-01",
  "end_date": "2026-07-31",
  "interval_label": "Julio 2026",
  "inclusions": 228,
  "sales": 286,
  "drops_count": 97,
  "avg_drop_pct": 5.6,
  "total_drop_amount": 1052437,
  "increases_count": 13,
  "avg_inc_pct": 5.7,
  "avg_days_to_sell": 67,
  "avg_m2": 1845,
  "zone_breakdown": [
    {
      "zone": "Los Vadillos - Reyes Católicos",
      "inclusions": 32,
      "sales": 44,
      "avg_days_to_sell": 69,
      "avg_discount_pct": 7.4,
      "avg_sale_price": 244000,
      "avg_m2": 2409
    },
    {
      "zone": "Gamonal - San Bruno - G9",
      "inclusions": 30,
      "sales": 48,
      "avg_days_to_sell": 64,
      "avg_discount_pct": 6.2,
      "avg_sale_price": 161000,
      "avg_m2": 2006
    }
  ]
}
```

---

## 4. Market Trends (Monthly Time Series)

### Endpoint
`GET /api/v1/analytics/trends`

### Success Response (200 OK)
```json
{
  "monthly": [
    {
      "month": "2026-05",
      "label": "Mayo 2026",
      "avg_price": 259160,
      "avg_m2": 2167,
      "properties_active": 1050,
      "properties_sold": 1,
      "price_drops": 150,
      "avg_drop_pct": 18.3
    },
    {
      "month": "2026-10",
      "label": "Octubre 2026",
      "avg_price": 232920,
      "avg_m2": 2297,
      "properties_active": 1097,
      "properties_sold": 134,
      "price_drops": 89,
      "avg_drop_pct": 5.7
    }
  ]
}
```
