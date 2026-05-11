# Tasks: Chrome Extension Property Crawler

**Input**: Design documents from `/specs/003-chrome-extension-crawler/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Test tasks are included as the spec includes testing requirements and independent test criteria.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Extension**: `extension/` at repository root (TypeScript project)
- **Backend**: `src/` at repository root (Python/FastAPI)
- **Tests**: `tests/` at repository root (pytest)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extension project initialization and build configuration

- [X] T001 Create extension directory structure: `extension/src/{content,popup,options,services,utils,types}`, `extension/public/{icons,_locales/en}`
- [X] T002 [P] Initialize Node.js project in `extension/package.json` with TypeScript, Vite, ESLint, Prettier dependencies
- [X] T003 [P] Create TypeScript configuration in `extension/tsconfig.json` with strict mode and Chrome types
- [X] T004 [P] Create Vite build configuration in `extension/vite.config.ts` for Manifest V3
- [X] T005 Create extension manifest in `extension/public/manifest.json` with host permissions for idealista.com and localhost:8000
- [X] T006 Add build scripts to `extension/package.json` (dev, build, lint, type-check)

**Checkpoint**: Extension project structure ready - can build and load in Chrome

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and core models MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Models & Migration

- [X] T007 [P] Add new fields to Property model in `src/database/models.py`: `status`, `first_seen_at`, `last_seen_at`, `missing_since`
- [X] T008 [P] Create CrawlSession model in `src/database/models.py`
- [X] T009 [P] Create SavedSearch model in `src/database/models.py`
- [X] T010 [P] Create PropertyVisibility model in `src/database/models.py`
- [X] T011 [P] Create PropertyChange model in `src/database/models.py`
- [X] T012 Create crawl_session_property association table in `src/database/models.py`
- [X] T013 Add relationships to Property model: `visibility_history`, `attribute_changes`, `crawl_sessions`
- [X] T014 Create migration script in `src/database/migrate_extension.py` to add new tables and columns
- [X] T015 Run database migration successfully

### Backend API Schemas

- [X] T016 [P] Create Pydantic schemas in `src/api/schemas.py` for CrawlSession, SavedSearch, PropertyVisibility, PropertyChange
- [X] T017 [P] Create Pydantic schemas in `src/api/schemas.py` for BatchIngestionRequest and BatchIngestionResponse

### Extension Type Definitions

- [X] T018 Create TypeScript interfaces in `extension/src/types/index.ts`: Property, SavedSearch, CrawlState, CrawlConfig

**Checkpoint**: Foundation ready - database schema migrated, models defined, types established - user story implementation can now begin

---

## Phase 3: User Story 1 - Configure and Start Crawl Session (Priority: P1) 🎯 MVP

**Goal**: Users can configure the Chrome extension and initiate a crawl session that systematically navigates through pages and properties

**Independent Test**: Install the Chrome extension, configure the crawl server URL to http://localhost:8000, select saved searches, and initiate a crawl. The extension should navigate through pages and send data to the configured server.

### Tests for User Story 1

- [ ] T019 [P] [US1] Create backend API test for crawl session creation in `tests/test_crawl_sessions.py`
- [ ] T020 [P] [US1] Create backend API test for saved search sync in `tests/test_saved_searches.py`

### Implementation for User Story 1

#### Backend API Endpoints

- [X] T021 [US1] Create SavedSearch service in `src/services/saved_search_service.py` with sync_from_extension method
- [X] T022 [US1] Create crawl session service in `src/services/crawl_service.py` with create_session method
- [X] T023 [US1] Create SavedSearch API routes in `src/api/routes/searches.py` with GET /searches and POST /searches/sync endpoints
- [X] T024 [US1] Add crawl session endpoints to `src/api/routes/crawl.py`: POST /crawl/sessions and GET /crawl/sessions/{id}
- [X] T025 [US1] Register new routes in `src/main.py`

#### Extension Configuration

- [X] T026 [US1] Create extension options page HTML in `extension/src/options/index.html`
- [X] T027 [US1] Create extension options page logic in `extension/src/options/index.ts` for server URL configuration
- [X] T028 [US1] Create options page styles in `extension/src/options/styles.css`
- [X] T029 [US1] Implement storage service in `extension/src/services/storage.ts` for Chrome Storage API wrapper

#### Extension Saved Search Detection

- [X] T030 [P] [US1] Create DOM parser utilities in `extension/src/utils/parsers.ts` for price, size, location extraction
- [X] T031 [P] [US1] Create saved search extraction logic in `extension/src/content/searches.ts`
- [X] T032 [US1] Create content script entry in `extension/src/content/index.ts` to detect page type and extract searches

#### Extension Popup UI

- [X] T033 [US1] Create popup HTML in `extension/src/popup/index.html` with search list and checkboxes
- [X] T034 [US1] Create popup logic in `extension/src/popup/index.ts` to display searches and handle selection
- [X] T035 [US1] Create popup styles in `extension/src/popup/styles.css`
- [X] T036 [US1] Implement API client in `extension/src/services/api.ts` for backend communication

#### Extension Crawl Orchestration

- [X] T037 [US1] Create background service worker in `extension/src/background.ts` with message handlers
- [X] T038 [US1] Implement crawl state machine in `extension/src/services/crawler.ts` with start/pause/resume logic
- [X] T039 [US1] Add crawl progress tracking to Chrome Storage in `extension/src/services/storage.ts`

**Checkpoint**: User Story 1 complete - extension can be configured, detect searches, and start a crawl session

---

## Phase 4: User Story 2 - Batch Ingest Properties via API (Priority: P1)

**Goal**: API endpoint accepts batch property data from Chrome extension and efficiently stores properties with proper tracking metadata

**Independent Test**: Send HTTP POST requests with batches of property data to POST /api/v1/properties/batch and verify properties are stored in database with proper tracking metadata.

### Tests for User Story 2

- [ ] T040 [P] [US2] Create backend test for batch property ingestion in `tests/test_property_batch.py`
- [ ] T041 [P] [US2] Create backend test for duplicate handling in batch in `tests/test_property_batch.py`
- [ ] T042 [P] [US2] Create backend test for property update detection in `tests/test_property_batch.py`

### Implementation for User Story 2

#### Backend Batch Processing

- [X] T043 [US2] Add batch_ingest method to `src/services/property_service.py` for processing property batches
- [X] T044 [US2] Implement duplicate detection logic in `src/services/property_service.py`
- [X] T045 [US2] Implement property change detection in `src/services/property_service.py`
- [X] T046 [US2] Add PropertyVisibility recording in `src/services/property_service.py` for seen events
- [X] T047 [US2] Add PropertyChange recording in `src/services/property_service.py` for attribute changes
- [X] T048 [US2] Create POST /properties/batch endpoint in `src/api/routes/properties.py`
- [X] T049 [US2] Add request validation for batch endpoint in `src/api/routes/properties.py`
- [X] T050 [US2] Add response formatting with created/updated/error counts in `src/api/routes/properties.py`

#### Extension Property Extraction

- [X] T051 [P] [US2] Create property listing extraction logic in `extension/src/content/listings.ts`
- [X] T052 [P] [US2] Create DOM utilities in `extension/src/utils/dom.ts` for safe element selection
- [X] T053 [US2] Implement pagination detection in `extension/src/content/listings.ts`
- [X] T054 [US2] Update content script entry in `extension/src/content/index.ts` to handle search results pages

#### Extension Batch Sending

- [X] T055 [US2] Implement batch sending with retry logic in `extension/src/services/api.ts`
- [X] T056 [US2] Add exponential backoff for failed requests in `extension/src/services/api.ts`
- [X] T057 [US2] Implement queue for failed batches in `extension/src/services/crawler.ts`
- [X] T058 [US2] Add page navigation logic in `extension/src/services/crawler.ts`

**Checkpoint**: User Story 2 complete - extension extracts properties and sends batches to API, backend stores with proper tracking

---

## Phase 5: User Story 3 - Track Property History and Detect Missing Properties (Priority: P2)

**Goal**: System maintains complete history of when each property was seen or went missing to identify sold properties

**Independent Test**: Run multiple crawl sessions and verify system correctly tracks which properties were seen in each session and marks properties as missing when they no longer appear in search results.

### Tests for User Story 3

- [ ] T059 [P] [US3] Create backend test for missing property detection in `tests/test_missing_detection.py`
- [ ] T060 [P] [US3] Create backend test for property reactivation in `tests/test_missing_detection.py`
- [ ] T061 [P] [US3] Create backend test for sold property flagging after 30 days in `tests/test_missing_detection.py`

### Implementation for User Story 3

#### Backend Missing Detection

- [ ] T062 [US3] Implement detect_missing_properties method in `src/services/crawl_service.py`
- [ ] T063 [US3] Add cross-search verification logic in `src/services/crawl_service.py` (only mark missing if absent from ALL searches)
- [ ] T064 [US3] Implement PropertyVisibility recording for missing events in `src/services/crawl_service.py`
- [ ] T065 [US3] Add property status updates (active -> missing -> sold) in `src/services/crawl_service.py`
- [ ] T066 [US3] Create POST /crawl/sessions/{id}/searches/{search_id}/detect-missing endpoint in `src/api/routes/crawl.py`
- [ ] T067 [US3] Add sold property query endpoint in `src/api/routes/properties.py`
- [ ] T068 [US3] Create POST /crawl/sessions/{id}/complete endpoint in `src/api/routes/crawl.py`

#### Extension Missing Detection Integration

- [ ] T069 [US3] Add detect-missing API call in `extension/src/services/api.ts`
- [ ] T070 [US3] Call detect-missing after each search completion in `extension/src/services/crawler.ts`
- [ ] T071 [US3] Call session complete endpoint when crawl finishes in `extension/src/services/crawler.ts`

**Checkpoint**: User Story 3 complete - system tracks property visibility history and detects missing/sold properties

---

## Phase 6: User Story 4 - Track Property Changes Over Time (Priority: P2)

**Goal**: System tracks changes to property details (price, square meters, description) across crawl sessions

**Independent Test**: Crawl the same property multiple times with different values and verify system records each change with timestamps.

### Tests for User Story 4

- [ ] T072 [P] [US4] Create backend test for price change detection in `tests/test_property_changes.py`
- [ ] T073 [P] [US4] Create backend test for description change detection in `tests/test_property_changes.py`
- [ ] T074 [P] [US4] Create backend test for size change detection in `tests/test_property_changes.py`

### Implementation for User Story 4

#### Backend Change Tracking

- [ ] T075 [US4] Implement change detection for all attributes in `src/services/property_service.py`
- [ ] T076 [US4] Add PropertyChange recording for price updates in `src/services/property_service.py`
- [ ] T077 [US4] Add PropertyChange recording for description updates in `src/services/property_service.py`
- [ ] T078 [US4] Add PropertyChange recording for size/bedrooms/floor updates in `src/services/property_service.py`
- [ ] T079 [US4] Update PriceHistory recording to use crawl_session_id in `src/services/property_service.py`
- [ ] T080 [US4] Add property history query endpoint in `src/api/routes/properties.py`: GET /properties/{id}/history
- [ ] T081 [US4] Add property changes endpoint in `src/api/routes/properties.py`: GET /properties/{id}/changes

**Checkpoint**: User Story 4 complete - all property attribute changes are tracked with before/after values and timestamps

---

## Phase 7: User Story 5 - Human-Like Crawling Behavior (Priority: P3)

**Goal**: Crawling process mimics human browsing behavior with random delays and scrolling to avoid detection

**Independent Test**: Run a crawl session and verify through browser DevTools or logs that random delays (2-8s per page, 5-15s between pages) and scrolling occur.

### Tests for User Story 5

- [ ] T082 [P] [US5] Create extension test for delay randomization in `extension/tests/human-like.test.ts`
- [ ] T083 [P] [US5] Create extension test for scroll simulation in `extension/tests/human-like.test.ts`

### Implementation for User Story 5

#### Extension Human-Like Behavior

- [ ] T084 [US5] Implement random delay generator in `extension/src/utils/human-like.ts` with configurable min/max
- [ ] T085 [US5] Implement smooth scroll simulation in `extension/src/utils/human-like.ts`
- [ ] T086 [US5] Add page load wait logic in `extension/src/services/crawler.ts` (2-8 seconds)
- [ ] T087 [US5] Add between-page delay logic in `extension/src/services/crawler.ts` (5-15 seconds)
- [ ] T088 [US5] Integrate scroll simulation before extraction in `extension/src/content/listings.ts`
- [ ] T089 [US5] Add human-like behavior toggle to options page in `extension/src/options/index.ts`
- [ ] T090 [US5] Add delay configuration UI to options page in `extension/src/options/index.html`
- [ ] T091 [US5] Implement rate limit detection (429/CAPTCHA) in `extension/src/services/crawler.ts`
- [ ] T092 [US5] Add 5-minute pause on rate limit with auto-resume in `extension/src/services/crawler.ts`
- [ ] T093 [US5] Add rate limit counter (max 3) with user notification in `extension/src/services/crawler.ts`

**Checkpoint**: User Story 5 complete - extension behaves like human user with configurable delays and handles rate limiting

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, resumability, and improvements that affect multiple user stories

### Error Handling & Resilience

- [ ] T094 [P] Handle network errors with retry logic in `extension/src/services/api.ts` (max 5 retries)
- [ ] T095 [P] Add DOM structure change detection in `extension/src/content/index.ts` (alert after 3 failures)
- [ ] T096 Implement duplicate ID handling within batch in `src/services/property_service.py` (keep last, log warning)

### Resumability & State Persistence

- [ ] T097 Implement crawl state persistence to Chrome Storage in `extension/src/services/storage.ts`
- [ ] T098 Add resume detection on extension startup in `extension/src/background.ts`
- [ ] T099 Implement "Resume Crawl?" prompt in `extension/src/popup/index.ts`
- [ ] T100 Add large search handling (100+ pages) with periodic state saves in `extension/src/services/crawler.ts`

### UI/UX Improvements

- [ ] T101 [P] Add crawl progress indicator to popup in `extension/src/popup/index.ts`
- [ ] T102 [P] Add error message display in popup in `extension/src/popup/index.ts`
- [ ] T103 Create extension icons (16x16, 32x32, 48x48, 128x128) in `extension/public/icons/`
- [ ] T104 Add status badge to extension icon in `extension/src/background.ts`

### Documentation & Validation

- [ ] T105 Update README.md with extension setup and usage instructions
- [ ] T106 Run quickstart.md validation - verify all setup steps work
- [ ] T107 Add API documentation comments to all endpoints

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories should be implemented in priority order: P1 (US1, US2) → P2 (US3, US4) → P3 (US5)
  - US1 and US2 can overlap once US1 backend endpoints are ready
- **Polish (Phase 8)**: Depends on all user stories being functional

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core crawl session management
- **User Story 2 (P1)**: Can start after US1 backend endpoints ready - Depends on session creation
- **User Story 3 (P2)**: Can start after US2 complete - Depends on batch ingestion working
- **User Story 4 (P2)**: Can start after US2 complete - Extends batch processing
- **User Story 5 (P3)**: Can start after US1 complete - Enhances crawl behavior

### Within Each User Story

- Tests (if included) should be written before implementation
- Models before services
- Services before endpoints/UI
- Core implementation before integration

### Parallel Opportunities

- T007-T015 (Database models) can be done in parallel by model
- T021-T025 (Backend endpoints) can be done in parallel by endpoint
- T026-T029 (Extension config) can be done in parallel
- T043-T050 (Backend batch processing) steps have dependencies but some parallel work possible

---

## Parallel Example: User Story 1

```bash
# Backend endpoints can be developed in parallel:
Task: "Create SavedSearch service in src/services/saved_search_service.py"
Task: "Create crawl session service in src/services/crawl_service.py"

# Extension UI can be developed in parallel:
Task: "Create extension options page HTML in extension/src/options/index.html"
Task: "Create popup HTML in extension/src/popup/index.html"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Configure and Start Crawl)
4. Complete Phase 4: User Story 2 (Batch Ingest Properties)
5. **STOP and VALIDATE**: Test full crawl flow end-to-end
6. Deploy/demo if ready - core functionality works!

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 + US2 → Basic crawl and ingest working → Deploy/Demo (MVP!)
3. Add US3 → Missing property detection → Deploy/Demo
4. Add US4 → Change tracking → Deploy/Demo
5. Add US5 → Human-like behavior → Deploy/Demo
6. Each story adds value without breaking previous stories

### Recommended Task Order

For a single developer:
1. T001-T006: Extension setup
2. T007-T015: Database models and migration
3. T016-T018: Schemas and types
4. T021-T025: Backend crawl/saved search endpoints (US1 backend)
5. T026-T039: Extension config and crawl start (US1 frontend)
6. T043-T050: Backend batch processing (US2 backend)
7. T051-T058: Extension extraction and batch sending (US2 frontend)
8. **TEST**: Full crawl flow should work now
9. T062-T071: Missing detection (US3)
10. T075-T081: Change tracking (US4)
11. T084-T093: Human-like behavior (US5)
12. T094-T107: Polish and error handling

---

## Task Summary

| Phase | Story | Task Count | Key Deliverable |
|-------|-------|------------|-----------------|
| Phase 1 | Setup | 6 | Extension project ready |
| Phase 2 | Foundational | 12 | Database migrated, models ready |
| Phase 3 | US1 (P1) | 21 | Extension can configure and start crawl |
| Phase 4 | US2 (P1) | 19 | Extension extracts and sends batches, API stores properties |
| Phase 5 | US3 (P2) | 13 | Missing/sold property detection works |
| Phase 6 | US4 (P2) | 10 | All property changes tracked |
| Phase 7 | US5 (P3) | 12 | Human-like delays and rate limit handling |
| Phase 8 | Polish | 14 | Error handling, resumability, UI polish |
| **Total** | | **107** | |

### MVP Scope (Minimum Viable Product)

**Phases 1-4 only** (T001-T058):
- Extension setup and configuration
- Database models and migration
- Crawl session management
- Property extraction and batch ingestion

This gives you a working system that can crawl properties and store them. The advanced features (missing detection, change tracking, human-like behavior) can be added incrementally.
