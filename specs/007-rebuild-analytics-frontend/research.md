# Technical Research: Rebuild Property & Market Analytics Frontend

**Feature**: Rebuild Property & Market Analytics Frontend from Scratch  
**Branch**: `007-rebuild-analytics-frontend`  
**Date**: 2026-10-18  

---

## 1. Frontend Architecture & Stack Selection

### Context
The user explicitly specified:
- *"La Spec debe reflejar un nuevo frontend hecho desde 0 por completo. No debe utilizar nada del frontend actual, solo del backend como mucho"*
- *"Recuerda incluir en el plan el borrado del frontend antiguo"*
- *"Quita el mapa"*
- Modern, responsive, clean proptech UI with fast client-side navigation, interactive charts, and rich filtering.

### Decision
**Stack:** Vite + React 18/19 + TypeScript + Tailwind CSS + Lucide Icons + Chart.js.

### Rationale
1. **Zero Legacy Overhead:** The existing `frontend/` was a Next.js 14 server/client hybrid that suffered from hydration complexity, rigid page-splitting (`/` vs `/insights`), and heavy boilerplate.
2. **Instant Developer & User Experience:** Vite provides sub-second HMR and instant static builds. A client-side Single-Page Application (SPA) allows smooth tab switching (Explorador ↔ Auditoría de Intervalos ↔ Evolución de Precios) without page reloads or layout thrashing.
3. **Data Visualization:** Chart.js with `react-chartjs-2` provides responsive, high-performance canvas charts for monthly price trends, zone rankings, and distribution histograms.
4. **Icons & Styling:** Tailwind CSS and Lucide React match the modern "Urbana Pulse" design language validated in the prototype.

### Alternatives Considered
- **Next.js 15 (App Router):** Rejected because server-side rendering is unnecessary for this local tracking tool, adds node server overhead, and caused friction in the previous codebase.
- **Vanilla JS (like prototype):** Rejected for production implementation because state management across complex filters, modals, comparator baskets, and live interval calculators is much more maintainable and testable in TypeScript + React.

---

## 2. Legacy Frontend Deletion Strategy

### Decision
Completely delete the existing `frontend/` directory before initializing the new frontend workspace.

### Step-by-Step Procedure
1. Stop any running Next.js processes on port 3000.
2. Delete `frontend/` directory (including `node_modules`, `.next`, `app`, `components`, `package.json`, etc.).
3. Scaffold a fresh Vite + React + TypeScript project in `frontend/`.
4. Configure Tailwind CSS, Lucide React, and Chart.js from a clean state.
5. Update repository root scripts and `.gitignore` to reference the clean workspace.

---

## 3. Database Zone Normalization Strategy

### Context
In `idealista_properties.db`, `property.location` is populated with raw description snippets (e.g., `3 hab.\n70 m²`) with only 65 mentions of "Burgos". The real neighborhood is present in `property.title` (e.g. `Piso en Avenida Reyes Católicos, Los Vadillos - R. Sanitaria - Pozanos, Burgos`).

### Decision
Implement a deterministic Zone Normalizer in Python backend (`src/services/zone_service.py` or `src/services/property_service.py`):
1. Extract candidate zone from `property.title` and `property.location`.
2. Map to 23 canonical zones:
   - `Los Vadillos - Reyes Católicos` (243 viviendas)
   - `Villa Pilar` (235 viviendas)
   - `Gamonal - San Bruno - G9` (230 viviendas)
   - `Casco Antiguo - Centro` (155 viviendas)
   - `San Pedro y San Felices` (150 viviendas)
   - `Villimar - San Cristóbal` (116 viviendas)
   - `Universidad - Las Huelgas` (98 viviendas)
   - `Illera` (98 viviendas)
   - `Briviesca` (90 viviendas)
   - `San Agustín - Pisones` (89 viviendas)
   - `Fuentecillas - S7 - S8` (65 viviendas)
   - `San Julián - Cortes` (58 viviendas)
   - `El Carmen - Barrio Gimeno` (55 viviendas)
   - `Juan XXIII - Las Torres` (48 viviendas)
   - `Santa Teresa - San Pedro Cardeña` (42 viviendas)
   - `Yagüe - Villalonquejar` (42 viviendas)
   - `Plantío - Alcampo` (38 viviendas)
   - `Villafría - Castañares` (45 viviendas)
   - `Burgos Centro / Otras Zonas` (resto)
3. Expose a dedicated endpoint `GET /api/v1/zones` returning canonical zones with their real counts (`total`, `active`, `sold`, `missing`), average price, average €/m², average days to sell, and average discount %.
4. Add `zone` filtering parameter to `GET /api/v1/properties`.

### Rationale
Avoids database schema migrations if runtime matching is fast (regex/keyword matching across 2,190 records takes < 5ms in SQLite/Python). Can optionally persist a `normalized_zone` column for instant indexing.

---

## 4. Sold Listings & Date Range Filtering

### Context
Users need to filter by:
- Status: `all`, `only_active`, `only_sold`
- Date Range: `date_from` and `date_to` (filtering against `sold_at` for sold properties, or `first_seen_at` for active properties).
- Sold-specific metrics: `days_to_sell` (calculated as `sold_at - first_seen_at`), final price, and discount from original price.

### Decision
Extend `GET /api/v1/properties` query parameters:
- `status`: Optional enum `['active', 'sold', 'missing', 'all']` (default `'all'`).
- `zone`: Optional string filter matching canonical zone.
- `date_from`: ISO date string (YYYY-MM-DD).
- `date_to`: ISO date string (YYYY-MM-DD).
- `date_mode`: `'relevant'` (uses `sold_at` if sold, `first_seen_at` if active), `'created'` (`first_seen_at`), or `'sold'` (`sold_at`).
- `has_price_drop`: Boolean.
- `sort_by`: Extended to support `'discount_desc'`, `'days_desc'`, `'price_asc'`, `'price_desc'`, `'m2_asc'`, `'date_desc'`.

---

## 5. Time Interval Audit Engine

### Context
The user requested:
- A calendar-based section displaying for any given interval (e.g. July 2026, or custom dates):
  - Inclusions count (`first_seen_at` in interval)
  - Sales / exclusions count (`sold_at` in interval)
  - Price drops count & average drop percentage & total saved
  - Price increases count & average increase percentage
  - Average days to sell in interval
  - Zone breakdown table in interval

### Decision
Implement a dedicated backend endpoint: `GET /api/v1/analytics/interval`
- Query params: `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD).
- Aggregation logic:
  - Inclusions: Count properties where `first_seen_at` is between `start_date` and `end_date`.
  - Sales: Count properties where `status == 'sold'` and `sold_at` is between `start_date` and `end_date`.
  - Drops: Query `price_history` where `new_price < old_price` and `change_date` is between `start_date` and `end_date`.
  - Increases: Query `price_history` where `new_price > old_price` and `change_date` is between `start_date` and `end_date`.
  - Days to sell: Average of `julianday(sold_at) - julianday(first_seen_at)` for properties sold in that interval.
  - Zone breakdown: Aggregate sales, inclusions, avg days to sell, avg drop %, and avg price grouped by normalized zone.

### Performance
SQLite indexes on `first_seen_at`, `sold_at`, `change_date`, and `property_id` ensure the query executes in under 20ms for the full 2,190 dataset.
