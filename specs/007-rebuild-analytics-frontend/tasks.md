---
description: "Task list template for feature implementation"
---

# Tasks: Rebuild Property & Market Analytics Frontend

**Input**: Design documents from `/specs/007-rebuild-analytics-frontend/`

**Prerequisites**: [plan.md](file:///d:/codebases/idalista-tracker/specs/007-rebuild-analytics-frontend/plan.md) (required), [spec.md](file:///d:/codebases/idalista-tracker/specs/007-rebuild-analytics-frontend/spec.md) (required for user stories), [research.md](file:///d:/codebases/idalista-tracker/specs/007-rebuild-analytics-frontend/research.md), [data-model.md](file:///d:/codebases/idalista-tracker/specs/007-rebuild-analytics-frontend/data-model.md), [contracts/api-contracts.md](file:///d:/codebases/idalista-tracker/specs/007-rebuild-analytics-frontend/contracts/api-contracts.md)

**Tests**: Tests are explicitly requested in compliance with the project constitution (Principle II: Testing Standards) and user story independent test scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `src/` (routes, services, schemas), `tests/` at repository root
- **Frontend**: `frontend/src/` (components, services, types, test)
- Target database: `idealista_properties.db` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project cleanup, legacy purge, and greenfield workspace scaffolding

- [X] T001 Delete legacy Next.js frontend directory in `frontend/` to ensure a completely clean greenfield workspace
- [X] T002 Initialize fresh Vite + React 19 + TypeScript application in `frontend/` using `npm create vite@latest frontend -- --template react-ts`
- [X] T003 [P] Install frontend dependencies (`lucide-react`, `chart.js`, `react-chartjs-2`, `@tailwindcss/vite`, `tailwindcss`) in `frontend/package.json`
- [X] T004 [P] Configure Tailwind CSS, Vite plugins, and root styling in `frontend/vite.config.ts`, `frontend/tsconfig.json`, and `frontend/src/index.css`
- [X] T005 [P] Setup Vitest and React Testing Library configuration for client testing in `frontend/vite.config.ts` and `frontend/src/test/setup.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure, canonical zone normalizer, and shared API routing that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Implement canonical 23-zone normalizer mapping `property.title` and `property.location` to standard Burgos zones (including "Los Vadillos - Reyes Católicos", "Villa Pilar", "Gamonal - San Bruno - G9", "Casco Antiguo - Centro") in `src/services/zone_service.py`
- [X] T007 [P] Define Pydantic schemas with constraints (`status` in `'active'|'sold'|'missing'`, `sort_by` in `'discount_desc'|'days_desc'|'price_asc'|'price_desc'|'m2_asc'|'date_desc'`, `change_type` in `'initial'|'drop'|'increase'`, `limit` 1-1000) for `PropertyItem`, `PropertyListResponse`, `NormalizedZoneResponse`, `IntervalAuditResponse`, and `MarketTrendsResponse` in `src/api/schemas.py`
- [X] T008 [P] Implement `GET /api/v1/zones` endpoint returning census statistics (`total`, `active`, `sold`, `missing`, `avg_price`, `avg_m2`, `avg_days_to_sell`, `avg_discount_pct`) in `src/api/routes/zones.py`
- [X] T009 Register zones router and analytics router in `src/main.py`
- [X] T010 [P] Define TypeScript domain interfaces (`Property`, `NormalizedZone`, `IntervalAudit`, `MarketTrends`, `FilterState` with `soldStatus: 'all' | 'only_active' | 'only_sold'`) in `frontend/src/types/property.ts`
- [X] T011 [P] Implement API client with fetch methods (`getProperties`, `getZones`, `getIntervalAudit`, `getMarketTrends`) handling query params and error states in `frontend/src/services/api.ts`
- [X] T012 Implement header layout and persistent dark/light theme toggle in `frontend/src/components/layout/Header.tsx` and `frontend/src/components/layout/ThemeToggle.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Exploración y Filtrado de Inmuebles con Enfoque en Ventas (Priority: P1) 🎯 MVP

**Goal**: Full-width mapless property catalog explorer with 3-state sold filter (*Solo Vendidos*, *Activos*, *Incluir Todos*), normalized zone filter, price and date range pickers, price drop toggle, sorting, and modal with photo gallery and chronological price history.

**Independent Test**: Load the explorer view, toggle sold status to "Solo Vendidos", and verify that every displayed listing exhibits its sold badge, sale date, days on market, and discount from original listing price, and that opening a listing modal shows the photo gallery and chronological price history.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US1] Unit tests for zone normalization and property filter queries (status, zone, price, date range) in `tests/unit/test_property_service_filters.py`
- [X] T014 [P] [US1] Contract test for `GET /api/v1/properties` asserting schema fields (`status`, `sold_at`, `days_on_market`, `discount_amount`, `discount_pct`) in `tests/contract/test_properties_contract.py`
- [X] T015 [P] [US1] Component tests for `SoldStatusSelector` and `PropertyCard` in `frontend/src/components/explorer/__tests__/PropertyCard.test.tsx`

### Implementation for User Story 1

- [X] T016 [US1] Extend `PropertyService.list_properties` to query by `status` (`'all'`, `'active'`, `'sold'`, `'missing'`), canonical `zone`, `date_from`, `date_to`, `has_price_drop`, computing `discount_amount = original_price - current_price`, `discount_pct`, and `days_on_market = (sold_at - first_seen_at) if sold else (now - first_seen_at)` in `src/services/property_service.py`
- [X] T017 [US1] Update `GET /api/v1/properties` route handler to wire query filters and sort options (`'discount_desc'`, `'days_desc'`, `'price_asc'`, `'price_desc'`, `'m2_asc'`, `'date_desc'`) in `src/api/routes/properties.py`
- [X] T018 [P] [US1] Implement 3-state sold status segmented control component (*Solo Vendidos*, *Activos*, *Incluir Todos*) in `frontend/src/components/explorer/SoldStatusSelector.tsx`
- [X] T019 [P] [US1] Implement filter toolbar with zone dropdown (showing property counts), price range inputs, date range pickers, price drop toggle, text search, and sort select in `frontend/src/components/explorer/FilterToolbar.tsx`
- [X] T020 [P] [US1] Implement property card component displaying sold badge, sale date (`sold_at`), days on market (`days_on_market`), discount amount/pct, physical features (`size_m2`, `bedrooms`, `floor`, `has_elevator`), and price/m2 in `frontend/src/components/explorer/PropertyCard.tsx`
- [X] T021 [US1] Implement responsive mapless property grid layout with pagination controls and empty results state in `frontend/src/components/explorer/PropertyGrid.tsx`
- [X] T022 [US1] Implement property detail modal with photo carousel, full physical attributes, original Idealista URL link, and chronological price history timeline (`change_type`, old price, new price, diff amount, diff pct) in `frontend/src/components/modal/PropertyDetailModal.tsx`
- [X] T023 [US1] Integrate Property Explorer view with state synchronization between filters, grid, and modal into `frontend/src/App.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently (MVP ready)

---

## Phase 4: User Story 2 - Auditoría de Intervalos de Tiempo y Dinámica de Mercado (Priority: P2)

**Goal**: Dedicated market interval audit section with calendar date range picker and monthly preset buttons (May–Oct 2026), calculating 5 aggregate market indicators (inclusions, sales, price drops %, price increases %, avg days to sell) and a territorial zone breakdown table.

**Independent Test**: Select an interval (e.g. July 2026 preset or custom calendar range), verify that the 5 quantitative metric cards and the zone breakdown table recalculate dynamically with accurate values without errors even if sales count is zero.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T024 [P] [US2] Unit tests for interval aggregations (inclusions, sales, price drops/increases, avg days to sell, zone breakdown) in `tests/unit/test_analytics_service.py`
- [X] T025 [P] [US2] Contract test for `GET /api/v1/analytics/interval` validating response payload against contract in `tests/contract/test_analytics_interval_contract.py`
- [X] T026 [P] [US2] Component tests for `IntervalSelector` presets and `IntervalMetricCards` in `frontend/src/components/intervals/__tests__/IntervalAudit.test.tsx`

### Implementation for User Story 2

- [X] T027 [US2] Implement `AnalyticsService.get_interval_audit` aggregating inclusions (`first_seen_at`), sales (`sold_at`), drops (`new_price < old_price`), increases (`new_price > old_price`), `avg_days_to_sell`, and territorial zone breakdown for date window `[start_date, end_date]` in `src/services/analytics_service.py`
- [X] T028 [US2] Implement `GET /api/v1/analytics/interval` endpoint accepting required `start_date` and `end_date` query parameters (`YYYY-MM-DD`) in `src/api/routes/analytics.py`
- [X] T029 [P] [US2] Implement interval selector with preconfigured monthly buttons (May 2026 to Oct 2026) and custom calendar inputs with date validation in `frontend/src/components/intervals/IntervalSelector.tsx`
- [X] T030 [P] [US2] Implement 5 KPI metric cards displaying Inclusiones, Ventas, Rebajas (count, avg drop %, total EUR), Subidas (count, avg inc %), and Días Medios hasta Venta in `frontend/src/components/intervals/IntervalMetricCards.tsx`
- [X] T031 [US2] Implement interval territorial breakdown table showing Inclusiones, Ventas, Días venta, Rebaja media %, and Precio medio de transacción por zona in `frontend/src/components/intervals/IntervalZoneTable.tsx`
- [X] T032 [US2] Integrate Interval Audit tab, preset handlers, and loading states into `frontend/src/App.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Análisis Global de Evolución de Precios y Censo de Zonas (Priority: P3)

**Goal**: Macro market trends view with monthly €/m² price evolution line chart, drops vs sales volume bar chart, and complete 23-zone census table from clean database records without speculative investor metrics.

**Independent Test**: Navigate to the "Evolución de Precios & Mercado" tab, verify line chart renders monthly €/m² curve (May–Oct 2026), bar chart renders drops vs sales, and the census table renders all 23 canonical zones without corrupt strings or speculative metrics.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T033 [P] [US3] Unit and contract test for `GET /api/v1/analytics/trends` monthly time series in `tests/contract/test_trends_contract.py`
- [X] T034 [P] [US3] Component tests for `CensusTable` sorting and Chart.js rendering in `frontend/src/components/trends/__tests__/Trends.test.tsx`

### Implementation for User Story 3

- [X] T035 [US3] Implement `AnalyticsService.get_monthly_trends` calculating monthly €/m², active listings, sold listings, and drops vs sales volume in `src/services/analytics_service.py`
- [X] T036 [US3] Implement `GET /api/v1/analytics/trends` endpoint in `src/api/routes/analytics.py`
- [X] T037 [P] [US3] Implement monthly price per m2 evolution line chart using Chart.js in `frontend/src/components/trends/PriceEvolutionChart.tsx`
- [X] T038 [P] [US3] Implement monthly price drops vs sold properties comparative bar chart using Chart.js in `frontend/src/components/trends/DropsVsSalesChart.tsx`
- [X] T039 [P] [US3] Implement 23 canonical zones census table with multi-column sorting (`total`, `active`, `sold`, `missing`, `avg_price`, `avg_m2`, `avg_days_to_sell`, `avg_discount_pct`) and zero speculative metrics in `frontend/src/components/trends/CensusTable.tsx`
- [X] T040 [US3] Implement zone diagnostic modal explaining normalization rules and raw vs canonical counts in `frontend/src/components/modal/ZoneDiagnosticModal.tsx`
- [X] T041 [US3] Integrate Market Trends and Census tab into `frontend/src/App.tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting updates, integration verification, and performance budget validation

- [X] T042 [P] Update repository root scripts and configuration in `package.json`, `.gitignore`, and `README.md`
- [X] T043 [P] End-to-end integration test validating full workflow (filtering, intervals, trends) against real SQLite database in `tests/e2e/test_analytics_frontend_flow.py`
- [X] T044 Validate performance budgets (initial render < 1.0s, filter updates < 100ms, API response < 250ms) per `specs/007-rebuild-analytics-frontend/quickstart.md`
- [X] T045 Execute complete verification walkthrough of quickstart validation scenarios in `specs/007-rebuild-analytics-frontend/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - starts immediately with legacy frontend deletion.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User Story 1 (P1): Can start after Foundational phase (Phase 2).
  - User Story 2 (P2): Can start after Foundational phase (Phase 2).
  - User Story 3 (P3): Can start after Foundational phase (Phase 2).
- **Polish (Final Phase)**: Depends on completion of all user story phases.

### User Story Dependencies

- **User Story 1 (P1)**: Independent of other stories. Delivers the MVP core explorer.
- **User Story 2 (P2)**: Independent of US1/US3 data flow; consumes `AnalyticsService` interval logic. Can proceed in parallel once Foundation is complete.
- **User Story 3 (P3)**: Independent of US1/US2 data flow; consumes `AnalyticsService` trend logic and `ZoneService` census. Can proceed in parallel once Foundation is complete.

### Within Each User Story

- Tests MUST be written and fail before implementation.
- Domain models and schemas before services.
- Services before API route handlers.
- UI child components before main view integrations.
- Story complete and verified before declaring phase done.

### Parallel Opportunities

- **Phase 1**: Dependencies install (T003), styling (T004), and test setup (T005) can run in parallel after project init (T002).
- **Phase 2**: Schema definition (T007), zones endpoint (T008), TypeScript interfaces (T010), and API client (T011) can run in parallel once zone normalizer core logic (T006) is outlined.
- **Phase 3 (US1)**: Test tasks (T013, T014, T015) can run in parallel. Frontend UI components (`SoldStatusSelector` T018, `FilterToolbar` T019, `PropertyCard` T020) can be developed in parallel.
- **Phase 4 (US2)**: Tests (T024, T025, T026) can run in parallel. `IntervalSelector` (T029) and `IntervalMetricCards` (T030) can be built in parallel.
- **Phase 5 (US3)**: Tests (T033, T034) can run in parallel. Chart components (T037, T038) and `CensusTable` (T039) can be built in parallel.
- **Cross-Story**: Once Phase 2 completes, US1, US2, and US3 can proceed concurrently if multiple developers are assigned.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit tests for zone normalization and property filter queries in tests/unit/test_property_service_filters.py"
Task: "Contract test for GET /api/v1/properties asserting schema fields in tests/contract/test_properties_contract.py"
Task: "Component tests for SoldStatusSelector and PropertyCard in frontend/src/components/explorer/__tests__/PropertyCard.test.tsx"

# Launch independent UI components for User Story 1 together:
Task: "Implement 3-state sold status segmented control component in frontend/src/components/explorer/SoldStatusSelector.tsx"
Task: "Implement filter toolbar in frontend/src/components/explorer/FilterToolbar.tsx"
Task: "Implement property card component in frontend/src/components/explorer/PropertyCard.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Unit tests for interval aggregations in tests/unit/test_analytics_service.py"
Task: "Contract test for GET /api/v1/analytics/interval in tests/contract/test_analytics_interval_contract.py"
Task: "Component tests for IntervalSelector presets and IntervalMetricCards in frontend/src/components/intervals/__tests__/IntervalAudit.test.tsx"

# Launch UI components for User Story 2 together:
Task: "Implement interval selector in frontend/src/components/intervals/IntervalSelector.tsx"
Task: "Implement 5 KPI metric cards in frontend/src/components/intervals/IntervalMetricCards.tsx"
```

---

## Parallel Example: User Story 3

```bash
# Launch tests for User Story 3 together:
Task: "Unit and contract test for GET /api/v1/analytics/trends in tests/contract/test_trends_contract.py"
Task: "Component tests for CensusTable sorting and Chart.js rendering in frontend/src/components/trends/__tests__/Trends.test.tsx"

# Launch UI components for User Story 3 together:
Task: "Implement monthly price per m2 evolution line chart in frontend/src/components/trends/PriceEvolutionChart.tsx"
Task: "Implement monthly price drops vs sold properties comparative bar chart in frontend/src/components/trends/DropsVsSalesChart.tsx"
Task: "Implement 23 canonical zones census table in frontend/src/components/trends/CensusTable.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (Purge legacy Next.js frontend, scaffold Vite + React 19 + TS + Tailwind).
2. Complete Phase 2: Foundational (ZoneService normalizer, Pydantic schemas, TypeScript types, API client, Layout).
3. Complete Phase 3: User Story 1 (Property Explorer with 3-state sold filter, zone dropdown, date filter, detail modal).
4. **STOP and VALIDATE**: Test User Story 1 independently against `idealista_properties.db` with curl and browser.
5. Deploy/demo MVP.

### Incremental Delivery

1. Complete Setup + Foundational → Core greenfield client and backend services ready.
2. Add User Story 1 → Test independently → Explorer functional with sold badges and filter controls (MVP!).
3. Add User Story 2 → Test independently → Interval audit section functional with calendar and zone breakdown.
4. Add User Story 3 → Test independently → Trends charts and complete 23-zone census table functional.
5. Phase 6 Polish → Run quickstart validation scenarios and performance benchmarks.

---

## Notes

- `[P]` tasks = different files, no dependencies on uncompleted work.
- `[Story]` label (`[US1]`, `[US2]`, `[US3]`) maps task to specific user story for full traceability.
- Every user story is independently completable and testable.
- Zero cartography / map libraries: screen estate is completely devoted to tabular, card, and metric density.
- Zero speculative investor yields or synthetic formulas: only empirical market data.
