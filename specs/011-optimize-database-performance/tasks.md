# Tasks: Database and Query Performance Optimization

**Input**: Design documents from `specs/011-optimize-database-performance/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`  

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Associated user story (e.g. `[US1]`, `[US2]`, `[US3]`)
- Every task includes explicit file paths

---

## Phase 1: Setup (Pragmas & Storage Infrastructure)

**Purpose**: Configure storage engine connection pragmas and verify local media paths.

- [X] T001 Configure SQLite connection pragmas (`journal_mode = WAL`, `synchronous = NORMAL`, `busy_timeout = 5000`, `cache_size = -64000`, `mmap_size = 268435456`) via SQLAlchemy `@event.listens_for(engine, "connect")` in `src/database/models.py`
- [X] T002 [P] Configure storage directories and media path settings for cover images in `src/config.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema modifications and security sanitization required before implementing user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Update `Property` entity in `src/database/models.py` with persistent columns: `canonical_zone` (VARCHAR(100), not null, default 'Burgos Centro / Otras Zonas', index=True), `discount_pct` (FLOAT, not null, default 0.0, index=True), `price_per_m2` (INTEGER, nullable=True, index=True), composite index `ix_property_status_canonical_zone` on `(status, canonical_zone)`, and `image_data` (VARCHAR(500), nullable=True)
- [X] T004 Implement `resolve_safe_path(relative_path: str) -> Optional[Path]` in `src/services/media_service.py` with strict path containment (`is_relative_to(media_root)`) and image extension whitelist (`.jpg`, `.jpeg`, `.png`, `.webp`) to prevent Directory Traversal
- [X] T005 [P] Create security test suite in `tests/integration/test_media_security.py` asserting that directory traversal attempts (`../../etc/passwd`, arbitrary extensions) are rejected with `None`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Instant Property Explorer Navigation and Filtering (Priority: P1) 🎯 MVP

**Goal**: Deliver instant (< 500ms p95) property explorer browsing, pagination, and filtering executed 100% in SQLite.

**Independent Test**: Load the property explorer dashboard, filter by zone/price, and change pagination pages, verifying sub-100ms query execution and minimal memory usage.

### Tests for User Story 1
- [X] T006 [P] [US1] Create integration test in `tests/integration/test_property_sql_query.py` verifying SQL-based pagination (`LIMIT` / `OFFSET`), canonical zone filtering, and discount sorting execute in under 100ms

### Implementation for User Story 1
- [X] T007 [US1] Refactor `PropertyService.list_properties()` in `src/services/property_service.py` to replace `query.all()` with native SQL filtering (`canonical_zone`, `discount_pct`, `price_per_m2`, `status`), SQL sorting, and SQL pagination (`.offset(offset).limit(limit)`) with `query.count()`
- [X] T008 [US1] Update `PropertyService.create_or_update_property()` in `src/services/property_service.py` to automatically compute and populate `canonical_zone`, `discount_pct`, and `price_per_m2` on record creation and update
- [X] T009 [US1] Update property listing route handler in `src/api/routes/properties.py` to ensure `image_data` is deferred/excluded from bulk listings and ensure paginated `PropertyListResponse` returns in under 500ms

**Checkpoint**: User Story 1 is functional and testable independently (MVP reached).

---

## Phase 4: User Story 2 - Decoupled Image Asset Storage on Disk (Priority: P2)

**Goal**: Extract ~374 MB of Base64 cover images from `property.image_data` to disk files (`data/media/properties/{id}/cover.jpg`), update database records to relative path strings, and reclaim space with `VACUUM`.

**Independent Test**: Verify that the database file size drops from 391 MB to under 50 MB, all cover images remain accessible, and the image endpoint serves files directly from disk.

### Tests for User Story 2
- [X] T010 [P] [US2] Create integration test in `tests/integration/test_performance_migration.py` verifying batch Base64 extraction to disk files and database size reduction

### Implementation for User Story 2
- [X] T011 [US2] Implement performance migration script `src/database/migrate_performance.py` to batch extract Base64 images to `data/media/properties/{id}/cover.jpg`, replace `image_data` with relative path strings, backfill `canonical_zone`, `discount_pct`, and `price_per_m2`, rebuild indexes, and execute `VACUUM`
- [X] T012 [US2] Update cover image endpoint `/api/v1/properties/{idealista_id}/image` in `src/api/routes/properties.py` to serve files from disk via `MediaService.resolve_safe_path()` with `Cache-Control: public, max-age=86400`
- [X] T013 [US2] Update crawler photo ingestion in `src/services/property_service.py` (`download_property_image` and `save_property_photo`) to write new cover images directly to disk files rather than storing Base64 text in the database

**Checkpoint**: User Stories 1 and 2 work together; database size is shrunk and memory overhead is eliminated.

---

## Phase 5: User Story 3 - Smooth Concurrency Between Browsing and Background Tasks (Priority: P3)

**Goal**: Ensure crawler ingestion transactions and interactive web browsing execute concurrently with zero database locking contention.

**Independent Test**: Execute concurrent read queries against `/api/v1/properties` while a crawl write transaction commits updates, verifying zero `sqlite3.OperationalError: database is locked` errors.

### Tests for User Story 3
- [X] T014 [P] [US3] Create concurrency integration test in `tests/integration/test_db_concurrency.py` simulating simultaneous read queries during crawler write transactions without lock failures

### Implementation for User Story 3
- [X] T015 [US3] Configure connection pool busy timeouts and short transaction scopes in `src/database/models.py` and `src/crawler/service.py` to ensure crawling writes do not hold locks across network calls

**Checkpoint**: All 3 user stories functional, fast, and concurrent.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Execute database migration, run quickstart validation, and verify deployment.

- [X] T016 Execute performance migration script `python3 -m src.database.migrate_performance` against `idealista_properties.db` to extract images and execute `VACUUM`
- [X] T017 Run end-to-end verification scenarios in `specs/011-optimize-database-performance/quickstart.md` to confirm DB size < 50 MB, query execution < 50 ms, WAL mode active, and path traversal blocked
- [X] T018 Build and verify Docker container deployment via `docker compose up -d --build` and validate `http://localhost:8050/health` per `AGENTS.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1). Blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2. Delivers MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 2. Can run after or in parallel with US1.
- **User Story 3 (Phase 5)**: Depends on Phase 1 & 2.
- **Polish (Phase 6)**: Runs after User Stories 1, 2, and 3 are complete.

### Parallel Opportunities

- `T002` (Setup config) can run in parallel with `T001` (Pragmas).
- `T005` (Security tests) can run in parallel with `T004` (Path sanitization).
- `T006` (US1 test) can be written in parallel with `T003`.
- `T010` (US2 test) can be written in parallel with `T006`.
- `T014` (US3 concurrency test) can be written in parallel with `T010`.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Setup (Phase 1) + Foundational (Phase 2).
2. Complete User Story 1 (Phase 3).
3. **Validate MVP**: Test property explorer queries in under 100ms.

### Incremental Delivery
1. **MVP**: Pure SQL pagination and filtering (US1) -> immediate UX acceleration.
2. **Data Decoupling**: Extract 374 MB of Base64 images to disk + `VACUUM` (US2) -> database shrinks from 391 MB to < 30 MB.
3. **Concurrency**: Verify WAL mode and non-blocking crawl synchronization (US3) -> zero lock errors.
4. **Final Migration & Deployment**: Run migration on production database and rebuild Docker container.
