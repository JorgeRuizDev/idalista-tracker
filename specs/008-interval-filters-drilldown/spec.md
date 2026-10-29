# Feature Specification: Interactive Interval KPI & Zone Filters with Property Drilldown

**Feature Branch**: `008-interval-filters-drilldown`  
**Created**: 2026-10-25  
**Status**: Draft  
**Input**: User description: "Quiero que los primeros botones (inclusiones, ventas, etc) actúen como filtro. Lo mismo para las zonas, qiero que actúe como filtro. Y por último, me gustaría poder ver los resultados del filtro! Es importante que reutilice el componente de la página principal, no quiero reinventar la rueda."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interactive Metric Cards as Dynamic Filters (Priority: P1)

As a real estate analyst reviewing market dynamics, I want to click on the KPI summary cards (Inclusiones, Ventas Concluidas, Rebajas de Precio, Aumentos de Precio) so that the application instantly filters and displays only the properties that match that specific market movement during the selected interval.

**Why this priority**: The top-level KPI cards are the primary entry point to understanding market trends. Enabling one-click filtering transforms passive reporting cards into an interactive exploration tool.

**Independent Test**:
In the Interval Audit view, click on the "Ventas Concluidas" card. The card indicates an active/selected state, and the drilldown results section immediately loads and displays only properties sold within the active interval date range.

**Acceptance Scenarios**:
1. **Given** the user is viewing an interval (e.g., July 2026), **When** the user clicks the "Inclusiones" card, **Then** the card becomes visibly active (distinct border/highlight) and the property grid displays properties first captured within that interval.
2. **Given** the "Inclusiones" card is active, **When** the user clicks the "Ventas Concluidas" card, **Then** the active selection switches to "Ventas Concluidas", and the property grid updates to show properties sold within that interval.
3. **Given** an active metric card filter, **When** the user clicks the currently active card a second time, **Then** the filter is toggled off (deselected), returning the view to the unfiltered interval overview.
4. **Given** the user views the "Días Medios de Venta" card, **When** interacted with, **Then** it either filters sold properties ordered by absorption time or clearly functions as an informational aggregate indicator.

---

### User Story 2 - Territorial Zone Table Interactive Filtering (Priority: P1)

As an analyst, I want to click any zone row in the "Dinámica Territorial por Zona" table so that the property results narrow down to properties belonging to that specific neighborhood/zone for the selected interval.

**Why this priority**: Zone analysis is fundamental in real estate. Users need to isolate specific districts (e.g., Gamonal, Burgos Centro) without leaving the interval audit context.

**Independent Test**:
In the territorial breakdown table, click on the row for "Gamonal". The row highlights as selected, and the results grid updates to show only properties located in "Gamonal".

**Acceptance Scenarios**:
1. **Given** the territorial table is displayed, **When** the user clicks on a zone row (e.g., "Burgos Centro"), **Then** that row is highlighted as selected, and the property results grid reflects only properties from that zone.
2. **Given** a zone is currently selected, **When** the user clicks another zone row (e.g., "Gamonal"), **Then** the active zone selection switches to the newly selected row.
3. **Given** a zone is currently selected, **When** the user clicks that same row again or clicks a clear zone button, **Then** the zone filter is removed and properties from all zones are shown.

---

### User Story 3 - Results Display Reusing Main Explorer Grid Component (Priority: P2)

As a user, I want the filtered results to be presented using the familiar property card grid from the main explorer page, including images, prices, discount badges, square footage, and pagination, so that I have a consistent and rich inspection experience without unnecessary visual discrepancies.

**Why this priority**: Directly honors the user requirement ("reutilice el componente de la página principal, no quiero reinventar la rueda"), guaranteeing UX consistency, zero learning curve, and full feature parity with the main property cards.

**Independent Test**:
Filter by "Rebajas de Precio". The results section below renders the exact property card layout seen in the main explorer, complete with photo thumbnails, price tag, discount percentage badge, surface area, and pagination controls.

**Acceptance Scenarios**:
1. **Given** a metric and/or zone filter is applied, **When** the results are loaded, **Then** they appear in a responsive grid using the exact same property card format as the main explorer tab.
2. **Given** more results exist than the items per page limit, **When** the user navigates pages using the pagination controls, **Then** subsequent pages load smoothly with the active filters preserved.
3. **Given** a filter combination yields zero matching properties, **When** the results render, **Then** a friendly empty-state message informs the user and offers an action to reset the filters.

---

### User Story 4 - Multi-Dimensional Combinations & Property Detail Modal (Priority: P2)

As an analyst, I want to combine a KPI metric filter with a Zone filter (e.g., "Rebajas de Precio" in "Gamonal"), and click on any property card to open the comprehensive property detail modal with price history.

**Why this priority**: Combining metrics and geographic boundaries enables high-value micro-market audits. Opening the modal allows full verification of why an asset is classified as a price drop or inclusion.

**Independent Test**:
Click "Rebajas de Precio" and select "Burgos Centro". Verify the list displays price-dropped properties in Burgos Centro during the interval. Click a property card and verify the modal opens displaying its full timeline.

**Acceptance Scenarios**:
1. **Given** "Rebajas de Precio" is active, **When** the user clicks the "Gamonal" zone row, **Then** the results display only properties in Gamonal that experienced price reductions within the selected date interval.
2. **Given** filtered property cards are visible, **When** the user clicks any card, **Then** the standard Property Detail Modal opens displaying complete photos, characteristics, and historical price movements.
3. **Given** both metric and zone filters are applied, **When** the user changes the interval dates (e.g., switching from July 2026 to August 2026), **Then** the metrics, table, and filtered results recompute dynamically for the new period while keeping filter intentions intact.

---

### Edge Cases

- **Zero results for filter combo**: If a zone has 0 sales or 0 price drops in the period, the system displays an intuitive empty state with a "Reset Filters" action, rather than an error or broken layout.
- **Deselection behavior**: Clicking an active card or active table row toggles the filter off. A top-level "Clear all filters" / "Ver todos" control must also be available when any filter is active.
- **Interval date switching**: If a filter is active and the user selects a new interval date preset or custom range, the drilldown query must refresh with the new date boundaries.
- **Large result sets**: If an interval has hundreds of inclusions, pagination must prevent browser slowdown and preserve scroll position or smoothly reset to page 1 upon changing filters.
- **Partial or missing data**: Properties without photos, unknown zones, or missing historical dates must render graceful fallback badges without breaking the grid.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to click any of the primary interval KPI cards ("Inclusiones", "Ventas Concluidas", "Rebajas de Precio", "Aumentos de Precio") to activate that category as a dynamic filter.
- **FR-002**: Active KPI filter cards MUST display a prominent visual state (e.g., accent border, glowing ring, or distinctive background) indicating they are currently filtering the dataset.
- **FR-003**: Clicking an already active KPI card MUST deactivate it, resetting the metric filter to show all interval properties.
- **FR-004**: The system MUST allow users to click any zone row in the territorial dynamic table to filter properties by that specific zone.
- **FR-005**: The selected zone row in the territorial table MUST remain visually highlighted while the filter is active.
- **FR-006**: Clicking the currently selected zone row MUST deactivate the zone filter.
- **FR-007**: The system MUST support combining an active KPI metric filter with an active zone filter (e.g., "Ventas Concluidas" AND "Gamonal").
- **FR-008**: The system MUST render the filtered results using the existing main property explorer card grid component (`PropertyGrid`), ensuring full visual and behavioral consistency.
- **FR-009**: The property cards in the drilldown grid MUST open the existing comprehensive Property Detail Modal (`PropertyDetailModal`) when clicked.
- **FR-010**: The drilldown section MUST display an active filter bar showing current filter chips (e.g., [Filtro: Rebajas de Precio] [Zona: Gamonal] [Periodo: Julio 2026]), the total number of matching properties, and a "Clear filters" action.
- **FR-011**: The drilldown results grid MUST support pagination, resetting to page 1 whenever any filter condition changes.
- **FR-012**: When no metric or zone filter is active, the system MUST show an informative summary state or the complete list of properties active during the interval, allowing immediate exploration.

---

### Key Entities *(include if feature involves data)*

- **IntervalFilterState**: Represents the active drilldown filter parameters:
  - `metricFilter`: Selected KPI movement (`'all'`, `'inclusions'`, `'sales'`, `'price_drops'`, `'price_increases'`).
  - `selectedZone`: Selected canonical zone name or `'all'`.
  - `dateRange`: Start date (`YYYY-MM-DD`) and end date (`YYYY-MM-DD`) from the active interval.
- **DrilldownPropertySummary**: Property record matching the interval and filter criteria, including title, zone, current price, original price, discount percentage/amount, sold status, and days on market.
- **TerritorialZoneMetric**: Aggregated metrics per zone (inclusions, sales count, avg days to sell, avg discount %, avg sale price, avg price per m2) displayed in the table and used for cross-filtering.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can filter interval properties by clicking any KPI card in 1 single click, with results rendering in under 1 second.
- **SC-002**: Users can filter interval properties by zone in 1 single click from the territorial breakdown table.
- **SC-003**: 100% of property cards rendered in the drilldown view maintain identical design, data fields, and interaction capabilities as the main page explorer.
- **SC-004**: Users can clear any or all applied filters with a single click, instantly returning to the general interval view.
- **SC-005**: All property cards in the drilldown results correctly open the full property inspection modal on click without navigation away from the interval analysis.

---

## Assumptions

- **Component Reuse**: The existing frontend components (`PropertyGrid`, `PropertyCard`, `PropertyDetailModal`) are modular and capable of receiving properties from the interval drilldown without modifying their core rendering logic.
- **Backend Filter Support**: The property listing service/API can filter by date interval, status (active/sold), zone, and price movement types (price drop / price increase / inclusion date).
- **Default Display**: In the absence of an explicit KPI selection, either all properties touched by the interval or the first primary KPI ("Inclusiones") can be presented as the default view, or a clear prompt invites the user to click a KPI card.
- **Device Support**: The interactive cards and table drilldown adapt responsively across desktop, tablet, and mobile screen sizes.
