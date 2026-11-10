# Implementation Plan: Automated Background Crawling and Human Challenge Notifications

**Branch**: `010-background-crawl-automation` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-background-crawl-automation/spec.md`

## Summary

Enhance the Chrome extension property crawler to run entirely unobtrusively in the background by:
1. Converting search result navigation and multi-page pagination to inactive background tabs (`active: false`), preserving the user's active viewport without window or tab switching.
2. Integrating native Chrome / OS desktop notifications (`requireInteraction: true`) whenever an anti-bot challenge or human verification block appears, allowing users to click the alert to focus the challenge tab and resolve it immediately.
3. Adding an automated background crawl scheduler (via `chrome.alarms` and `chrome.runtime.onStartup`) with an enable/disable toggle and a configurable hourly interval (defaulting to 24 hours) in the extension options panel, initiating silent periodic crawls when the configured duration has elapsed since the last complete crawl (whether triggered manually or automatically) without interrupting user work.

## Technical Context

**Language/Version**: TypeScript 5.x (Chrome Extension Manifest V3), Python 3.11+ (Backend API)  
**Primary Dependencies**: Chrome Extension Manifest V3 APIs (`chrome.tabs`, `chrome.notifications`, `chrome.alarms`, `chrome.storage`), FastAPI, SQLAlchemy, Vitest  
**Storage**: Chrome Extension Local Storage (`chrome.storage.local`: `config`, `lastCrawlStats`, `crawlState`), SQLite backend (`idealista_properties.db`)  
**Testing**: `vitest`, mock Chrome extension API test harnesses (`vitest-chrome`), end-to-end browser validation  
**Target Platform**: Chromium-based browsers (Chrome, Edge, Brave) on Linux / Windows / macOS desktops; backend running on Docker/Linux  
**Project Type**: Chrome Extension Manifest V3 + FastAPI web service  
**Performance Goals**: Tab navigation transition < 100ms without focus changes; desktop notification dispatched within 3s of challenge detection; startup schedule evaluation < 500ms  
**Constraints**: Zero tab stealing during search pagination; no polling sleep loops that block service workers; persistent alarms surviving service worker teardown; mutual exclusion preventing concurrent duplicate crawls  
**Scale/Scope**: Runs daily per installation; manages ~10–50 searches and hundreds of listings per crawl run; zero interruption to user browsing sessions  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality
- ✅ Adheres to project TypeScript style and Manifest V3 practices.
- ✅ Strict typing for all messages, config schemas, and challenge notification payloads.
- ✅ Clean separation of concerns: background alarm coordinator (`background.ts`), search crawler (`crawler.ts`), detail crawler (`detail_crawler.ts`), and configuration storage (`storage.ts`).

### II. Testing Standards
- ✅ Unit tests for schedule evaluation logic (elapsed time calculation, enabled/disabled flag, concurrency guard).
- ✅ Unit tests for background tab navigation verifying `active: false` parameter on create and update calls.
- ✅ Unit tests for challenge notification trigger and click-to-focus resolution.

### III. UX Consistency
- ✅ Completely silent, non-intrusive background crawling respects user attention.
- ✅ Desktop notifications conform to standard OS styling with actionable text and clear title (*"Idalista Tracker: Verificación humana requerida"*).
- ✅ Configuration panel provides clean, accessible toggle controls consistent with existing settings design.

### IV. Performance Requirements
- ✅ Low memory and CPU footprint: ephemeral service worker wakes up via alarms, evaluates schedule in < 50ms, and sleeps if idle.
- ✅ Search pagination uses single reused background tab, avoiding tab leaks.

### V. Simplicity
- ✅ Leverages native Chrome platform capabilities (`chrome.alarms`, `chrome.notifications`) instead of heavy third-party scheduling or external push daemons.
- ✅ Reuses existing crawl session pipeline and status interfaces without modifying backend database schemas.

**Constitution Check**: ✅ PASSED — All architectural decisions strictly adhere to project constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/010-background-crawl-automation/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── crawler-automation-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
extension/
├── public/
│   └── manifest.json                    # Add "notifications" permission
├── src/
│   ├── background.ts                    # Alarm listener, startup check, notification click handler
│   ├── options/
│   │   ├── index.html                   # Auto-crawl toggle & interval configuration
│   │   └── index.ts                     # Options save/load handlers
│   ├── services/
│   │   ├── crawler.ts                   # Search pagination with active: false & challenge detection
│   │   ├── detail_crawler.ts            # Challenge notification dispatch integration
│   │   └── storage.ts                   # CrawlConfig update & lastCrawlStats trigger helpers
│   ├── types/
│   │   └── index.ts                     # CrawlConfig auto_crawl types, notification payloads
│   └── services/__tests__/
│       ├── auto_crawl_schedule.test.ts  # Schedule evaluation & concurrency unit tests
│       └── background_nav.test.ts       # Tab active:false & challenge notification tests
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None*    | N/A        | Standard native Chrome APIs used cleanly |
