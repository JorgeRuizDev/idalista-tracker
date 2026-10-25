# Quickstart & Verification Guide: Interactive Interval Drilldown

**Feature**: `008-interval-filters-drilldown`  
**Date**: 2026-10-25

---

## 1. Prerequisites & Environment Setup

1. **Backend**:
   - Python virtual environment activated (`.venv`).
   - SQLite database populated (`data/tracker.db`) or test database fixtures.
2. **Frontend**:
   - Node.js 20+ installed.
   - Frontend dependencies installed (`cd frontend && npm install`).

---

## 2. Automated Contract & E2E Tests

### Test 1: Backend Contract for `movement_type` Filtering
Run contract tests validating `GET /api/v1/properties` with `movement_type`:

```bash
pytest tests/contract/test_interval_properties_contract.py -v
```

**Expected Results**:
- `GET /api/v1/properties?movement_type=inclusions&date_from=2026-07-01&date_to=2026-07-31` returns 200 OK and properties with `first_seen_at` in July 2026.
- `GET /api/v1/properties?movement_type=sales&date_from=2026-07-01&date_to=2026-07-31` returns 200 OK and only properties with `status=sold` and `sold_at` in July 2026.
- `GET /api/v1/properties?movement_type=price_drops&zone=Gamonal` returns 200 OK and properties with price drops in Gamonal.

### Test 2: Frontend Unit & Component Tests
Run Vitest for the interactive cards, table row selection, and grid drilldown:

```bash
cd frontend && npm test
```

**Expected Results**:
- `IntervalMetricCards.test.tsx`: Clicking a metric card triggers `onSelectMetric` with the card's metric key, applying active highlight classes.
- `IntervalZoneTable.test.tsx`: Clicking a table row triggers `onSelectZone`, highlighting that row.
- `IntervalDrilldown.test.tsx`: Verify `PropertyGrid` is rendered with matching filtered properties.

---

## 3. Manual Interactive Verification

1. **Start the Development Servers**:
   ```bash
   # Terminal 1: Backend
   python -m uvicorn src.main:app --reload --port 8000

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

2. **Navigate to Interval Audit**:
   - Open browser at `http://localhost:5173`.
   - Click the **"Auditoría por Intervalos"** tab in the top navigation.

3. **Verify Interactive Metric Card Filtering**:
   - Click on the **"Rebajas de Precio"** card (showing count e.g. 97).
   - Observe the card receives an active visual highlight ring.
   - Scroll down to the drilldown section: verify the header displays `"Filtro: Rebajas de Precio"`.
   - Inspect the property cards: verify every card displays a price drop badge and belongs to the interval.
   - Click the **"Rebajas de Precio"** card again: observe it deselects and returns to the general interval view.

4. **Verify Territorial Table Row Filtering**:
   - Click on any zone row in the table (e.g., **"Gamonal"**).
   - Verify the row is highlighted and the drilldown displays only properties in "Gamonal".
   - Click **"Ventas Concluidas"** card: verify the drilldown now displays only properties sold in Gamonal during that period.

5. **Verify Component Reuse & Property Detail Modal**:
   - Verify the property cards look 100% identical to the cards in the main "Explorador" tab.
   - Click on any card: verify the full **Property Detail Modal** opens with complete photo carousel and historical price timeline.
   - Close modal: verify you remain smoothly on the Interval Audit page without losing filter state.
