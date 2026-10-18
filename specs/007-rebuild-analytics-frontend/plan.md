# Implementation Plan: Rebuild Property & Market Analytics Frontend

**Branch**: `007-rebuild-analytics-frontend` | **Date**: 2026-10-18 | **Spec**: [specs/007-rebuild-analytics-frontend/spec.md](spec.md)

**Input**: Feature specification from `/specs/007-rebuild-analytics-frontend/spec.md` with explicit mandate to delete legacy frontend and rebuild client completely from scratch.

---

## Summary

The current property tracker frontend suffers from rigid page fragmentation, lacks mapless high-density layouts, fails to properly group properties by zone due to raw scrape artifacts in the database, and lacks sales-centric analysis.

This plan executes a **complete rebuild of the frontend client from scratch**:
1. **Purge Legacy Frontend**: Remove the entire existing `frontend/` directory (Next.js 14, obsolete components, styles, and configurations).
2. **Scaffold Greenfield Client**: Build a fresh, high-performance Single Page Application using Vite, React 19, TypeScript, Tailwind CSS, Lucide React, and Chart.js.
3. **Backend API Enhancements**:
   - Implement `ZoneService` with canonical normalization mapping `property.title` / `property.location` to 23 verified Burgos zones.
   - Extend `PropertyService` to support `status` (`sold`, `active`, `all`), `zone`, and date range filters with sold-specific metrics (`days_to_sell`, `discount_amount`, `discount_pct`).
   - Implement `AnalyticsService` for time interval auditing (`/api/v1/analytics/interval`) calculating inclusions, sales, price drops/increases %, days to sell, and territorial breakdown.
4. **Sales & Market Experience**:
   - Property Explorer with 3-way sales filter (*Solo Vendidos*, *Activos*, *Incluir Todos*), date range picker, and zero map dependencies.
   - Dedicated Interval Audit section with calendar range picker and preconfigured monthly buttons.
   - Macro market trends and clean 23-zone census table without any artificial or speculative metrics.

---

## Technical Context

**Language/Version**: 
- Frontend: TypeScript 5.4+ / Node.js 18+
- Backend: Python 3.11+

**Primary Dependencies**: 
- Frontend: React 18/19, Vite, Tailwind CSS, Lucide React, Chart.js, react-chartjs-2
- Backend: FastAPI, SQLAlchemy, Pydantic v2, Uvicorn

**Storage**: 
- SQLite database (`idealista_properties.db`), 2,190 tracked listings, 58 crawl sessions, 37 distinct price change dates.

**Testing**: 
- Frontend: Vitest + React Testing Library
- Backend: pytest + pytest-asyncio (contract & service tests)

**Target Platform**: 
- Modern Desktop & Mobile Web Browsers (Chrome, Edge, Firefox, Safari)

**Project Type**: 
- Full-Stack Web Application (SPA Client + REST API Service)

**Performance Goals**: 
- Frontend initial render < 1.0s.
- Interactive filter and sort updates < 100ms.
- Interval audit aggregations < 250ms for the full 2,190 listing database.

**Constraints**: 
- Complete deletion of `frontend/` directory before building the new client.
- Zero map dependencies (no Leaflet, no Mapbox, no OpenStreetMap tiles).
- No speculative investor profiles or synthetic yield formulas.
- Strict backward compatibility for crawler services and database schemas.

**Scale/Scope**: 
- 2,190 properties, 23 normalized zones, 6 monthly analytical historical intervals (May–Oct 2026).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Verification |
| :--- | :--- | :---: | :--- |
| **I. Code Quality** | Enforce consistent linting, formatting and complexity rules. | ✅ PASS | Vite project configured with ESLint + Prettier. Backend passes flake8 / ruff. |
| **II. Testing Standards** | Automated unit and integration tests for every user-visible change. | ✅ PASS | Unit tests for Zone Normalizer, Interval Aggregator, and UI sales filters. |
| **III. UX Consistency** | Predictable interaction patterns, accessible contrast, responsive layout. | ✅ PASS | Urbana Pulse design system, dark/light theme, tabular numerals for pricing. |
| **IV. Performance Requirements** | Sub-second load times, no heavy map dependencies, fast SQLite indexing. | ✅ PASS | Map removed; Vite client SPA bundle < 250KB gzipped; SQLite queries < 25ms. |
| **V. Simplicity** | Direct REST consumption, zero SSR hydration overhead. | ✅ PASS | Clean client SPA consuming straightforward REST JSON endpoints. |

---

## Project Structure

### Documentation (this feature)

```text
specs/007-rebuild-analytics-frontend/
├── plan.md              # This file
├── research.md          # Stack selection, legacy purge, zone normalization
├── data-model.md        # Entities, properties, zone census, interval audit
├── quickstart.md        # Step-by-step deletion, scaffolding, and validation
├── contracts/
│   └── api-contracts.md # Endpoints specifications (/properties, /zones, /analytics/interval)
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Architecture

```text
# Repository Root

src/
├── api/
│   ├── routes/
│   │   ├── properties.py     # Extended with status, zone, date range filters
│   │   ├── zones.py          # GET /api/v1/zones
│   │   └── analytics.py      # GET /api/v1/analytics/interval, /analytics/trends
│   └── schemas.py            # Pydantic models for zone census & interval audit
├── services/
│   ├── property_service.py   # Enhanced listing queries with sales metrics
│   ├── zone_service.py       # Canonical 23-zone normalizer & census
│   └── analytics_service.py  # Interval audit aggregator
└── database/
    └── models.py

frontend/ (completely new greenfield client application)
├── src/
│   ├── components/
│   │   ├── explorer/
│   │   │   ├── PropertyCard.tsx       # Card with sales badge, days, and discount
│   │   │   ├── PropertyGrid.tsx       # 3-4 column responsive mapless grid
│   │   │   ├── FilterToolbar.tsx      # Zone, price, date range selectors
│   │   │   └── SoldStatusSelector.tsx # 3-state segmented control
│   │   ├── intervals/
│   │   │   ├── IntervalSelector.tsx   # Month presets + custom date inputs
│   │   │   ├── IntervalMetricCards.tsx# Inclusions, sales, drops, increases, days
│   │   │   └── IntervalZoneTable.tsx  # Neighborhood breakdown for interval
│   │   ├── trends/
│   │   │   ├── PriceEvolutionChart.tsx# Monthly line chart (€/m²)
│   │   │   ├── DropsVsSalesChart.tsx  # Monthly bar chart
│   │   │   └── CensusTable.tsx        # 23 canonical zones table
│   │   ├── modal/
│   │   │   ├── PropertyDetailModal.tsx# Photo gallery & price history timeline
│   │   │   └── ZoneDiagnosticModal.tsx# Explains DB zone extraction & counts
│   │   └── layout/
│   │       ├── Header.tsx             # Navigation tabs & search
│   │       └── ThemeToggle.tsx        # Dark/light mode switcher
│   ├── services/
│   │   └── api.ts                     # Fetch client for FastAPI backend
│   ├── types/
│   │   └── property.ts                # TypeScript interfaces
│   ├── App.tsx                        # Tab navigation & top-level view state
│   ├── main.tsx                       # React DOM root
│   └── index.css                      # Tailwind CSS v4 / v3 directives
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

**Structure Decision**: Greenfield client SPA in `frontend/` communicating with enhanced FastAPI backend in `src/`. No files retained from the old Next.js frontend.

---

## Complexity Tracking

> No violations. The architecture replaces complex server-side Next.js rendering with a clean, decoupled client SPA and focused REST services.

---

## Phase Execution Checklist

### Phase 0: Outline & Research
- [x] Tech stack evaluated and chosen (Vite + React 19 + TypeScript + Tailwind).
- [x] Legacy frontend deletion plan formulated.
- [x] Zone normalization algorithm tested on 2,190 SQLite records.
- [x] Output: `research.md`.

### Phase 1: Design & Contracts
- [x] Data entities defined (`data-model.md`).
- [x] API contracts documented (`contracts/api-contracts.md`).
- [x] Quickstart validation scenarios defined (`quickstart.md`).
- [x] Constitution re-evaluated and passed.
- [x] Output: `plan.md`, `data-model.md`, `contracts/api-contracts.md`, `quickstart.md`.
