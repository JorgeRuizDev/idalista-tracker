# Implementation Plan: Chrome Extension Property Crawler

**Branch**: `[003-chrome-extension-crawler]` | **Date**: 2026-05-10 | **Spec**: [specs/003-chrome-extension-crawler/spec.md](specs/003-chrome-extension-crawler/spec.md)
**Input**: Feature specification from `/specs/003-chrome-extension-crawler/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a Chrome extension that crawls property listings from Idealista saved searches. The extension will:
1. Detect all saved searches from the user's Idealista account
2. Allow users to select which searches to crawl
3. Systematically navigate through search results pages
4. Extract property data (ID, title, price, location, size, etc.)
5. Send data in batches to a configured API server
6. Implement human-like behavior (random delays, fake scrolling) to avoid detection

The API backend will be extended with batch ingestion endpoints and property history tracking (change detection, missing property identification, sold property flagging).

## Technical Context

**Language/Version**: TypeScript 5.3+ (extension), Python 3.11+ (backend)  
**Primary Dependencies**: 
- Extension: Chrome Extension Manifest V3, Vite (build), vanilla TypeScript
- Backend: FastAPI (existing), MongoDB (existing)
**Storage**: Chrome Storage API (extension state), MongoDB (properties, history)
**Testing**: Manual testing in Chrome, pytest for backend (existing)
**Target Platform**: Chrome v88+ (Manifest V3 support)
**Project Type**: Browser extension + web service API
**Performance Goals**: 
- Batch API ingestion: 1000 properties in <30 seconds
- Extension: Process 1 page every 5-15 seconds (human-like delays)
- UI: Configure and start crawl in <3 minutes
**Constraints**:
- Must comply with Chrome Web Store policies
- Human-like delays: 2-8s per page, 5-15s between pages
- Max 5 retries on network errors
- Handle rate limiting (429) with 5-min pause
**Scale/Scope**:
- Single user extension (initially)
- Support for 10+ saved searches
- Handle 100+ pages per search
- Track property history over months

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gates Determined from Constitution

| Principle | Check | Status | Notes |
|-----------|-------|--------|-------|
| **I. Code Quality** | TypeScript strict mode enabled | ✅ PASS | Strict typing required |
| **I. Code Quality** | ESLint + Prettier configured | ✅ PASS | Standard toolchain |
| **II. Testing Standards** | Manual testing plan defined | ✅ PASS | See quickstart.md |
| **II. Testing Standards** | Backend tests for API | ✅ PASS | Extend existing pytest |
| **III. UX Consistency** | Extension follows Chrome UI patterns | ✅ PASS | Standard popup/options |
| **IV. Performance** | Human-like delays included | ✅ PASS | Configurable limits |
| **V. Simplicity** | No unnecessary dependencies | ✅ PASS | Vanilla TS, no frameworks |

### Complexity Assessment

| Aspect | Assessment | Justification |
|--------|------------|---------------|
| Number of Projects | 2 (existing Python backend + new extension) | Extension required for DOM access |
| Code Complexity | Medium | DOM extraction, state management, API communication |
| External Dependencies | Minimal | Chrome APIs, standard build tools |
| Data Model Changes | Medium | Add history tracking, change detection |

**Constitution Check**: ✅ PASSED - All principles respected, no unjustified complexity.

## Project Structure

### Documentation (this feature)

```text
specs/003-chrome-extension-crawler/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - HTML structure analysis
├── data-model.md        # Phase 1 output - Entity definitions
├── quickstart.md        # Phase 1 output - Development setup guide
├── contracts/           # Phase 1 output
│   └── api.md           # API contracts for batch ingestion
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
idalista-tracker/
├── extension/                    # NEW: Chrome Extension (TypeScript)
│   ├── src/
│   │   ├── background.ts         # Service worker - crawl orchestration
│   │   ├── content/
│   │   │   ├── index.ts          # Content script entry
│   │   │   ├── searches.ts       # Saved searches extraction
│   │   │   └── listings.ts       # Property listings extraction
│   │   ├── popup/
│   │   │   ├── index.html        # Popup UI
│   │   │   ├── index.ts          # Popup logic
│   │   │   └── styles.css        # Popup styles
│   │   ├── options/
│   │   │   ├── index.html        # Options page
│   │   │   ├── index.ts          # Options logic
│   │   │   └── styles.css        # Options styles
│   │   ├── services/
│   │   │   ├── api.ts            # API communication
│   │   │   ├── crawler.ts        # Crawl orchestration
│   │   │   └── storage.ts        # Chrome storage wrapper
│   │   ├── utils/
│   │   │   ├── dom.ts            # DOM extraction utilities
│   │   │   ├── human-like.ts     # Human behavior simulation
│   │   │   └── parsers.ts        # Data parsing utilities
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   ├── public/
│   │   ├── manifest.json         # Extension manifest (V3)
│   │   ├── icons/                # Extension icons (16,32,48,128px)
│   │   └── _locales/             # i18n files
│   ├── dist/                     # Compiled output (gitignored)
│   ├── package.json              # Node dependencies
│   ├── tsconfig.json             # TypeScript config
│   └── vite.config.ts            # Build configuration
│
├── src/                          # EXISTING: Python backend
│   ├── api/
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── properties.py     # MODIFY: Add batch endpoint
│   │   └── main.py               # MODIFY: Register new routes
│   ├── services/
│   │   ├── property_service.py   # MODIFY: Add batch processing
│   │   └── crawl_service.py      # NEW: Crawl session management
│   └── models/
│       ├── property.py           # MODIFY: Add status, search_ids
│       ├── property_history.py   # NEW: History tracking
│       ├── property_change.py    # NEW: Change tracking
│       └── crawl_session.py      # NEW: Session tracking
│
└── ... (other existing files)
```

**Structure Decision**: 
- Extension is a new top-level directory (`extension/`) with its own Node.js project
- Backend changes extend existing Python codebase
- Documentation follows spec kit pattern in `specs/003-chrome-extension-crawler/`
- The extension is isolated from the Python backend to allow independent build/deployment

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations identified. The two-project structure (Python backend + TypeScript extension) is justified because:
1. Chrome extensions cannot be built in Python (must use JS/TS)
2. The extension needs to access the DOM, which requires browser extension APIs
3. The backend already exists and handles data persistence
4. This is the minimal viable architecture for the feature

## Implementation Phases

### Phase 0: Research (Complete)

**Deliverable**: [research.md](research.md)

Key findings:
- Saved searches: `article[data-searchid]` with data attributes
- Property listings: `article[data-element-id]` with `.item-info-container` for details
- Pagination: `.pagination li.next a[href]` for navigation
- Manifest V3 required for Chrome Web Store compatibility

### Phase 1: Design (Complete)

**Deliverables**:
- [data-model.md](data-model.md) - Entity definitions with relationships
- [contracts/api.md](contracts/api.md) - API contracts for batch ingestion
- [quickstart.md](quickstart.md) - Development environment setup

Key design decisions:
1. **TypeScript with strict mode** for type safety
2. **Manifest V3** with service worker background script
3. **Chrome Storage API** for state persistence
4. **Batch API** for efficient property ingestion
5. **Human-like behavior** with configurable delays

### Phase 2: Tasks (Pending)

Will be generated by `/speckit.tasks` command. Expected task categories:
1. Extension project setup (manifest, build, types)
2. Content scripts (saved searches extraction, listings extraction)
3. Background script (crawl orchestration, state management)
4. Popup UI (search selection, crawl control, progress)
5. Options page (configuration)
6. Backend API (batch endpoint, history tracking)
7. Data models (PropertyHistory, PropertyChange, CrawlSession)
8. Integration testing

## Key Technical Decisions

### 1. Extension Architecture

**Decision**: Manifest V3 with TypeScript

**Rationale**:
- Manifest V3 is the modern Chrome standard
- TypeScript provides type safety for complex DOM extraction
- Strict mode prevents runtime errors
- Can share types with future TypeScript frontend

### 2. DOM Extraction Strategy

**Decision**: Content scripts with specific CSS selectors

**Selectors**:
- Saved searches: `article.your-searches__card`
- Properties: `article.item[data-element-id]`
- Pagination: `.pagination li.next a[href]`

**Rationale**: 
- Selectors are stable and well-defined
- Data attributes (`data-searchid`, `data-element-id`) provide reliable IDs
- Abstraction layer can adapt if structure changes

### 3. State Management

**Decision**: Chrome Storage API with structured state object

**Rationale**:
- Persists across browser sessions
- Survives browser crashes
- Structured storage for complex crawl state
- No external dependencies

### 4. Human-Like Behavior

**Decision**: Configurable random delays and scroll simulation

**Configuration**:
- Page load: 2-8 seconds
- Between pages: 5-15 seconds
- Scroll: Smooth scroll with random steps

**Rationale**: Reduces detection risk while maintaining crawl efficiency

### 5. API Design

**Decision**: RESTful batch endpoint with comprehensive response

**Endpoint**: `POST /api/v1/properties/batch`

**Rationale**:
- Single call per page reduces network overhead
- Detailed response shows created/updated counts
- Error handling per property allows partial success

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Idealista HTML changes | Abstraction layer for selectors, monitoring |
| Rate limiting | Exponential backoff, configurable limits |
| Browser crashes | State persistence, resume capability |
| Large searches | Session persistence, progress tracking |
| Extension store rejection | Follow CWS guidelines, minimal permissions |

## Success Criteria Verification

From spec.md, verification approach:

| Criterion | How to Verify |
|-----------|---------------|
| SC-001: Configure in <3 min | User testing with stopwatch |
| SC-002: 95% crawl success | Compare extracted vs visible listings |
| SC-003: 1000 props <30 sec | Load testing with mock data |
| SC-004: 100% missing detection | Unit tests with known missing properties |
| SC-005: 100% change tracking | Unit tests with property updates |
| SC-006: Human-like delays | Log analysis, average 5s/10s |
| SC-007: Resume capability | Simulate crash, verify continuation |
| SC-008: History timeline | UI inspection, database verification |
| SC-009: No duplicates | Constraint tests, duplicate batch tests |
| SC-010: Rate limit handling | Mock 429 responses, verify pause/resume |
