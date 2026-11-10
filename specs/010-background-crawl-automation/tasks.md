# Tasks: Automated Background Crawling and Human Challenge Notifications

**Feature Branch**: `010-background-crawl-automation`  
**Input**: Design documents from `/specs/010-background-crawl-automation/` (`plan.md`, `spec.md`, `data-model.md`, `contracts/crawler-automation-contract.md`, `research.md`, `quickstart.md`)  
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/`  
**Tests**: Automated unit tests are REQUIRED per Constitution Principle II (Testing Standards) and feature specifications.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configure extension manifest permissions and extend TypeScript domain schemas.

- [X] T001 Add `"notifications"` permission to `extension/public/manifest.json`
- [X] T002 [P] Extend configuration and stats interfaces (`auto_crawl_enabled: boolean`, `auto_crawl_interval_hours: number`, `LastCrawlStats.trigger: 'manual' | 'automatic'`) and define `ActiveChallengeState` in `extension/src/types/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Storage management defaults and options settings UI required across all user stories.

**⚠️ CRITICAL**: No user story work can begin until this foundational phase is complete.

- [X] T003 [P] Unit test for storage configuration defaults (`auto_crawl_enabled: false`, `auto_crawl_interval_hours: 24`) and crawl stats persistence in `extension/src/services/__tests__/storage_config.test.ts`
- [X] T004 [P] Update storage helpers in `extension/src/services/storage.ts` to persist and retrieve `auto_crawl_enabled`, `auto_crawl_interval_hours`, and crawl completion stats with execution origin
- [X] T005 [P] Add automated crawl configuration fields (toggle checkbox and hours interval input, min 1, default 24) to the options page template in `extension/src/options/index.html`
- [X] T006 Update options script in `extension/src/options/index.ts` to load, display, and save `auto_crawl_enabled` and `auto_crawl_interval_hours` settings

**Checkpoint**: Foundational schemas, storage helpers, and configuration UI ready. User story implementation can now begin.

---

## Phase 3: User Story 1 - Non-Intrusive Background Pagination for Search Crawling (Priority: P1) 🎯 MVP

**Goal**: Execute search listing pagination completely in inactive background tabs (`active: false`) without stealing window focus or switching the user's active tab.

**Independent Test**: Launch a multi-page search crawl while actively typing or reading in another tab. Confirm that page 1, 2, and subsequent pages load in an inactive tab without stealing focus, and that the crawl tab closes quietly upon completion.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [P] [US1] Unit test for background tab navigation verifying `chrome.tabs.create` and `chrome.tabs.update` pass `{ active: false }` and preserve active tab in `extension/src/services/__tests__/background_nav.test.ts`

### Implementation for User Story 1

- [X] T008 [US1] Refactor `navigateToUrl` in `extension/src/services/crawler.ts` to create and update tabs with `{ url: safeUrl, active: false }`
- [X] T009 [US1] Manage a single dedicated search crawl tab reference (`crawlTabId`) in `extension/src/services/crawler.ts` to prevent tab leakage across multi-page navigation
- [X] T010 [US1] Ensure clean tab removal (`chrome.tabs.remove`) upon search crawl completion or cancellation in `extension/src/services/crawler.ts`

**Checkpoint**: User Story 1 is functional. Search pagination proceeds silently in the background with zero focus stealing.

---

## Phase 4: User Story 2 - Desktop & Browser Alerts for Human Review Blocks (Priority: P2)

**Goal**: When a security challenge or human verification block appears during search or detail crawl, immediately bring the challenge tab to the front, emit a persistent desktop notification (`requireInteraction: true`), and allow clicking the alert to focus the tab/window, resuming automatically once resolved.

**Independent Test**: Simulate or encounter an anti-bot challenge during a crawl. Confirm that the challenge tab is immediately activated in foreground, a sticky desktop notification appears, clicking the notification focuses the window/tab, and the crawl resumes automatically when the challenge is solved (or aborts on 5–10 min timeout).

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US2] Unit test for challenge notification dispatch, click-to-focus listener, and 5–10 min safety timeout in `extension/src/services/__tests__/challenge_notification.test.ts`

### Implementation for User Story 2

- [X] T012 [US2] Implement shared challenge detection helper in `extension/src/utils/challenge.ts` detecting Turnstile, CAPTCHAs, and verification barriers on both search and detail DOMs
- [X] T013 [US2] Integrate challenge detection, immediate tab focus (`chrome.tabs.update(tabId, { active: true })`), crawl pause, and safety timeout into search page navigation in `extension/src/services/crawler.ts`
- [X] T014 [US2] Implement desktop notification dispatch (`chrome.notifications.create` with `requireInteraction: true`, `priority: 2`) and click-to-focus handler (`chrome.notifications.onClicked`) in `extension/src/background.ts`
- [X] T015 [US2] Connect `detail_crawler.ts` challenge detection to the desktop notification dispatcher in `extension/src/background.ts`, maintaining active tab focus and the 5–10 minute timeout
- [X] T016 [US2] Implement automatic challenge resolution polling in both `crawler.ts` and `detail_crawler.ts` to dismiss notifications and return to background crawling once the challenge is solved

**Checkpoint**: User Stories 1 and 2 are functional. Crawls run in the background and only alert the user with desktop notifications and focused tabs when human interaction is required.

---

## Phase 5: User Story 3 - Automated Configurable Periodic Background Crawling (Default: 24h) (Priority: P3)

**Goal**: Automatically trigger a full background crawl when the configured interval (default: 24h) has elapsed since the last complete crawl (manual or automatic), evaluating on browser startup (`onStartup`) and periodic alarms (`alarms.onAlarm`), with mutual exclusion and desktop alert if backend is unreachable.

**Independent Test**: Enable auto-crawl in settings with a 24-hour interval. Simulate a last complete crawl timestamp older than 24 hours. Trigger startup or alarm evaluation. Confirm that a full crawl starts silently in the background, updates `lastCrawlStats.completedAt` on finish, and resets the countdown for both manual and automatic runs.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T017 [P] [US3] Unit test for schedule evaluation (elapsed time $\ge$ interval, enabled toggle, concurrency guard, backend connectivity error notification, and manual crawl reset) in `extension/src/services/__tests__/auto_crawl_schedule.test.ts`

### Implementation for User Story 3

- [X] T018 [US3] Register periodic alarm (`AUTO_CRAWL_SCHEDULE_ALARM` every 30 minutes) and startup listeners in `extension/src/background.ts` to evaluate crawl schedule
- [X] T019 [US3] Implement schedule evaluator in `extension/src/background.ts` checking `auto_crawl_enabled`, `auto_crawl_interval_hours` (default 24), and elapsed time since `lastCrawlStats.completedAt`
- [X] T020 [US3] Implement backend availability check (`/health`) in `extension/src/background.ts` that triggers a desktop notification if unreachable and defers execution to the next cycle
- [X] T021 [US3] Implement mutual exclusion in `extension/src/background.ts` preventing new crawl runs if `crawlState.is_running === true`
- [X] T022 [US3] Update full crawl completion logic in `extension/src/services/crawler.ts` to update `lastCrawlStats.completedAt = Date.now()` and record `trigger` ('manual' or 'automatic'), resetting the countdown for either trigger origin

**Checkpoint**: User Stories 1, 2, and 3 are functional. The extension provides hands-free periodic crawling with full user configurability.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Type validation, build verification, and end-to-end regression validation.

- [X] T023 [P] Type check and compile extension bundle with `npm run build` in `extension/`
- [X] T024 [P] Run entire extension test suite with `npm test` in `extension/`
- [X] T025 Execute quickstart validation scenarios from `specs/010-background-crawl-automation/quickstart.md`
- [X] T026 Rebuild Docker container per `AGENTS.md` operational guide (`docker compose up -d --build`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational (Phase 2).
  - Can proceed sequentially: US1 (P1) → US2 (P2) → US3 (P3).
- **Polish (Phase 6)**: Depends on completion of all user story implementations.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Phase 2. Establishes background tab navigation for searches.
- **User Story 2 (P2)**: Builds upon US1's background navigation by adding challenge detection and notification alerts.
- **User Story 3 (P3)**: Relies on US1 and US2 to execute the scheduled crawls unobtrusively in the background.

### Parallel Opportunities

- T001 and T002 in Phase 1 can run in parallel.
- T003, T004, and T005 in Phase 2 can run in parallel.
- Test tasks marked with `[P]` (T007, T011, T017) can be written in parallel prior to each phase.
- T023 and T024 in Phase 6 can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch test and tab navigation tasks for US1 in parallel:
Task: "Unit test for background tab navigation in extension/src/services/__tests__/background_nav.test.ts"
Task: "Refactor navigateToUrl in extension/src/services/crawler.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`manifest.json` and types).
2. Complete Phase 2: Foundational (storage and options UI).
3. Complete Phase 3: User Story 1 (background search pagination).
4. **VALIDATE**: Run a search crawl and confirm zero tab focus stealing.

### Incremental Delivery

1. **Increment 1 (MVP)**: Background search pagination (US1) eliminates browser focus stealing.
2. **Increment 2**: Human review alerts (US2) bring tabs forward and fire persistent desktop notifications.
3. **Increment 3**: Configurable periodic auto-crawl (US3) automates daily updates without user intervention.
4. **Increment 4**: Cross-cutting verification, typecheck, tests, and Docker deployment.
