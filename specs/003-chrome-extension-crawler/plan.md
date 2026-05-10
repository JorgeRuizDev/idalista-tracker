# Implementation Plan: Chrome Extension Property Crawler

**Branch**: `[003-chrome-extension-crawler]` | **Date**: 2026-05-10 | **Spec**: [specs/003-chrome-extension-crawler/spec.md](specs/003-chrome-extension-crawler/spec.md)
**Input**: Feature specification from `/specs/003-chrome-extension-crawler/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a Chrome extension that crawls property listings from Idealista saved searches and feeds them into the existing FastAPI backend. The extension will:
1. Detect all saved searches from the user's Idealista account
2. Allow users to select which searches to crawl
3. Systematically navigate through search results pages
4. Extract property data (ID, title, price, location, size, etc.)
5. Send data in batches to the configured API server
6. Implement human-like behavior (random delays, fake scrolling) to avoid detection

The existing FastAPI backend will be extended with:
- Batch ingestion endpoint
- Property history tracking (change detection)
- Missing property identification
- Sold property flagging (after 30 days missing)
- Saved search management

## Technical Context

**Language/Version**: TypeScript 5.3+ (extension), Python 3.11+ (backend)  
**Primary Dependencies**: 
- Extension: Chrome Extension Manifest V3, Vite (build), vanilla TypeScript
- Backend: FastAPI (existing), SQLAlchemy with SQLite (existing)
**Storage**: Chrome Storage API (extension state), SQLite (properties, history)
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
| **I. Code Quality** | Python code follows existing patterns | ✅ PASS | Extend existing service layer |
| **II. Testing Standards** | Manual testing plan defined | ✅ PASS | See quickstart.md |
| **II. Testing Standards** | Backend tests for API | ✅ PASS | Extend existing pytest |
| **III. UX Consistency** | Extension follows Chrome UI patterns | ✅ PASS | Standard popup/options |
| **IV. Performance** | Human-like delays included | ✅ PASS | Configurable limits |
| **V. Simplicity** | No unnecessary dependencies | ✅ PASS | Vanilla TS, no frameworks |
| **V. Simplicity** | Reuse existing backend | ✅ PASS | Extend don't replace |

### Complexity Assessment

| Aspect | Assessment | Justification |
|--------|------------|---------------|
| Number of Projects | 2 (existing Python backend + new extension) | Extension required for DOM access |
| Code Complexity | Medium | DOM extraction, state management, API communication |
| External Dependencies | Minimal | Chrome APIs, standard build tools |
| Data Model Changes | Medium | Add 4 new models, modify Property model |

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
│   │   │   ├── crawl.py          # MODIFY: Add session endpoints
│   │   │   ├── properties.py     # MODIFY: Add batch endpoint
│   │   │   └── searches.py       # NEW: Saved search management
│   │   ├── schemas.py            # MODIFY: Add new schemas
│   │   └── dependencies.py       # EXISTING: DB session dependency
│   │
│   ├── services/
│   │   ├── property_service.py   # MODIFY: Add batch processing
│   │   └── crawl_service.py      # NEW: Crawl session management
│   │
│   ├── database/
│   │   ├── models.py             # MODIFY: Add new models
│   │   └── init.py               # MODIFY: Add new tables
│   │
│   ├── crawler/                  # EXISTING: Gmail crawler
│   │   └── (keep existing)
│   │
│   └── main.py                   # MODIFY: Register new routes
│
└── ... (other existing files)
```

**Structure Decision**: 
- Extension is a new top-level directory (`extension/`) with its own Node.js project
- Backend changes extend existing Python codebase
- Documentation follows spec kit pattern in `specs/003-chrome-extension-crawler/`
- The extension is isolated from the Python backend to allow independent build/deployment
- Database uses existing SQLAlchemy/SQLite setup (not MongoDB)

## Backend Modifications Required

### 1. Database Models (`src/database/models.py`)

**Modify Existing**:
- `Property` - Add `status`, `first_seen_at`, `last_seen_at`, `missing_since`

**Add New**:
- `CrawlSession` - Track crawl sessions
- `SavedSearch` - Store Idealista saved searches
- `PropertyVisibility` - Track seen/missing events
- `PropertyChange` - Track all attribute changes (not just price)
- `crawl_session_property` - Association table for many-to-many

See [data-model.md](data-model.md) for full model definitions.

### 2. API Routes

**Modify**:
- `src/api/routes/properties.py` - Add `POST /properties/batch`
- `src/api/routes/crawl.py` - Add crawl session endpoints

**Create**:
- `src/api/routes/searches.py` - Saved search management

### 3. Services

**Modify**:
- `src/services/property_service.py` - Add batch processing logic

**Create**:
- `src/services/crawl_service.py` - Crawl session management

### 4. Database Migration

Create Alembic migration to:
1. Create new tables (CrawlSession, SavedSearch, PropertyVisibility, PropertyChange)
2. Create association table
3. Add columns to Property table
4. Backfill data where needed

See [data-model.md](data-model.md) for migration script.

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
- [data-model.md](data-model.md) - SQLAlchemy model definitions with migrations
- [contracts/api.md](contracts/api.md) - API contracts (no auth required)
- [quickstart.md](quickstart.md) - Development environment setup

Key design decisions:
1. **TypeScript with strict mode** for type safety
2. **Manifest V3** with service worker background script
3. **Chrome Storage API** for state persistence
4. **Batch API** for efficient property ingestion
5. **Existing FastAPI/SQLite backend** extended with new models
6. **No authentication** (local/self-hosted use)

### Phase 2: Tasks (Pending)

Will be generated by `/speckit.tasks` command. Expected task categories:
1. Extension project setup (manifest, build, types)
2. Content scripts (saved searches extraction, listings extraction)
3. Background script (crawl orchestration, state management)
4. Popup UI (search selection, crawl control, progress)
5. Options page (configuration)
6. Backend API (batch endpoint, history tracking)
7. Database models (CrawlSession, SavedSearch, PropertyVisibility, PropertyChange)
8. Database migration (Alembic)
9. Integration testing

## Key Technical Decisions

### 1. Extension Architecture

**Decision**: Manifest V3 with TypeScript

**Rationale**:
- Manifest V3 is the modern Chrome standard
- TypeScript provides type safety for complex DOM extraction
- Strict mode prevents runtime errors
- Can share types with future TypeScript frontend

### 2. Backend Architecture

**Decision**: Extend existing FastAPI/SQLAlchemy backend

**Rationale**:
- Backend already exists and works
- SQLite is sufficient for single-user use
- SQLAlchemy migrations handle schema changes
- No need for separate database or infrastructure

### 3. DOM Extraction Strategy

**Decision**: Content scripts with specific CSS selectors

**Selectors**:
- Saved searches: `article.your-searches__card`
- Properties: `article.item[data-element-id]`
- Pagination: `.pagination li.next a[href]`

**Rationale**: 
- Selectors are stable and well-defined
- Data attributes (`data-searchid`, `data-element-id`) provide reliable IDs
- Abstraction layer can adapt if structure changes

### 4. State Management

**Decision**: Chrome Storage API with structured state object

**Rationale**:
- Persists across browser sessions
- Survives browser crashes
- Structured storage for complex crawl state
- No external dependencies

### 5. Human-Like Behavior

**Decision**: Configurable random delays and scroll simulation

**Configuration**:
- Page load: 2-8 seconds
- Between pages: 5-15 seconds
- Scroll: Smooth scroll with random steps

**Rationale**: Reduces detection risk while maintaining crawl efficiency

### 6. API Design

**Decision**: RESTful batch endpoint with comprehensive response

**Endpoint**: `POST /api/v1/properties/batch`

**Authentication**: None required (local/self-hosted)

**Rationale**:
- Single call per page reduces network overhead
- Detailed response shows created/updated counts
- Error handling per property allows partial success
- No auth simplifies local deployment

### 7. Data Model Design

**Decision**: Extend existing models with history tracking

**Key Additions**:
- `Property.status` - active/missing/sold
- `PropertyVisibility` - seen/missing events
- `PropertyChange` - all attribute changes
- `CrawlSession` - track crawl operations
- `SavedSearch` - manage search configurations

**Rationale**:
- Maintains compatibility with existing Gmail crawler
- Provides complete audit trail
- Enables sold property detection
- Tracks all changes, not just price

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Idealista HTML changes | Abstraction layer for selectors, monitoring |
| Rate limiting | Exponential backoff, configurable limits |
| Browser crashes | State persistence, resume capability |
| Large searches | Session persistence, progress tracking |
| Extension store rejection | Follow CWS guidelines, minimal permissions |
| Database schema conflicts | Alembic migrations, backward compatibility |

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

## Development Notes

### Database Migration Flow

1. Create Alembic migration script
2. Run migration: `alembic upgrade head`
3. Verify new tables/columns created
4. Test with existing data (backward compatibility)

### Backend Development

1. Add new models to `src/database/models.py`
2. Create migration: `alembic revision --autogenerate -m "add extension crawler models"`
3. Add batch endpoint to `src/api/routes/properties.py`
4. Add crawl service in `src/services/crawl_service.py`
5. Test endpoints with curl/httpie

### Extension Development

1. Set up Node.js project in `extension/`
2. Build with Vite: `npm run dev`
3. Load in Chrome: `chrome://extensions/` → Load Unpacked
4. Test against running backend

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Set up extension project structure
3. Create database migration
4. Implement batch API endpoint
5. Build extension content scripts
6. Test end-to-end flow
