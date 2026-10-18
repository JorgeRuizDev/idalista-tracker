# Quickstart Validation Guide: Rebuild Property & Market Analytics Frontend

**Feature**: Rebuild Property & Market Analytics Frontend  
**Branch**: `007-rebuild-analytics-frontend`  
**Date**: 2026-10-18  

---

## 1. Prerequisites

- Python 3.11+ with existing virtual environment (`.venv`).
- Node.js 18+ and `npm`.
- SQLite database `idealista_properties.db` present in the project root.

---

## 2. Step 1: Deletion of Legacy Frontend

Before writing any new code, the legacy frontend directory must be completely removed:

```powershell
# Stop any running frontend dev server
# Remove old Next.js frontend directory
Remove-Item -Recurse -Force frontend
```

Verify that `frontend/` is gone:
```powershell
Test-Path frontend # Must return False
```

---

## 3. Step 2: Initialize New Frontend from Scratch

Scaffold the fresh, modern client application:

```powershell
# Create new Vite + React + TypeScript application in frontend/
npm create vite@latest frontend -- --template react-ts

cd frontend
npm install
npm install lucide-react chart.js react-chartjs-2
npm install -D tailwindcss @tailwindcss/vite
```

Configure Tailwind CSS in `frontend/src/index.css` and start the dev server:

```powershell
npm run dev
# Starts at http://localhost:5173
```

---

## 4. Step 3: Backend API Endpoints Verification

Verify that the FastAPI backend serves the required contract endpoints:

```powershell
# Start FastAPI backend (if not running)
python -m uvicorn src.main:app --port 8000 --reload
```

Test endpoints via curl or Python:

```powershell
# 1. Verify zones census (23 normalized zones)
curl http://localhost:8000/api/v1/zones

# 2. Verify sold properties filtering
curl "http://localhost:8000/api/v1/properties?status=sold&limit=5"

# 3. Verify interval audit endpoint
curl "http://localhost:8000/api/v1/analytics/interval?start_date=2026-07-01&end_date=2026-07-31"

# 4. Verify monthly trends
curl http://localhost:8000/api/v1/analytics/trends
```

---

## 5. Step 4: End-to-End Validation Scenarios

### Scenario 1: Property Explorer & Sold Status Filtering (P1)
1. Open the frontend in your browser (`http://localhost:5173`).
2. Verify that there is **NO map** anywhere on the screen. The property grid occupies the full width.
3. Click on the **"Solo Vendidos"** segmented control:
   - Check that only properties with the red `VENDIDO` badge appear.
   - Verify that each card displays:
     - Date of sale (`Vendido el YYYY-MM-DD`).
     - Time on market (`Tardó X días en venderse`).
     - Final negotiation discount (`-X% (-X €)`).
4. Select a normalized zone from the dropdown (e.g., `Gamonal - San Bruno - G9`):
   - Confirm that the count matches the zone census and results adjust instantly.
5. Select a date range (`2026-07-01` to `2026-08-31`):
   - Confirm that only properties sold or listed within that window are displayed.

### Scenario 2: Time Interval Audit & Calendar (P2)
1. Click on the **"Auditoría por Intervalos & Calendario"** tab.
2. Click on the preset button **"Julio 2026"**:
   - Check that the 5 metric cards show:
     - Inclusiones: ~228
     - Ventas / Exclusiones: ~286
     - Rebajas de Precio: ~97 (-5.6% media)
     - Aumentos de Precio: ~13 (+5.7% media)
     - Tiempo Medio hasta Venta: ~67 días
3. Check the breakdown table below the cards:
   - Confirm that rows display sales, days to sell, and average drop percentage per neighborhood for July 2026.
4. Input custom dates in the calendar inputs (e.g., `2026-08-01` to `2026-09-15`) and click *"Analizar Intervalo"*:
   - Confirm that all metrics dynamically recompute.

### Scenario 3: Macro Price Evolution & Complete Zones Census (P3)
1. Click on the **"Evolución de Precios & Rebajas"** tab.
2. Confirm the line chart renders the monthly trend in Burgos (€/m² from 2.167 €/m² to 2.297 €/m²).
3. Confirm the bar chart displays price drops vs sold properties volume.
4. Inspect the census table:
   - Confirm all 23 zones are listed with their real database counts and zero corrupt strings.
   - Confirm there are no artificial investor profiles or fake yields displayed.
