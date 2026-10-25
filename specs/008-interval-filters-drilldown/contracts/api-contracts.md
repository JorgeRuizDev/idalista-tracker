# API Contracts: Interactive Interval Drilldown

**Feature**: `008-interval-filters-drilldown`  
**Date**: 2026-10-25

---

## 1. `GET /api/v1/properties` (Extended with `movement_type`)

Retrieves paginated properties filtered by market movement types, date ranges, and zones.

### HTTP Request

```http
GET /api/v1/properties?movement_type={movement_type}&zone={zone}&date_from={date_from}&date_to={date_to}&limit={limit}&offset={offset}&sort_by={sort_by} HTTP/1.1
Host: localhost:8000
Accept: application/json
```

### Query Parameters

| Parameter | Type | Required | Description | Examples |
|---|---|---|---|---|
| `movement_type` | `string` | No | Market dynamics movement type | `inclusions`, `sales`, `price_drops`, `price_increases` |
| `zone` | `string` | No | Canonical zone name | `Gamonal`, `Burgos Centro / Otras Zonas`, `San Pedro de la Fuente` |
| `date_from` | `string` | No | ISO start date (`YYYY-MM-DD`) | `2026-07-01` |
| `date_to` | `string` | No | ISO end date (`YYYY-MM-DD`) | `2026-07-31` |
| `limit` | `integer` | No | Maximum items per page (default: 24, max: 1000) | `24` |
| `offset` | `integer` | No | Pagination offset (default: 0) | `0` |
| `sort_by` | `string` | No | Sort criterion | `discount_desc`, `date_desc`, `price_asc`, `price_desc`, `days_desc` |

### Query Filter Behavior

1. **`movement_type=inclusions`**:
   - Matches properties where `Property.first_seen_at >= date_from` and `Property.first_seen_at < (date_to + 1 day)`.
2. **`movement_type=sales`**:
   - Matches properties where `Property.status == 'sold'` and `Property.sold_at >= date_from` and `Property.sold_at < (date_to + 1 day)`.
3. **`movement_type=price_drops`**:
   - Matches properties with at least one record in `price_history` where `change_date >= date_from` and `change_date < (date_to + 1 day)` and `new_price < old_price`.
4. **`movement_type=price_increases`**:
   - Matches properties with at least one record in `price_history` where `change_date >= date_from` and `change_date < (date_to + 1 day)` and `new_price > old_price`.
5. **Combined with `zone`**:
   - Intersects with normalized zone matches (`Property.zone == zone`).

### Response Schema: `PropertyListResponse` (`200 OK`)

```json
{
  "total": 97,
  "limit": 24,
  "offset": 0,
  "items": [
    {
      "id": 142,
      "idealista_id": "105829104",
      "title": "Piso en Calle Vitoria, Gamonal",
      "address": "Calle Vitoria",
      "zone": "Gamonal",
      "price": 145000,
      "original_price": 160000,
      "discount_amount": 15000,
      "discount_pct": 9.4,
      "price_drop_percentage": 9.4,
      "size_m2": 85,
      "price_per_m2": 1706,
      "rooms": 3,
      "bathrooms": 1,
      "status": "active",
      "days_on_market": 42,
      "first_seen_at": "2026-05-15T10:00:00",
      "last_seen_at": "2026-07-28T18:30:00",
      "sold_at": null,
      "photo_url": "https://img4.idealista.com/blur/WEB_LISTING/0/id/105829104.jpg"
    }
  ]
}
```

### Error Responses

- `422 Unprocessable Entity`: Invalid date format or non-numeric pagination parameters.
- `500 Internal Server Error`: Unexpected database failure.
