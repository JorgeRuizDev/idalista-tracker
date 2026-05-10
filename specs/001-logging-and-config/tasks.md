# Tasks: Logging and Configuration Settings

**Input**: Design documents from `/specs/001-logging-and-config/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and package structure

- [X] T001 Create package directory structure: `idalista_tracker/` with `__init__.py` and `config/` subdirectory
- [X] T002 Create test directory structure: `tests/` with `test_config/` and `__init__.py` files
- [X] T003 [P] Create `.env.example` file with all environment variable placeholders

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core configuration infrastructure that MUST be complete before user stories can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement `LoggerCfg` class in `idalista_tracker/config/logger.py` with all fields and validation
- [X] T005 [P] Implement `ServerCfg` class in `idalista_tracker/config/server.py` with all fields and validation
- [X] T006 [P] Implement `IdealistaCfg` class in `idalista_tracker/config/idealista.py` with all fields and validation
- [X] T007 Create `idalista_tracker/config/__init__.py` to export ServerCfg, LoggerCfg, IdealistaCfg
- [X] T008 Implement `configure_logging()` helper in `idalista_tracker/logging.py` with all parameters defaulting to None

**Checkpoint**: Foundation ready - all config classes and logging helper exist and can be imported

---

## Phase 3: User Story 1 - Configure Log Levels and Destinations (Priority: P1) 🎯 MVP

**Goal**: Developers can configure logging levels and output destinations, and logs are emitted correctly

**Independent Test**: Run application with LOG_LEVEL=DEBUG and LOG_OUTPUT=file, verify logs appear in the configured file at the correct level

### Implementation for User Story 1

- [X] T009 [US1] Add log level validation in `idalista_tracker/config/logger.py` (must be valid Python logging level)
- [X] T010 [US1] Add output destination validation in `idalista_tracker/config/logger.py` (stdout, stderr, or file)
- [X] T011 [US1] Implement stdout/stderr handler setup in `idalista_tracker/logging.py`
- [X] T012 [US1] Implement file handler setup in `idalista_tracker/logging.py` with directory creation
- [X] T013 [US1] Implement log format configuration (plain text) in `idalista_tracker/logging.py`
- [X] T014 [US1] Implement JSON format option in `idalista_tracker/logging.py`
- [X] T015 [US1] Handle logging backend failures gracefully in `idalista_tracker/logging.py` (don't crash if file can't be opened)

**Checkpoint**: At this point, User Story 1 should be fully functional - configure logging via env vars and see output

---

## Phase 4: User Story 2 - Externalize Application Settings (Priority: P1)

**Goal**: All application settings can be externalized and loaded from environment variables with sensible defaults

**Independent Test**: Start application without any .env file, verify it uses defaults successfully; then set env vars and verify they override defaults

### Implementation for User Story 2

- [X] T016 [US2] Add port range validation (1-65535) in `idalista_tracker/config/server.py`
- [X] T017 [US2] Add workers positive integer validation in `idalista_tracker/config/server.py`
- [X] T018 [US2] Add URL validation for `base_url` in `idalista_tracker/config/idealista.py`
- [X] T019 [US2] Add timeout range validation (1-300) in `idalista_tracker/config/idealista.py`
- [X] T020 [US2] Ensure `api_key` raises clear ValidationError when missing in `idalista_tracker/config/idealista.py`
- [X] T021 [US2] Verify configuration precedence works: defaults < .env < environment variables

**Checkpoint**: At this point, User Story 2 should be complete - all three config classes work with env vars and defaults

---

## Phase 5: User Story 3 - Hot-Reload Configuration (Priority: P2)

**Goal**: Log level can be changed at runtime without restarting the application

**Independent Test**: Start app, change LOG_LEVEL in .env, trigger reload, verify new log level takes effect within 5 seconds

### Implementation for User Story 3

- [ ] T022 [US3] Implement `reload()` method on `LoggerCfg` class in `idalista_tracker/config/logger.py`
- [ ] T023 [US3] Add file watching mechanism for `.env` file changes in `idalista_tracker/config/logger.py`
- [ ] T024 [US3] Implement hot-reload trigger in `idalista_tracker/logging.py` that reconfigures logging when config changes
- [ ] T025 [US3] Handle reload errors gracefully - keep last valid config if new config is invalid in `idalista_tracker/logging.py`
- [ ] T026 [US3] Add logging of configuration reload events

**Note**: User Story 3 (hot-reload) is P2 priority and skipped for this implementation. The core MVP (US1 and US2) is complete.

**Checkpoint**: At this point, User Story 3 should work - changing LOG_LEVEL and triggering reload updates logging

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, testing, and integration

- [X] T027 [P] Write unit tests for `ServerCfg` in `tests/test_config/test_server_cfg.py`
- [X] T028 [P] Write unit tests for `LoggerCfg` in `tests/test_config/test_logger_cfg.py`
- [X] T029 [P] Write unit tests for `IdealistaCfg` in `tests/test_config/test_idealista_cfg.py`
- [X] T030 Write unit tests for `configure_logging()` in `tests/test_logging.py`
- [X] T031 Update `main.py` to use `configure_logging()` and `ServerCfg`
- [X] T032 Create `conftest.py` with shared test fixtures
- [X] T033 Add `.env` to `.gitignore` if not already present

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Independent, delivers logging
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent, delivers configuration
- **User Story 3 (P2)**: Can start after User Story 1 (P1) - Builds on logging configuration

**Note**: US1 and US2 are both P1 and independent - they can be done in parallel after Foundation is complete

### Within Each User Story

- Configuration validation tasks can run in parallel
- Logging handler setup depends on validation
- Hot-reload depends on basic logging being functional

### Parallel Opportunities

- T005 and T006 can run in parallel (different config classes)
- T009, T010, T016, T017, T018 can run in parallel (validation tasks)
- T027, T028, T029 can run in parallel (different test files)

---

## Parallel Example: Foundational Phase

```bash
# Launch all config class implementations together:
Task: "Implement LoggerCfg class in idalista_tracker/config/logger.py"
Task: "Implement ServerCfg class in idalista_tracker/config/server.py"
Task: "Implement IdealistaCfg class in idalista_tracker/config/idealista.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 - Both P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Logging)
4. Complete Phase 4: User Story 2 (Configuration)
5. **STOP and VALIDATE**: Test both stories independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test logging works → Deploy/Demo (Partial MVP)
3. Add User Story 2 → Test configuration works → Deploy/Demo (Full MVP!)
4. Add User Story 3 → Test hot-reload → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Logging)
   - Developer B: User Story 2 (Configuration)
3. When both P1 stories complete:
   - Developer A or B: User Story 3 (Hot-reload)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- User Stories 1 and 2 are both P1 priority - neither blocks the other
