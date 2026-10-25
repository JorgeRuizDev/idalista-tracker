# Implementation Plan: Interactive Interval KPI & Zone Filters with Property Drilldown

**Branch**: `008-interval-filters-drilldown` | **Date**: 2026-10-25 | **Spec**: [specs/008-interval-filters-drilldown/spec.md](file:///d:/codebases/idalista-tracker/specs/008-interval-filters-drilldown/spec.md)

**Input**: Feature specification from `specs/008-interval-filters-drilldown/spec.md`

---

## Summary

Enable interactive multi-dimensional filtering in the Interval Audit view by converting the top KPI metric cards (*Inclusiones*, *Ventas Concluidas*, *Rebajas de Precio*, *Aumentos de Precio*) and the territorial zone table rows into active filter toggles. The filtered results are displayed inline below the table by directly reusing the existing `PropertyGrid` and `PropertyCard` components, allowing immediate inspection and opening the `PropertyDetailModal` on card clicks. On the backend, `GET /api/v1/properties` is extended with a `movement_type` query parameter matching the exact calculations in `AnalyticsService`.

---

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript 5.8+ & React 19 (Frontend)  
**Primary Dependencies**: FastAPI, SQLAlchemy, Pydantic v2 (Backend); Vite, Tailwind CSS v4, Lucide-react (Frontend)  
**Storage**: SQLite (`data/tracker.db`) / PostgreSQL with SQLAlchemy ORM  
**Testing**: Pytest (Backend contract/unit tests), Vitest & Testing Library (Frontend component tests)  
**Target Platform**: Modern desktop and mobile web browsers  
**Project Type**: Full-stack web application (FastAPI backend + Vite React frontend)  
**Performance Goals**: API response p95 < 200ms; UI filter toggle and property grid rerender < 100ms  
**Constraints**: Zero duplication of property card UI; strict reuse of `PropertyGrid`, `PropertyCard`, and `PropertyDetailModal`; backward-compatible API  
**Scale/Scope**: ~2,000 properties tracked in Burgos, 23 canonical zones, up to hundreds of listings per monthly interval  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Plan Compliance Status | Notes |
|---|---|---|---|
| **I. Code Quality** | Enforced linting and formatting; justified complexity | **PASS** | Reuses existing services; strict TypeScript types; passes `oxlint` and `ruff`. |
| **II. Testing Standards** | Automated contract, component, and E2E coverage | **PASS** | Backend contract test for `movement_type` filtering; frontend Vitest tests for clickable cards and row selection. |
| **III. UX Consistency** | Identical UI patterns, design tokens, and accessibility | **PASS** | Direct reuse of `PropertyGrid` guarantees 100% parity with main explorer; keyboard-accessible cards and ARIA state attributes. |
| **IV. Performance Requirements** | API p95 < 200ms; initial load < 3s; paginated grid | **PASS** | Subquery on indexed `PriceHistory.change_date` and `Property.first_seen_at`; paginated retrieval with `limit=24`. |
| **V. Simplicity** | Reject unnecessary abstractions; reuse existing code | **PASS** | Directly fulfills user constraint *"no quiero reinventar la rueda"* by embedding existing `PropertyGrid` rather than building custom tables or duplicate endpoints. |

---

## Project Structure

### Documentation (this feature)

```text
specs/008-interval-filters-drilldown/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Technical analysis & decisions
├── data-model.md        # Entities, state model & props
├── quickstart.md        # Step-by-step verification guide
├── contracts/           # API contract definitions
│   └── api-contracts.md # Extended GET /api/v1/properties schema
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── routes/
│   │   └── properties.py           # Extend GET /properties with movement_type param
│   └── schemas.py                  # Ensure schema compatibility
└── services/
    └── property_service.py         # Implement movement_type filtering matching AnalyticsService

frontend/src/
├── types/
│   └── property.ts                 # Add IntervalMetricType and drilldown filter types
├── services/
│   └── api.ts                      # Update getProperties to support movement_type
├── components/
│   ├── intervals/
│   │   ├── IntervalMetricCards.tsx # Add selection state, interactive styling, and click handler
│   │   └── IntervalZoneTable.tsx   # Add selectedZone highlight and row click toggle handler
│   └── explorer/
│       └── PropertyGrid.tsx        # Reused as-is without modification
└── App.tsx                         # Manage interval drilldown filter state and wire PropertyGrid

tests/
├── contract/
│   └── test_interval_properties_contract.py # Contract test for movement_type filters
```

**Structure Decision**: Web application layout (`src/` backend + `frontend/src/` React application). Component reuse is achieved without creating new redundant packages or extra API routers.

---

## Complexity Tracking

> **No violations**: All principles pass cleanly without exceptions.

| Principle | Justification | Simpler Alternative Rejected Because |
|---|---|---|
| None | All designs adhere to Simplicity and UX Consistency principles. | N/A |
