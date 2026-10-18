---
description: "Task list for Full Property Snapshot Crawler feature implementation"
---

# Tasks: Full Property Snapshot Crawler

**Feature Branch**: `006-full-property-crawl`  
**Input**: Design documents from `/specs/006-full-property-crawl/` (`plan.md`, `spec.md`, `data-model.md`, `contracts/detail-crawl-api.md`, `research.md`, `quickstart.md`)  
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/`  
**Tests**: Automated tests are REQUIRED per Constitution Principle II (Testing Standards) and feature specifications.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependency management, and media storage configuration.

- [X] T001 Configure Playwright dependencies and Chromium browser install instructions in `pyproject.toml`
- [X] T002 Configure persistent media storage root directory path `data/media/properties` in `src/config.py`
- [X] T003 Mount static media file delivery endpoint at `/media` using `fastapi.staticfiles.StaticFiles` in `src/main.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema extensions, shared Pydantic schemas, and media storage service required across all user stories.

**⚠️ CRITICAL**: No user story work can begin until this foundational phase is complete.

- [X] T004 Extend `Property` model in `src/database/models.py` with verbatim fields: `detail_status: String(20) NOT NULL DEFAULT 'legacy'` (indexed, enum: `'legacy'`, `'pending'`, `'completed'`, `'discarded'`), `detail_updated_at: DateTime NULL`, `discard_reason: String(50) NULL` (enum: `'delisted'`, `'extension_retries_exhausted'`, `'manual_discard'`), `backend_attempts: Integer NOT NULL DEFAULT 0`, `extension_attempts: Integer NOT NULL DEFAULT 0`, and `fallback_to_extension: Boolean NOT NULL DEFAULT False`
- [X] T005 [P] Define `PropertySnapshot`, `PropertyPhoto`, and `DetailCrawlAttempt` SQLAlchemy models with verbatim constraints in `src/database/models.py`:
  - `PropertySnapshot` (`id: Integer PK Auto`, `property_id: Integer FK to property.id, Unique, NOT NULL, cascade on delete`, `crawled_at: DateTime NOT NULL DEFAULT UTC Now`, `source_engine: String(30) NOT NULL ['backend_playwright' | 'chrome_extension']`, `full_description: Text NOT NULL`, `neighborhood: String(255) NULL`, `district: String(255) NULL`, `city: String(255) NULL`, `province: String(255) NULL`, `latitude: Float NULL`, `longitude: Float NULL`, `features: JSON NULL`, `photos_count: Integer NOT NULL DEFAULT 0`)
  - `PropertyPhoto` (`id: Integer PK Auto`, `property_id: Integer FK to property.id, NOT NULL, cascade on delete`, `local_file_path: String(500) NOT NULL`, `original_url: String(1000) NOT NULL`, `sequence_index: Integer NOT NULL DEFAULT 0`, `caption: String(255) NULL`, `file_size_bytes: Integer NULL`, `content_type: String(50) NOT NULL DEFAULT 'image/jpeg'`, `created_at: DateTime NOT NULL DEFAULT UTC Now`, UniqueConstraint on `(property_id, sequence_index)`)
  - `DetailCrawlAttempt` (`id: Integer PK Auto`, `property_id: Integer FK to property.id, NOT NULL, cascade on delete`, `attempt_source: String(20) NOT NULL ['backend' | 'extension']`, `attempt_number: Integer NOT NULL DEFAULT 1`, `http_status: Integer NULL`, `challenge_detected: String(30) NOT NULL DEFAULT 'none' ['none' | 'captcha' | 'cloudflare' | 'rate_limit']`, `outcome: String(30) NOT NULL ['success' | 'retryable_error' | 'delisted' | 'permanent_failure']`, `error_message: Text NULL`, `created_at: DateTime NOT NULL DEFAULT UTC Now`)
- [X] T006 [P] Create database migration script `src/database/migrate_detail_crawler.py` to add new columns to `property`, create `property_snapshot`, `property_photo`, and `detail_crawl_attempt` tables, and set pre-existing property rows to `detail_status = 'legacy'`
- [X] T007 [P] Define Pydantic request and response schemas in `src/api/schemas.py` for `PropertySnapshotResponse`, `PropertyPhotoResponse`, `PendingDetailsResponse`, `DetailSnapshotSubmitRequest`, `DetailCrawlFailRequest`, `RequeueDetailResponse`, and `DiscardDetailResponse`
- [X] T008 Implement local image downloading and disk persistence pipeline with concurrency limit = 3 and relative path formatting in `src/services/media_service.py`

**Checkpoint**: Core models, migrations, media storage pipeline, and API schemas are ready. User story implementation can now begin.

---

## Phase 3: User Story 1 - Detail Crawl Lifecycle and Scope Isolation (Priority: P1) 🎯 MVP

**Goal**: Newly ingested properties automatically receive `detail_status = 'pending'` and are queued for full detail crawling, while pre-existing historical records remain protected as `legacy` and excluded from crawling.

**Independent Test**: Verify that running the migration classifies 100% of pre-existing database records as `legacy`, while newly created properties via `PropertyService` or `CrawlerService` are initialized with `detail_status = 'pending'`, `backend_attempts = 0`, `extension_attempts = 0`, and `fallback_to_extension = False`.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US1] Unit test for property detail lifecycle state transitions (`legacy`, `pending`, `completed`, `discarded`) and discard reason validation in `tests/unit/test_detail_lifecycle.py`
- [X] T010 [P] [US1] Integration test for migration script verifying all pre-existing properties receive `detail_status = 'legacy'` and are excluded from pending crawl queues in `tests/integration/test_legacy_migration.py`

### Implementation for User Story 1

- [X] T011 [US1] Update property ingestion in `src/services/property_service.py` (`_process_single_property`) to initialize newly discovered properties with verbatim fields: `detail_status = 'pending'`, `backend_attempts = 0`, `extension_attempts = 0`, and `fallback_to_extension = False`
- [X] T012 [US1] Update email crawler property creation in `src/crawler/service.py` (`_create_property`) to initialize new properties with `detail_status = 'pending'`, `backend_attempts = 0`, `extension_attempts = 0`, and `fallback_to_extension = False`
- [X] T013 [US1] Implement detail crawl state transition helpers (`mark_detail_completed`, `mark_detail_discarded`, `record_backend_attempt`, `record_extension_attempt`) with discard reason validation in `src/services/property_service.py`

**Checkpoint**: At this point, User Story 1 is functional. Newly discovered properties queue as `pending` while existing listings are safely isolated as `legacy`.

---

## Phase 4: User Story 2 - Full Listing Snapshot Extraction (Priority: P1)

**Goal**: Crawl pending properties via Playwright stealth browser automation, extracting full description, granular location hierarchy, and physical features, while downloading and persisting all photo binaries locally.

**Independent Test**: Trigger a detail crawl on a `pending` property URL, verify that the complete photo gallery is downloaded to `data/media/properties/{idealista_id}/`, `PropertySnapshot` is stored in the database, `Property.detail_status` transitions to `completed`, and `GET /api/v1/properties/{property_id}/snapshot` returns the snapshot.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T014 [P] [US2] Unit test for HTML DOM and JSON-LD parsing of description text, location hierarchy, features JSON, and gallery photo URLs in `tests/unit/test_detail_parser.py`
- [X] T015 [P] [US2] Integration test for Playwright crawler extraction, photo downloading, and database snapshot persistence in `tests/integration/test_snapshot_storage.py`
- [X] T016 [P] [US2] Contract test for property snapshot retrieval endpoint `GET /api/v1/properties/{property_id}/snapshot` in `tests/contract/test_property_snapshot_api.py`

### Implementation for User Story 2

- [X] T017 [P] [US2] Implement HTML/DOM & JSON-LD parser in `src/crawler/detail_parser.py` extracting `full_description`, `neighborhood`, `district`, `city`, `province`, `latitude`, `longitude`, `features` JSON, and gallery image URLs with caption and sequence index
- [X] T018 [US2] Implement Playwright stealth crawler engine in `src/crawler/detail_crawler.py` using `--disable-blink-features=AutomationControlled`, realistic headers, photo gallery hydration interaction, and DOM snapshot capture
- [X] T019 [US2] Implement snapshot persistence orchestration in `src/services/property_service.py` (`save_property_snapshot`) to persist `PropertySnapshot`, download photos via `MediaService`, save `PropertyPhoto` rows, update `detail_status = 'completed'`, and set `detail_updated_at`
- [X] T020 [US2] Implement REST API endpoint `GET /api/v1/properties/{property_id}/snapshot` in `src/api/routes/properties.py` returning full snapshot data, features JSON, and local photo URLs (`/media/...`)
- [X] T021 [US2] Implement scheduled background worker in `src/crawler/scheduler.py` to poll pending detail properties and trigger sequential detail crawls with 8–15s jittered delays

**Checkpoint**: At this point, User Stories 1 and 2 are functional. The autonomous crawler captures full listing snapshots and local photo galleries for pending listings.

---

## Phase 5: User Story 3 - Anti-Bot Friction Mitigation and Failure Handling (Priority: P2)

**Goal**: Mitigate anti-bot friction using polite request pacing and adaptive cooldowns; delegate blocked listings to the Chrome extension fallback tier; and enforce strict discard state transitions (delisted 404/410 or 3 failed extension attempts).

**Independent Test**: Mock a 404 delisted page and verify immediate transition to `discarded` with `discard_reason = 'delisted'`. Mock Cloudflare/CAPTCHA challenge on backend, verify `fallback_to_extension = True`, fetch listing via `GET /api/v1/crawl/pending-details`, simulate 3 failed extension attempts via `POST /api/v1/crawl/details/{idealista_id}/fail`, and verify transition to `discarded` with `discard_reason = 'extension_retries_exhausted'`.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T022 [P] [US3] Unit test for bot challenge detection (Cloudflare, CAPTCHAs, HTTP 429) and adaptive pacing / cooldown calculations in `tests/unit/test_bot_friction.py`
- [X] T023 [P] [US3] Contract test for extension fallback endpoints `GET /api/v1/crawl/pending-details` and `POST /api/v1/crawl/details/{idealista_id}` in `tests/contract/test_extension_fallback_api.py`
- [X] T024 [P] [US3] Contract test for extension failure reporting endpoint `POST /api/v1/crawl/details/{idealista_id}/fail` and 3-attempt discard transition in `tests/contract/test_fail_endpoint.py`

### Implementation for User Story 3

- [X] T025 [P] [US3] Implement anti-bot challenge classification, jittered pacing (8–15s), and adaptive cooldown handling in `src/crawler/detail_crawler.py`
- [X] T026 [US3] Implement backend attempt logging and fallback delegation in `src/services/property_service.py` to log `DetailCrawlAttempt` and set `fallback_to_extension = True` when bot challenges are detected or backend attempts exceed threshold
- [X] T027 [US3] Implement REST API endpoint `GET /api/v1/crawl/pending-details` in `src/api/routes/crawl.py` returning properties pending detail crawl (prioritizing `fallback_to_extension = True`)
- [X] T028 [US3] Implement REST API endpoint `POST /api/v1/crawl/details/{idealista_id}` in `src/api/routes/crawl.py` accepting snapshot submissions from backend or Chrome extension, downloading photos, and updating status to `completed`
- [X] T029 [US3] Implement REST API endpoint `POST /api/v1/crawl/details/{idealista_id}/fail` in `src/api/routes/crawl.py` recording failed attempts in `DetailCrawlAttempt`, incrementing `extension_attempts`, and transitioning to `discarded` with verbatim `discard_reason = 'extension_retries_exhausted'` when `extension_attempts >= 3`
- [X] T030 [US3] Implement immediate discard on confirmed delisting (HTTP 404, 410, or "ad removed" text) with verbatim `discard_reason = 'delisted'` in `src/crawler/detail_crawler.py` and `src/api/routes/crawl.py`
- [X] T031 [P] [US3] Extend TypeScript interfaces in `extension/src/types/index.ts` with `DetailSnapshotPayload`, `DetailPhotoItem`, and `PendingDetailListing`
- [X] T032 [P] [US3] Add API client methods in `extension/src/services/api.ts` for fetching pending details (`fetchPendingDetails`), submitting snapshots (`submitPropertyDetail`), and reporting failures (`reportDetailCrawlFailure`)
- [X] T033 [US3] Implement DOM extractor script in `extension/src/content/detail_extractor.ts` to extract description, features, and gallery URLs from Idealista listing pages inside the user's authentic browser session
- [X] T034 [US3] Implement extension fallback crawl task runner in `extension/src/services/detail_crawler.ts` and integrate with Chrome alarms in `extension/src/background.ts`

**Checkpoint**: At this point, User Stories 1, 2, and 3 are functional. The hybrid fallback tier rescues blocked listings via the Chrome extension, and unrecoverable listings cleanly transition to `discarded`.

---

## Phase 6: User Story 4 - Detail Status Monitoring and Manual Override (Priority: P3)

**Goal**: Allow operators to query and filter properties by `detail_status` and manually re-queue or discard listings when needed.

**Independent Test**: Query properties filtered by `detail_status`, execute a manual discard on a pending property and verify status becomes `discarded` with reason `manual_discard`, then execute a manual re-queue on the discarded property and verify status resets to `pending` with attempts reset to 0 and discard reason cleared.

### Tests for User Story 4 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T035 [P] [US4] Contract test for `GET /api/v1/properties?detail_status=...` query filtering across all 4 statuses in `tests/contract/test_properties_filter_status.py`
- [X] T036 [P] [US4] Contract test for manual override endpoints `POST /api/v1/properties/{property_id}/requeue-detail` and `POST /api/v1/properties/{property_id}/discard-detail` in `tests/contract/test_manual_override_api.py`

### Implementation for User Story 4

- [X] T037 [US4] Extend property list endpoint `GET /api/v1/properties` in `src/api/routes/properties.py` and query logic in `src/services/property_service.py` to support filtering by `detail_status` (`legacy`, `pending`, `completed`, `discarded`)
- [X] T038 [US4] Implement administrative re-queue endpoint `POST /api/v1/properties/{property_id}/requeue-detail` in `src/api/routes/properties.py` and `src/services/property_service.py` resetting `detail_status = 'pending'`, `backend_attempts = 0`, `extension_attempts = 0`, `fallback_to_extension = False`, and `discard_reason = NULL`
- [X] T039 [US4] Implement administrative discard endpoint `POST /api/v1/properties/{property_id}/discard-detail` in `src/api/routes/properties.py` and `src/services/property_service.py` transitioning `detail_status = 'discarded'` with verbatim `discard_reason = 'manual_discard'`

**Checkpoint**: All user stories (US1 through US4) are fully functional and independently testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: System documentation, end-to-end quickstart validation, and codebase cleanup.

- [X] T040 [P] Create full property snapshot crawler architecture and operation guide in `docs/detail_crawler.md`
- [X] T041 [P] Implement end-to-end quickstart automated test suite covering Scenarios 1–6 in `tests/e2e/test_quickstart_scenarios.py`
- [X] T042 Run type checking with `mypy src/`, formatting with `black`, and lint verification across all modified backend and extension files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion — delivers core lifecycle isolation (MVP prerequisite).
- **User Story 2 (Phase 4)**: Depends on Phase 2 and Phase 3 (lifecycle state helpers) — delivers primary autonomous crawling.
- **User Story 3 (Phase 5)**: Depends on Phase 2, Phase 3, and Phase 4 — adds anti-bot resilience and extension fallback.
- **User Story 4 (Phase 6)**: Depends on Phase 2 and Phase 3 — adds monitoring filter and manual overrides.
- **Polish (Phase 7)**: Depends on all user stories (Phases 3–6) being completed.

### User Story Dependencies

- **User Story 1 (P1)**: Foundational schema and migration ready. Has no dependencies on other stories.
- **User Story 2 (P1)**: Depends on US1 lifecycle states and state update helpers. Can proceed immediately after US1.
- **User Story 3 (P2)**: Extends US2 crawler and adds Chrome extension fallback endpoints.
- **User Story 4 (P3)**: Depends on US1 lifecycle states; can run in parallel with US2/US3 or following them.

### Within Each User Story

- Automated tests MUST be written and fail before implementation code is written.
- Data models and schema definitions before service logic.
- Service logic before API endpoints and background schedulers.
- Backend APIs before Chrome extension consumption.
- Checkpoints at each phase to validate independent functionality.

### Parallel Opportunities

- **Setup**: `T002` (media config) and `T003` (static mount) can be implemented in parallel.
- **Foundational**: `T005` (models), `T006` (migration), and `T007` (Pydantic schemas) can proceed in parallel once `T004` column extensions are finalized.
- **User Story 1**: Tests `T009` and `T010` can be written in parallel.
- **User Story 2**: Tests `T014`, `T015`, and `T016` can be written in parallel. Parser `T017` and API endpoint `T020` can be drafted in parallel with crawler `T018`.
- **User Story 3**: Tests `T022`, `T023`, and `T024` can be written in parallel. Extension types `T031` and API client `T032` can be developed in parallel with backend pacing `T025`.
- **User Story 4**: Tests `T035` and `T036` can be written in parallel.
- **Polish**: Docs `T040` and E2E quickstart tests `T041` can run in parallel.

---

## Parallel Example: User Story 2

```bash
# Launch all test implementations for User Story 2 together:
Task: "Unit test for HTML DOM and JSON-LD parsing in tests/unit/test_detail_parser.py"
Task: "Integration test for Playwright crawler extraction in tests/integration/test_snapshot_storage.py"
Task: "Contract test for snapshot retrieval in tests/contract/test_property_snapshot_api.py"

# Launch DOM parser and API endpoint drafting together:
Task: "Implement HTML/DOM & JSON-LD parser in src/crawler/detail_parser.py"
Task: "Implement REST API endpoint GET /api/v1/properties/{property_id}/snapshot in src/api/routes/properties.py"
```

---

## Parallel Example: User Story 3

```bash
# Launch extension types and API client development alongside backend pacing:
Task: "Extend TypeScript interfaces in extension/src/types/index.ts"
Task: "Add API client methods in extension/src/services/api.ts"
Task: "Implement anti-bot challenge classification in src/crawler/detail_crawler.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001`–`T003`).
2. Complete Phase 2: Foundational (`T004`–`T008`).
3. Complete Phase 3: User Story 1 (`T009`–`T013`).
4. **STOP and VALIDATE**: Verify that existing properties are marked `legacy`, new properties initialize as `pending`, and state transitions enforce discard constraints.
5. Deploy/demo foundation if ready.

### Incremental Delivery

1. **Foundational Milestone**: Setup + Schema extensions + Media directory.
2. **Increment 1 (MVP)**: User Story 1 — Lifecycle isolation (`legacy` vs `pending`).
3. **Increment 2**: User Story 2 — Autonomous Playwright crawler captures full snapshots and downloads gallery photos locally.
4. **Increment 3**: User Story 3 — Anti-bot pacing, adaptive cooldowns, Chrome extension fallback tier, and 3-attempt discard ceiling.
5. **Increment 4**: User Story 4 — Status filtering and manual operator re-queue/discard overrides.
6. **Increment 5**: Polish — Architecture documentation and automated quickstart validation.

---

## Notes

- `[P]` tasks = distinct files with no blocking dependencies on unmerged changes.
- `[Story]` label (`[US1]`, `[US2]`, `[US3]`, `[US4]`) maps every user-story task to its parent story for end-to-end traceability.
- Tests precede implementation in adherence with Constitution Principle II (Testing Standards).
- Field constraints from `data-model.md` are quoted verbatim in task definitions to guarantee precision.
