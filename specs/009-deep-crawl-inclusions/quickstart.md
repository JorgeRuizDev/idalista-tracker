# Quickstart & Verification: Automated Deep Crawl for Inclusions and Pending Listings

**Feature Branch**: `009-deep-crawl-inclusions`  
**Date**: 2026-10-25  
**Spec**: [spec.md](./spec.md)  

## Verification Scenarios

### Scenario 1: Verify Ingestion Marks New Inclusions as `pending`

1. Start the backend application:
   ```bash
   uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. Ingest a mock batch of new properties:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/properties/batch" \
     -H "Content-Type: application/json" \
     -d '{"properties": [{"idealista_id": "test_inclusion_01", "property_url": "https://www.idealista.com/inmueble/test_inclusion_01/", "title": "Piso en Test", "price": 250000}]}'
   ```
3. Query the pending queue:
   ```bash
   curl "http://localhost:8000/api/v1/crawl/pending-details?priority_only=false"
   ```
4. **Expected Outcome**:
   - `test_inclusion_01` appears in the pending items list with `detail_status = 'pending'`.

---

### Scenario 2: Verify Deep Analysis Snapshot Ingestion & Local Photo Storage

1. Submit a simulated snapshot for `test_inclusion_01`:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/crawl/details/test_inclusion_01" \
     -H "Content-Type: application/json" \
     -d '{
       "source_engine": "chrome_extension",
       "delisted": false,
       "full_description": "Piso completamente exterior con mucha luz natural y acabados modernos.",
       "neighborhood": "Chamberí",
       "district": "Chamberí",
       "city": "Madrid",
       "features": {"general": ["Calefacción", "Ascensor"]},
       "photos": [
         {"original_url": "https://via.placeholder.com/600x400.jpg", "sequence_index": 0, "caption": "Salón"}
       ]
     }'
   ```
2. Verify response confirms snapshot persistence:
   ```json
   {
     "status": "success",
     "idealista_id": "test_inclusion_01",
     "detail_status": "completed"
   }
   ```
3. Query the property snapshot:
   ```bash
   curl "http://localhost:8000/api/v1/properties/test_inclusion_01/snapshot"
   ```
4. **Expected Outcome**:
   - HTTP 200 response with `detail_status = 'completed'`.
   - `full_description` and `features` are populated.
   - `photos` array contains local relative URLs under `/media/properties/...`.
   - The photo file exists on disk under `data/media/properties/test_inclusion_01/`.

---

### Scenario 3: Verify Automated Crawl Execution in Extension

1. Build and load the Chrome extension:
   ```bash
   cd extension && npm run build
   ```
2. Open extension popup in Chrome:
   - Notice the **"Fichas pendientes"** counter displaying existing pending listings.
   - Click **"Iniciar Rastreo"** (or **"Analizar pendientes"**).
3. Observe execution:
   - The extension starts Discovery (or directly starts Deep Analysis).
   - In-depth extraction iterates through the pending queue sequentially.
   - Background tabs open with `active: false`, extract photos and text, submit to backend, and close automatically.
   - Pacing applies 2.5–5.0s pauses between tabs.
   - Counter decrements until all pending listings are analyzed.

---

### Scenario 4: Verify Frontend Property Detail Modal

1. Start frontend development server:
   ```bash
   cd frontend && npm run dev
   ```
2. Navigate to `http://localhost:5173/`.
3. Click on a property card that has `detail_status = 'completed'`.
4. **Expected Outcome**:
   - Modal displays the green badge: *"Ficha completa verificada"*.
   - Photo gallery carousel renders all downloaded photos with navigation arrows, counter, and thumbnail strip.
   - Full description section displays the multiline text.
   - Structured tags display features (e.g., "Calefacción", "Ascensor").
   - Click on a property with `pending` status displays the amber badge *"Pendiente de análisis profundo"*.
