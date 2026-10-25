# Research: Interactive Interval KPI & Zone Filters with Property Drilldown

**Feature**: `008-interval-filters-drilldown`  
**Date**: 2026-10-25

---

## 1. Problem Statement & Research Objectives

The application currently has two primary tabs:
1. **Property Explorer**: Browse individual properties with search, sort, pagination, and multi-faceted filtering.
2. **Interval Audit**: Aggregate market dynamics for customizable date ranges (e.g., July 2026), presenting 5 top-level KPI cards (*Inclusiones*, *Ventas Concluidas*, *Rebajas de Precio*, *Aumentos de Precio*, *Días Medios de Venta*) and a canonical 23-zone breakdown table.

Currently, the KPI cards and the zone table in the Interval Audit tab are static presentation elements. Users cannot inspect the specific listings behind these figures without manually navigating back to the Explorer tab and attempting to replicate date, status, and zone filters.

### Key Questions:
1. How should the backend query API be extended to filter properties matching the exact criteria of each interval KPI card (*inclusions*, *sales*, *price_drops*, *price_increases*)?
2. How should the frontend state and component hierarchy be structured to support drilldown filtering while strictly reusing existing components (`PropertyGrid`, `PropertyCard`, `PropertyDetailModal`)?
3. How should multi-dimensional combinations (e.g., *Rebajas de Precio* + *Gamonal* in *Julio 2026*) be handled with pagination and empty states?

---

## 2. Research Findings & Decisions

### Decision 1: Backend Endpoint Extension via `movement_type`

- **Decision**: Add an optional `movement_type` query parameter to `GET /api/v1/properties`:
  - `movement_type=inclusions`: Filters properties whose `first_seen_at` falls in `[date_from, date_to)`.
  - `movement_type=sales`: Filters properties with `status='sold'` and `sold_at` in `[date_from, date_to)`.
  - `movement_type=price_drops`: Filters properties with a `PriceHistory` record in `[date_from, date_to)` where `new_price < old_price`.
  - `movement_type=price_increases`: Filters properties with a `PriceHistory` record in `[date_from, date_to)` where `new_price > old_price`.
- **Rationale**:
  - The metrics on the cards are computed in `AnalyticsService.get_interval_audit` using these exact database filters. By exposing `movement_type` on `GET /api/v1/properties`, the count and items shown in the drilldown will match the cards and table with 100% mathematical fidelity.
  - Keeps API simple: instead of creating a separate drilldown endpoint, the standard `GET /properties` endpoint handles it naturally, returning standard `PropertyListResponse` (`items: PropertyItem[]`, `total: int`).
- **Alternatives Considered**:
  - *Creating a new endpoint `GET /api/v1/analytics/interval/properties`*: Rejected because it duplicates the pagination, sorting, and serialization logic of `GET /api/v1/properties`, violating Principle V (Simplicity).
  - *Client-side filtering*: Rejected because the interval could contain hundreds or thousands of properties, and loading all properties in memory on the client would break performance budgets (Principle IV).

### Decision 2: Direct Reuse of `PropertyGrid` and `PropertyCard`

- **Decision**: Embed `PropertyGrid` directly inside the Interval Audit view below `IntervalZoneTable`.
- **Rationale**:
  - Directly fulfills the user requirement: *"Es importante que reutilice el componente de la página principal, no quiero reinventar la rueda"*.
  - `PropertyGrid` already encapsulates responsive card layout, pagination (`onPageChange`, `offset`, `limit`), loading indicators, empty states, and card click handlers (`onSelectProperty`).
  - `PropertyDetailModal` is already hoisted at `App.tsx` level; passing `setSelectedProperty` seamlessly opens the full modal without additional wiring.
- **Alternatives Considered**:
  - *Navigating to the Explorer tab with query params*: Rejected because the user loses the interval context (the summary cards and zone table) and would have to switch tabs repeatedly to compare different cards or zones. Inline drilldown provides a superior dashboard experience.

### Decision 3: Interactive Card & Table Row Selection Patterns

- **Decision**:
  - KPI Cards: Make the 4 volume cards (*Inclusiones*, *Ventas Concluidas*, *Rebajas de Precio*, *Aumentos de Precio*) clickable with interactive hover and active styles (`ring-2 ring-indigo-500 shadow-md bg-indigo-50/30 dark:bg-indigo-950/40`). "Días Medios de Venta" displays an informational tooltip or orders sold properties by days on market if clicked. Clicking an active card toggles it off.
  - Zone Table: Clicking any row selects that zone and applies a prominent visual highlight (`border-l-4 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40`). Clicking the active zone row again deselects it.
  - Active Filters Toolbar: Render an informative bar above the grid showing the active criteria (e.g. `[Rebajas de Precio]`, `[Gamonal]`, `[Julio 2026]`), the total count, and a "Limpiar filtros" action.
- **Rationale**:
  - Familiar, intuitive toggle behavior. Multi-dimensional selection (Card + Zone) allows drilling from macro-market down to micro-market in 2 clicks.
- **Alternatives Considered**:
  - *Separate dropdown menus*: Rejected because clicking the cards directly is much faster and directly satisfies the user prompt.

---

## 3. Best Practices & Performance Considerations

1. **Query Optimization**:
   - For `price_drops` and `price_increases`, perform a subquery on `PriceHistory` filtered by `change_date >= dt_from AND change_date < dt_to` to fetch distinct `property_id`s, then join with `Property`.
   - Index checks: `Property.first_seen_at`, `Property.sold_at`, and `PriceHistory.change_date` are already indexed in SQLite/PostgreSQL schemas.
2. **Debouncing & Pagination Reset**:
   - Switching a card or zone resets `offset` to 0 to avoid showing out-of-range empty pages.
3. **Responsive Layout**:
   - On mobile devices, card taps and table row taps are touch-friendly with minimum 44px hit targets and clear active states.
