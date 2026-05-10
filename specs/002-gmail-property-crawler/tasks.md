# Tasks: Gmail Property Crawler

**Branch**: `002-gmail-property-crawler` | **Input**: Design documents from `/specs/002-gmail-property-crawler/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included as optional. Only execute if explicitly requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths follow plan.md structure: `src/`, `tests/`, configuration at root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

**Prerequisites**: Python 3.11+ installed

- [X] T001 Create project structure per implementation plan in `src/` directory
- [X] T002 [P] Create `pyproject.toml` with UV configuration and production dependencies (FastAPI, SQLAlchemy, APScheduler, Pydantic, pydantic-settings, uvicorn)
- [X] T003 [P] Add dev dependencies to `pyproject.toml` optional-dependencies (pytest, pytest-asyncio, pytest-cov, black, flake8, mypy, httpx)
- [X] T004 [P] Create `.python-version` file specifying Python 3.11
- [X] T005 Create `.env.example` with all environment variables (GMAIL_EMAIL, GMAIL_APP_PASSWORD, DATABASE_URL, CRAWL_INTERVAL_HOURS, API_HOST, API_PORT, LOG_LEVEL)
- [X] T006 Create `README.md` with project overview and UV usage instructions

**Checkpoint**: Project structure ready for dependency installation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Configuration & Constants

- [X] T007 Create `src/config.py` with Pydantic Settings class containing all constants:
  - `GMAIL_SENDER_FILTER = "noresponder@idealista.com"` (use this CFG constant throughout)
  - `CRAWL_INTERVAL_HOURS = 1`
  - `DATABASE_URL` default
  - `API_HOST`, `API_PORT`, `LOG_LEVEL`
  - Gmail credentials

### Database Foundation

- [X] T008 Create `src/database/__init__.py`
- [X] T009 [P] Create `src/database/models.py` with all three SQLAlchemy models (Property, PriceHistory, EmailSource) per data-model.md
- [X] T010 [P] Create `src/database/session.py` with SQLAlchemy session management and engine configuration
- [X] T011 Create `src/database/init.py` with database initialization and table creation logic

### API Foundation

- [X] T012 Create `src/api/__init__.py`
- [X] T013 Create `src/api/schemas.py` with Pydantic request/response models per API contracts
- [X] T014 Create `src/api/dependencies.py` with database session injection dependency
- [X] T015 Create `src/api/routes/__init__.py`

### Main Application

- [X] T016 Create `src/__init__.py`
- [X] T017 Create `src/main.py` with FastAPI app factory and basic health endpoint

**Checkpoint**: Foundation ready - database can be initialized, API starts successfully

---

## Phase 3: User Story 1 - Automatic Property Discovery (Priority: P1) 🎯 MVP

**Goal**: Implement automatic Gmail crawling to discover and store new properties from idealista emails every hour

**Independent Test**: Configure Gmail IMAP credentials, trigger crawl, verify properties from `noresponder@idealista.com` are stored in database with correct fields (title, price, location, description)

### Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T018 [P] [US1] Create `tests/fixtures/sample_emails.txt` with sample idealista email content for testing
- [~] T019 [P] [US1] Create `tests/unit/test_parser.py` with parser unit tests (test regex patterns against sample emails)
- [~] T020 [P] [US1] Create `tests/unit/test_imap_client.py` with mocked IMAP client tests
- [~] T021 [US1] Create `tests/integration/test_crawler.py` with crawl service integration tests

### Implementation for User Story 1

#### Email Parsing

- [X] T022 [P] [US1] Create `src/crawler/__init__.py`
- [X] T023 [US1] Create `src/crawler/parser.py` with regex-based email content parser:
  - Extract property fields using patterns from research.md
  - Use `config.GMAIL_SENDER_FILTER` constant for sender validation
  - Parse: title, property_type, location, prices, size, bedrooms, floor, elevator, URL
  - Extract `idealista_id` from URL pattern `https://www.idealista.com/inmueble/(\d+)/`

#### IMAP Client

- [X] T024 [US1] Create `src/crawler/imap_client.py` with Gmail IMAP connection handler:
  - Use `config.GMAIL_SENDER_FILTER` constant to filter emails
  - Implement connection with retry logic and error handling
  - Method to fetch unread emails from sender
  - Proper connection cleanup

#### Crawler Service

- [X] T025 [US1] Create `src/crawler/service.py` with crawl orchestration logic:
  - Coordinate IMAP client, parser, and database storage
  - Use `config.GMAIL_SENDER_FILTER` for email filtering
  - Implement deduplication using `idealista_id`
  - Track new properties vs existing
  - Handle emails with multiple properties

#### Scheduler

- [X] T026 [US1] Create `src/crawler/scheduler.py` with APScheduler configuration:
  - Hourly crawl job using `config.CRAWL_INTERVAL_HOURS`
  - Integrate with FastAPI lifespan events
  - Graceful startup/shutdown

#### API Endpoints

- [X] T027 [US1] Create `src/api/routes/crawl.py` with crawl control endpoints:
  - `POST /api/v1/crawl/trigger` - Manual crawl trigger
  - `GET /api/v1/crawl/status` - Crawl status endpoint
- [X] T028 [US1] Update `src/main.py` to include crawler router and scheduler initialization

#### Service Layer

- [X] T029 [US1] Create `src/services/__init__.py`
- [X] T030 [US1] Create `src/services/property_service.py` with business logic for property CRUD operations

**Checkpoint**: User Story 1 complete - hourly crawl works, properties stored, API endpoints functional

---

## Phase 4: User Story 2 - Price Change Tracking (Priority: P2)

**Goal**: Detect and track price changes for existing properties, preserving historical data

**Independent Test**: Insert property with price $500,000, simulate price drop email, verify record updated and price history created with old/new prices

### Tests for User Story 2 (OPTIONAL - only if tests requested) ⚠️

- [~] T031 [P] [US2] Create `tests/unit/test_price_history.py` with price change detection tests
- [~] T032 [P] [US2] Create `tests/integration/test_price_tracking.py` with price update flow tests

### Implementation for User Story 2

#### Price History Management

- [X] T033 [P] [US2] Extend `src/database/models.py` PriceHistory model (ensure proper relationships)
- [X] T034 [US2] Update `src/crawler/service.py` to detect price changes:
  - Compare new price with existing property's `current_price`
  - Create PriceHistory entry on change
  - Update `original_price`, `current_price`, `price_drop_percentage`
  - Set `change_type` to "initial", "update", or "drop" per data-model.md

#### Price Drop API

- [X] T035 [US2] Extend `src/api/routes/properties.py` (or create if not exists):
  - `GET /api/v1/properties/price-drops` - Properties with price drops
  - Support `min_drop_percent` query parameter
  - Sort by `price_drop_percentage` descending
- [X] T036 [US2] Update `src/services/property_service.py` with price drop filtering logic

**Checkpoint**: User Story 2 complete - price changes tracked, history preserved, price-drop endpoint works

---

## Phase 5: User Story 3 - REST API Access (Priority: P3)

**Goal**: Expose property data through REST API with filtering, sorting, and pagination

**Independent Test**: Make HTTP requests to API endpoints, verify JSON responses with correct format, test filtering by price range, location, date added

### Tests for User Story 3 (OPTIONAL - only if tests requested) ⚠️

- [~] T037 [P] [US3] Create `tests/contract/test_api_contracts.py` with API contract validation tests
- [~] T038 [P] [US3] Create `tests/integration/test_api.py` with API endpoint integration tests

### Implementation for User Story 3

#### Property Routes

- [X] T039 [P] [US3] Create `src/api/routes/properties.py` with property endpoints:
  - `GET /api/v1/properties` - List all properties with filters (min_price, max_price, location, min_bedrooms, has_price_drop, sort_by, sort_order, limit, offset)
  - `GET /api/v1/properties/{idealista_id}` - Get single property by ID with price_history
- [X] T040 [P] [US3] Create `src/api/routes/stats.py` with statistics endpoint:
  - `GET /api/v1/stats` - Aggregate statistics (total_properties, active_properties, price_drops, averages, ranges, by_type)

#### Service Layer Updates

- [X] T041 [US3] Extend `src/services/property_service.py` with:
  - List properties with filtering and pagination
  - Get single property with price history
  - Statistics aggregation queries

#### Schema Updates

- [X] T042 [US3] Update `src/api/schemas.py` with response models matching API contracts:
  - Paginated property list response
  - Property detail with price_history
  - Statistics response

#### Main App Integration

- [X] T043 [US3] Update `src/main.py` to include property and stats routers

**Checkpoint**: User Story 3 complete - all API endpoints functional per contracts/api.md

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Documentation

- [X] T044 [P] Update `README.md` with complete usage instructions
- [X] T045 [P] Add docstrings to all public modules and functions

### Error Handling & Logging

- [X] T046 Add comprehensive error handling in `src/crawler/imap_client.py` (connection failures, auth errors)
- [X] T047 Add logging throughout crawler and API modules using `config.LOG_LEVEL`
- [~] T048 Implement error response format per API contracts in `src/api/dependencies.py` or middleware

### Testing & Quality

- [~] T049 [P] Create `tests/unit/test_models.py` with database model validation tests
- [~] T050 [P] Create `tests/e2e/test_full_flow.py` with end-to-end test (start API, trigger crawl, verify property, check history)
- [~] T051 Run black formatter on all source files
- [~] T052 Run flake8 linting and fix any issues
- [~] T053 Run mypy type checking and fix any issues

### Validation

- [X] T054 Validate `quickstart.md` steps work correctly:
  - Virtual environment setup
  - Dependency installation
  - `.env` configuration
  - Database initialization
  - API startup
  - Manual crawl trigger
  - Property query via API

**Checkpoint**: All polish items complete, code quality verified, quickstart validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - T007 (config.py) must complete before any code using constants
  - T009-T011 (database) must complete before any models usage
  - T012-T017 (API foundation) must complete before route implementations
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
  - Core: Parser → IMAP Client → Crawler Service → Scheduler → API Routes
  - Must use `config.GMAIL_SENDER_FILTER` constant throughout for sender email
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) and US1 Crawler Service complete
  - Extends US1 crawler service with price tracking
  - Adds price-drop endpoint
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) complete
  - Can proceed in parallel with US1/US2 (different files)
  - Needs Property model from Foundational

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "T019 [P] [US1] Create tests/unit/test_parser.py"
Task: "T020 [P] [US1] Create tests/unit/test_imap_client.py"
Task: "T021 [US1] Create tests/integration/test_crawler.py"

# Launch parser and IMAP client in parallel (no dependencies):
Task: "T023 [US1] Create src/crawler/parser.py"
Task: "T024 [US1] Create src/crawler/imap_client.py"

# Then service (depends on parser and IMAP client):
Task: "T025 [US1] Create src/crawler/service.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (hourly crawl, property storage, basic API)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Configure Gmail IMAP credentials
   - Start API server
   - Trigger manual crawl or wait for hourly
   - Verify properties stored with correct fields
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
   - Hourly automatic crawl
   - Property discovery from idealista emails
   - Basic property API endpoints
3. Add User Story 2 → Test independently → Deploy/Demo
   - Price change tracking
   - Price history preservation
   - Price-drop filtering endpoint
4. Add User Story 3 → Test independently → Deploy/Demo
   - Complete REST API with filtering/sorting
   - Statistics endpoint
   - Full pagination support
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (crawler core)
   - Developer B: User Story 2 (price tracking)
   - Developer C: User Story 3 (API endpoints)
3. Stories complete and integrate independently

---

## Summary

**Total Tasks**: 54

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Setup | T001-T006 (6) | Project initialization |
| Phase 2: Foundational | T007-T017 (11) | Core infrastructure |
| Phase 3: US1 (P1) | T018-T030 (13) | Automatic Property Discovery |
| Phase 4: US2 (P2) | T031-T036 (6) | Price Change Tracking |
| Phase 5: US3 (P3) | T037-T043 (7) | REST API Access |
| Phase 6: Polish | T044-T054 (11) | Quality & validation |

**Task Count Per User Story**:
- US1 (P1): 13 tasks (including optional tests)
- US2 (P2): 6 tasks (including optional tests)
- US3 (P3): 7 tasks (including optional tests)

**Parallel Opportunities Identified**:
- Phase 1: All 5 tasks can run in parallel (marked [P])
- Phase 2: T002-T005, T009-T010, T012-T014, T016 can run in parallel
- US1 Tests: T018-T020 can run in parallel
- US1 Models: T022-T024 can run in parallel (after foundation)
- US2 Tests: T031-T032 can run in parallel
- US3 Tests: T037-T038 can run in parallel
- Polish: T044-T045, T049-T053 can run in parallel

**Independent Test Criteria**:
- **US1**: Configure Gmail IMAP, trigger crawl, verify properties stored with correct fields
- **US2**: Insert property, simulate price drop email, verify update and history
- **US3**: Make HTTP requests, verify JSON responses, test filtering/sorting

**Suggested MVP Scope**: Complete Phase 1 + Phase 2 + Phase 3 (US1 only)
- This delivers the core value: automatic hourly property discovery
- Users can see properties via API
- Price tracking and full API features come in subsequent stories

**CFG Constants to Use Throughout**:
- `GMAIL_SENDER_FILTER = "noresponder@idealista.com"` - Use in parser, IMAP client, service
- `CRAWL_INTERVAL_HOURS = 1` - Use in scheduler
- Database and API configuration from Pydantic Settings

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (if tests requested)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Use `config.GMAIL_SENDER_FILTER` constant everywhere instead of hardcoding email
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
