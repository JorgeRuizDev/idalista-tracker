---
description: "Task list for Automated Deep Crawl for Inclusions and Pending Listings implementation"
---

# Tasks: Automated Deep Crawl for Inclusions and Pending Listings

**Feature Branch**: `009-deep-crawl-inclusions`  
**Input**: Design documents from `/specs/009-deep-crawl-inclusions/` (`plan.md`, `spec.md`, `data-model.md`, `contracts/crawl-pipeline-api.md`, `research.md`, `quickstart.md`)  
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/`  
**Tests**: Automated tests are REQUIRED per Constitution Principle II (Testing Standards) and feature specifications.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify media delivery paths, permissions, and extension manifest configurations.

- [X] T001 Verify media storage directory path and static file delivery endpoint `/media` in `src/config.py` and `src/main.py`
- [X] T002 [P] Verify extension permissions (`tabs`, `alarms`, `storage`, `scripting`) and host permissions for Idealista in `extension/public/manifest.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared API contract verification, query adjustments, and shared TypeScript type schemas required across all user stories.

**⚠️ CRITICAL**: No user story work can begin until this foundational phase is complete.

- [X] T003 [P] Contract test for `GET /api/v1/crawl/pending-details` with `priority_only=false` in `tests/contract/test_pending_details_all.py`
- [X] T004 [P] Verify query logic in `src/services/property_service.py` (`get_pending_detail_properties`) to ensure `priority_only=false` fetches all listings with `detail_status == 'pending'` ordered by `created_at DESC`
- [X] T005 [P] Define TypeScript interfaces in `extension/src/types/index.ts` for multi-stage crawl lifecycle (`CrawlStage`, `DetailCrawlProgress`, `DetailSnapshotPayload`, `PendingDetailListing`)
- [X] T006 [P] Define TypeScript interfaces in `frontend/src/types/property.ts` for `PropertySnapshot`, `PropertyPhotoItem`, and `PropertySnapshotResponse`

**Checkpoint**: Foundational schemas, contracts, and backend query endpoints verified. User story implementation can now begin.

---

## Phase 3: User Story 1 - Integrated Deep Listing Analysis on Crawl Execution (Priority: P1) 🎯 MVP

**Goal**: Whenever a crawl runs, newly discovered properties are persisted as `pending`, and the crawler immediately executes the deep analysis phase to extract the full snapshot (photos downloaded locally, description, and features) for all new inclusions and accumulated pending listings until the queue is completely empty.

**Independent Test**: Can be verified by creating mock pending properties, triggering a crawl via the extension, and verifying that search ingestion persists new listings as `pending`, the crawler navigates through all pending listings sequentially in background tabs, downloads all gallery photos to `data/media/properties/{id}/`, and transitions their detail status to `completed` (or `discarded` if delisted).

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [P] [US1] Integration test for two-stage crawl submission, photo downloading, and snapshot persistence in `tests/integration/test_unified_deep_crawl.py`
- [X] T008 [P] [US1] Unit test for HTML DOM and JSON-LD extraction of photos, full description, and features in `extension/src/content/__tests__/detail_extractor.test.ts`

### Implementation for User Story 1

- [X] T009 [US1] Verify and ensure `POST /api/v1/properties/batch` in `src/services/property_service.py` (`_process_single_property`) persists all newly detected listings with `detail_status = 'pending'` and commits to the database before returning
- [X] T010 [US1] Implement sequential background tab lifecycle, polite jittered delay (2.5–5.0s), DOM extraction, and snapshot submission in `extension/src/services/detail_crawler.ts` (`runFullPendingDetailQueue`)
- [X] T011 [US1] Update `extension/src/services/crawler.ts` (`startCrawl`) to chain Stage 1 (Search Discovery) directly into Stage 2 (Deep Analysis), processing all new inclusions and accumulated pending listings until queue empty
- [X] T012 [US1] Implement delisting verification and submission in `extension/src/services/detail_crawler.ts` sending `delisted: true` to `POST /api/v1/crawl/details/{idealista_id}` when listing is confirmed deactivated (404/410/removed)

**Checkpoint**: User Story 1 is functional. Crawls automatically enrich all newly discovered properties and pending queue listings with full snapshots and local photos.

---

## Phase 4: User Story 2 - Real-Time Extraction Progress & Operator Controls (Priority: P2)

**Goal**: Surface a real-time pending counter, two-stage progress display, on-demand "Analizar fichas pendientes" button, and anti-bot challenge detection with non-intrusive background tabs that focus only when a manual challenge appears.

**Independent Test**: Can be verified by launching a deep crawl from the extension popup, observing the real-time stage progress bar and counter, simulating an anti-bot challenge page to verify the tab is brought into focus (`active: true`) and paused, and confirming that closing the tab halts the crawl without corrupting or discarding pending listings.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T013 [P] [US2] Unit test for challenge detection, tab focus activation, and resilient tab-close handling in `extension/src/services/__tests__/detail_crawler_challenge.test.ts`

### Implementation for User Story 2

- [X] T014 [US2] Implement anti-bot challenge detection (Turnstile / CAPTCHA), tab focus (`chrome.tabs.update(tabId, { active: true })`), crawl pause, and resilient tab-close handling in `extension/src/services/detail_crawler.ts`
- [X] T015 [P] [US2] Implement background message listeners in `extension/src/background.ts` for `GET_PENDING_DETAILS_COUNT`, `START_DETAIL_CRAWL_ONLY`, and live progress broadcast to popup
- [X] T016 [US2] Update popup interface in `extension/src/popup/index.html` adding "Fichas pendientes: X" badge, two-stage progress bar ("Etapa 1: Búsqueda" / "Etapa 2: Fichas X/Y"), and "Analizar fichas pendientes" button
- [X] T017 [US2] Wire popup event handlers and status polling in `extension/src/popup/index.ts` to refresh pending counter, start on-demand detail crawls, and display live extraction status

**Checkpoint**: User Stories 1 and 2 are functional. Operators have full real-time visibility and on-demand controls with non-intrusive, challenge-resilient tab navigation.

---

## Phase 5: User Story 3 - Comprehensive Listing View in User Interface (Priority: P3)

**Goal**: Allow operators and analysts to view the complete listing snapshot (interactive full-resolution photo gallery, full formatted description, structured feature tags, and status badge) directly inside the property detail modal.

**Independent Test**: Can be verified by opening the detail modal of a property with `detail_status = 'completed'` in the frontend and confirming that the full photo carousel displays local `/media/...` photos with thumbnail selection, the complete multiline description is rendered, features are displayed as tags, and the green status badge is visible.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T018 [P] [US3] Contract test for `GET /api/v1/properties/{property_id}/snapshot` endpoint in `tests/contract/test_property_snapshot_endpoint.py`
- [X] T019 [P] [US3] Component test for `PropertyDetailModal` snapshot rendering and gallery interaction in `frontend/src/components/modal/__tests__/PropertyDetailModal.test.tsx`

### Implementation for User Story 3

- [X] T020 [P] [US3] Add `getPropertySnapshot(propertyId: number | string)` API client method in `frontend/src/services/api.ts`
- [X] T021 [US3] Update `frontend/src/components/modal/PropertyDetailModal.tsx` to fetch property snapshot on open and display status pill (`Ficha completa`, `Pendiente de análisis`, `Histórico`, `Descartado`)
- [X] T022 [US3] Implement full interactive photo gallery carousel with thumbnail navigation strip and index counter using `/media/...` local photo paths in `frontend/src/components/modal/PropertyDetailModal.tsx`
- [X] T023 [US3] Render full formatted description with line breaks preserved and structured feature attribute tags (`características básicas`, `edificio`, `equipamiento`) in `frontend/src/components/modal/PropertyDetailModal.tsx`

**Checkpoint**: All user stories (US1 through US3) are fully functional and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: System documentation, end-to-end quickstart validation, and codebase cleanup.

- [X] T024 [P] Implement end-to-end quickstart automated test suite covering Scenarios 1–4 in `tests/e2e/test_deep_crawl_scenarios.py`
- [X] T025 [P] Update architecture and operation guide in `docs/detail_crawler.md` documenting unified crawl execution and operator instructions
- [X] T026 Run type checking with `mypy src/`, formatting with `black`, and build verification with `npm run build` across frontend and extension

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion — delivers core two-stage unified crawl (MVP prerequisite).
- **User Story 2 (Phase 4)**: Depends on Phase 2 and Phase 3 (extends `detail_crawler.ts` and connects popup UI).
- **User Story 3 (Phase 5)**: Depends on Phase 2 and backend snapshot availability — can be developed in parallel with US1/US2.
- **Polish (Phase 6)**: Depends on all user stories (Phases 3–5) being completed.

### User Story Dependencies

- **User Story 1 (P1)**: Foundational contracts and types ready. Delivers automated deep crawl execution on the backend and extension.
- **User Story 2 (P2)**: Builds upon the `detail_crawler.ts` runner from US1, adding anti-bot focus triggers and popup UI controls.
- **User Story 3 (P3)**: Frontend visualization layer. Consumes the backend snapshot endpoint `GET /api/v1/properties/{property_id}/snapshot`.

### Parallel Opportunities

- **Setup**: `T001` (media paths) and `T002` (manifest permissions) can run in parallel.
- **Foundational**: `T003` (contract test), `T004` (backend query), `T005` (extension types), and `T006` (frontend types) can all run in parallel.
- **User Story 1**: Tests `T007` and `T008` can run in parallel before implementation.
- **User Story 2**: Tests `T013` and background message handlers `T015` can run in parallel.
- **User Story 3**: Tests `T018` and `T019`, and API client `T020` can run in parallel.
- **Polish**: Docs `T025` and E2E tests `T024` can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch tests for User Story 1 in parallel:
Task: "Integration test for two-stage crawl submission in tests/integration/test_unified_deep_crawl.py"
Task: "Unit test for HTML DOM and JSON-LD extraction in extension/src/content/__tests__/detail_extractor.test.ts"
```

---

## Parallel Example: User Story 3

```bash
# Launch contract test and API client in parallel:
Task: "Contract test for GET /api/v1/properties/{property_id}/snapshot in tests/contract/test_property_snapshot_endpoint.py"
Task: "Add getPropertySnapshot API client method in frontend/src/services/api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`T001`–`T002`).
2. Complete Phase 2: Foundational (`T003`–`T006`).
3. Complete Phase 3: User Story 1 (`T007`–`T012`).
4. **STOP and VALIDATE**: Verify that running a crawl ingests listings as `pending`, navigates through them in the background, extracts snapshots, and downloads photos locally to `data/media/properties/{id}/`.
5. Deploy/test the crawl pipeline foundation.

### Incremental Delivery

1. **Foundational Milestone**: Contracts + Type schemas + Setup verified.
2. **Increment 1 (MVP)**: User Story 1 — Two-stage unified crawl captures full snapshots and local photos for all new inclusions and pending queue.
3. **Increment 2**: User Story 2 — Real-time progress bar, pending counter, on-demand button, and challenge-resilient tab navigation in extension popup.
4. **Increment 3**: User Story 3 — Web frontend property detail modal displays full interactive photo gallery carousel, description, and feature tags.
5. **Increment 4**: Polish — End-to-end tests, docs, and codebase lint/build verification.

---

## Notes

- `[P]` tasks = distinct files with no blocking dependencies on incomplete tasks.
- `[Story]` label (`[US1]`, `[US2]`, `[US3]`) maps every user-story task to its parent story for traceability.
- Tests precede implementation in adherence with Constitution Principle II (Testing Standards).
- Each task includes explicit file paths for unambiguous implementation.
