# Phase 1 Quickstart Guide: Full Property Snapshot Crawler

**Feature**: Full Property Snapshot Crawler  
**Branch**: `006-full-property-crawl`  
**Date**: 2026-10-17  

This document describes end-to-end runnable scenarios to validate database migration, legacy record isolation, local photo gallery downloads, hybrid crawl execution, anti-bot mitigation, and discard transitions.

---

## Prerequisites & Environment Setup

1. **Python Dependencies**:
   Install backend dependencies including Playwright browser binaries:
   ```powershell
   uv pip install playwright
   playwright install chromium
   ```

2. **Verify Media Storage Directory**:
   Ensure `data/media/properties` directory exists and has write permissions:
   ```powershell
   New-Item -ItemType Directory -Path data/media/properties -Force
   ```

3. **Run Database Migration**:
   Apply schema extension and classify all existing listings as `legacy`:
   ```powershell
   python -m src.database.migrate_detail_crawler
   ```

4. **Verify Legacy Isolation**:
   Confirm that all pre-existing properties in the SQLite database have `detail_status = 'legacy'`:
   ```powershell
   python -c "from src.database.session import SessionLocal; from src.database.models import Property; s = SessionLocal(); total = s.query(Property).count(); legacy = s.query(Property).filter_by(detail_status='legacy').count(); print(f'Legacy: {legacy}/{total}'); s.close()"
   ```
   **Expected**: 100% of existing properties report `detail_status = 'legacy'`.

---

## Validation Scenario 1: Ingestion Isolation (New Listing Queuing)

**Objective**: Verify that newly discovered properties enter `pending` status while existing listings remain untouched.

1. **Simulate Ingestion of a New Property**:
   ```powershell
   python -c "from src.services.property_service import PropertyService; from src.database.session import SessionLocal; s = SessionLocal(); svc = PropertyService(s); p = svc.create_property({'idealista_id': 'test_999001', 'title': 'Piso nuevo en Chamberi', 'current_price': 350000, 'property_url': 'https://www.idealista.com/inmueble/test_999001/', 'location': 'Madrid'}); print('Detail Status:', p.detail_status); s.close()"
   ```
2. **Expected Outcome**:
   - `Detail Status: pending`
   - `backend_attempts: 0`
   - `fallback_to_extension: False`

---

## Validation Scenario 2: Backend Playwright Full Snapshot Crawl

**Objective**: Verify that the backend crawler extracts description, location attributes, and downloads all photo binaries locally.

1. **Trigger Backend Detail Crawl for Test Property**:
   ```powershell
   python -m src.crawler.detail_service --property-id test_999001
   ```
2. **Inspect Database & Media Disk**:
   - Check status and snapshot:
     ```powershell
     python -c "from src.database.session import SessionLocal; from src.database.models import Property; s = SessionLocal(); p = s.query(Property).filter_by(idealista_id='test_999001').first(); print('Status:', p.detail_status); print('Photos count:', p.snapshot.photos_count); s.close()"
     ```
   - Check local media directory:
     ```powershell
     Get-ChildItem -Path data/media/properties/test_999001
     ```
3. **Expected Outcome**:
   - `Status: completed`
   - Photos stored as `.jpg` files under `data/media/properties/test_999001/`
   - Database contains `PropertySnapshot` with full description and location hierarchy.

---

## Validation Scenario 3: Anti-Bot Challenge & Chrome Extension Fallback

**Objective**: Verify that backend bot challenges flag the listing for extension pickup, and the extension successfully uploads the snapshot.

1. **Simulate Bot Challenge on Backend**:
   Run crawl with simulated Cloudflare challenge response.
   - Status remains `pending`
   - `fallback_to_extension` set to `True`
   - `DetailCrawlAttempt` logged with `challenge_detected = 'cloudflare'`
2. **Poll Pending Queue via API**:
   ```powershell
   curl http://localhost:8000/api/crawl/pending-details
   ```
   **Expected**: Listing `test_999001` appears in the pending queue with `property_url`.
3. **Submit Snapshot from Extension**:
   ```powershell
   curl -X POST http://localhost:8000/api/crawl/details/test_999001 -H "Content-Type: application/json" -d '{\"source_engine\": \"chrome_extension\", \"full_description\": \"Test description\", \"neighborhood\": \"Goya\", \"city\": \"Madrid\", \"photos\": [{\"original_url\": \"https://img3.idealista.com/test.jpg\", \"sequence_index\": 0}]}'
   ```
4. **Expected Outcome**:
   - API returns `status: success`
   - Property transitions to `detail_status = 'completed'`

---

## Validation Scenario 4: Discard on Confirmed Delisting (404/Removed)

**Objective**: Verify that delisted pages immediately transition to `discarded`.

1. **Simulate Crawl on 404 / Delisted Listing**:
   ```powershell
   python -m src.crawler.detail_service --simulate-404 --property-id test_999002
   ```
2. **Verify Database State**:
   - `detail_status: discarded`
   - `discard_reason: delisted`
   - `DetailCrawlAttempt` contains `outcome: delisted`, `http_status: 404`

---

## Validation Scenario 5: Discard on 3 Failed Extension Attempts

**Objective**: Verify the 3-attempt discard ceiling for the extension fallback tier.

1. **Send 3 consecutive failure signals via API**:
   ```powershell
   for ($i = 1; $i -le 3; $i++) {
     curl -X POST http://localhost:8000/api/crawl/details/test_999003/fail -H "Content-Type: application/json" -d '{\"source_engine\": \"chrome_extension\", \"error_type\": \"bot_challenge\", \"error_message\": \"Captcha not solved\"}'
   }
   ```
2. **Verify Database State**:
   - `extension_attempts: 3`
   - `detail_status: discarded`
   - `discard_reason: extension_retries_exhausted`

---

## Validation Scenario 6: Manual Operator Re-Queue

**Objective**: Verify that an administrator can rescue a discarded listing.

1. **Trigger Re-Queue API**:
   ```powershell
   curl -X POST http://localhost:8000/api/properties/test_999003/requeue-detail
   ```
2. **Verify Outcome**:
   - `detail_status: pending`
   - `discard_reason: null`
   - `extension_attempts: 0`
   - Ready for re-crawling.
