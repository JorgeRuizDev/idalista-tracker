# Implementation Plan: Gmail Property Crawler

**Branch**: `002-gmail-property-crawler` | **Date**: 2026-05-10 | **Spec**: [specs/002-gmail-property-crawler/spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-gmail-property-crawler/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a Python-based system that connects to Gmail via IMAP, automatically crawls emails from `noresponder@idealista.com` every hour, extracts property data (using regex pattern matching), stores it in a local SQLite database with SQLAlchemy, tracks price changes, and exposes the data through a FastAPI REST API.

Key technical decisions:
- **Parsing**: Regex pattern matching for consistent idealista email format
- **Scheduler**: APScheduler for hourly crawls within the API process
- **Database**: SQLite with SQLAlchemy ORM for zero-config local storage
- **Web Framework**: FastAPI for automatic API documentation and async support
- **IMAP**: Python standard library imaplib for Gmail connection

## Technical Context

**Language/Version**: Python 3.11+  
**Package Manager**: [UV](https://docs.astral.sh/uv/) - Fast Python package installer and resolver  
**Primary Dependencies**: FastAPI, SQLAlchemy, APScheduler, Pydantic, pydantic-settings  
**Storage**: SQLite (single-file database)  
**Testing**: pytest with pytest-asyncio  
**Target Platform**: Local development server (Linux/macOS/Windows)  
**Project Type**: Web service (REST API with background scheduler)  
**Performance Goals**: API response < 2s for 1000 properties, crawl completes within 5 minutes  
**Constraints**: Single-user local deployment, SQLite limitations (no concurrent writes)  
**Scale/Scope**: Single Gmail account, local SQLite database, idealista emails only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Code Quality

✅ **PASS** - Will use:
- Black for formatting
- Flake8 for linting
- Type hints throughout
- Pre-commit hooks for enforcement

### Principle II: Testing Standards

✅ **PASS** - Will implement:
- Unit tests for email parser (test regex patterns)
- Unit tests for IMAP client (mocked)
- Integration tests for API endpoints
- E2E test for full crawl flow

### Principle III: User Experience Consistency

✅ **PASS** - REST API with:
- Consistent JSON response format
- Clear error messages
- Swagger/OpenAPI documentation at `/docs`
- HTTP status codes per contracts

### Principle IV: Performance Requirements

✅ **PASS** - Meets spec requirements:
- API response < 2s for 1000 properties (SQLAlchemy + SQLite)
- Hourly crawl within time budget
- SQLite sufficient for single-user scale

### Principle V: Simplicity

✅ **PASS** - Simple stack:
- No message broker (APScheduler in-process)
- No external database (SQLite)
- No caching layer needed
- Regex parsing vs ML/complex parsers

**Re-check after Phase 1**: All principles still pass with chosen design.

## Project Structure

### Documentation (this feature)

```text
specs/002-gmail-property-crawler/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # REST API contracts
└── tasks.md             # Phase 2 output (to be created)
```

### Source Code (repository root)

```text
idalista-tracker/
├── src/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app + scheduler initialization
│   ├── config.py               # Pydantic settings for env vars
│   ├── database/
│   │   ├── __init__.py
│   │   ├── models.py           # SQLAlchemy models (Property, PriceHistory, EmailSource)
│   │   ├── init.py             # Database initialization
│   │   └── session.py          # SQLAlchemy session management
│   ├── crawler/
│   │   ├── __init__.py
│   │   ├── imap_client.py      # Gmail IMAP connection handler
│   │   ├── parser.py           # Email content parser (regex-based)
│   │   ├── scheduler.py        # APScheduler configuration
│   │   └── service.py          # Crawl orchestration logic
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── properties.py   # GET /properties, GET /properties/{id}
│   │   │   ├── crawl.py        # POST /crawl/trigger, GET /crawl/status
│   │   │   └── stats.py        # GET /stats
│   │   ├── schemas.py          # Pydantic request/response models
│   │   └── dependencies.py     # DB session injection
│   └── services/
│       ├── __init__.py
│       └── property_service.py # Business logic for property CRUD
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # pytest fixtures
│   ├── fixtures/
│   │   └── sample_emails.txt   # Sample idealista email content
│   ├── unit/
│   │   ├── test_parser.py      # Parser unit tests
│   │   ├── test_imap_client.py # IMAP client tests (mocked)
│   │   └── test_models.py      # Database model tests
│   ├── integration/
│   │   ├── test_api.py         # API endpoint tests
│   │   └── test_crawler.py     # Crawler service tests
│   └── e2e/
│       └── test_full_flow.py   # End-to-end test
├── alembic/                    # Future: Database migrations
│   └── versions/
├── .env.example                # Environment variables template
├── requirements.txt            # Python dependencies
├── requirements-dev.txt        # Dev dependencies (pytest, black, etc.)
├── pyproject.toml              # Project config (black, pytest, mypy)
└── README.md                   # Project overview
```

**Structure Decision**: Single-project web service structure. No frontend needed (API-only). Backend organized into logical modules: database (models + session), crawler (IMAP + parsing + scheduling), api (FastAPI routes), services (business logic). Test structure mirrors source with unit/integration/e2e separation.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. All Constitution principles pass with the simple, focused architecture chosen.

## Implementation Phases

### Phase 0: Research ✓ COMPLETE

**Output**: [research.md](research.md)

Key decisions:
1. Regex parsing for idealista email format
2. SQLite + SQLAlchemy for data persistence
3. APScheduler for hourly crawls
4. FastAPI for REST API
5. imaplib (stdlib) for Gmail IMAP
6. Property ID extracted from URL pattern
7. Pydantic-settings for configuration

### Phase 1: Design ✓ COMPLETE

**Outputs**:
- [data-model.md](data-model.md) - SQLAlchemy models for Property, PriceHistory, EmailSource
- [contracts/api.md](contracts/api.md) - REST API endpoint specifications
- [quickstart.md](quickstart.md) - Developer setup and usage guide

**Database Schema**:
- 3 core entities: Property, PriceHistory, EmailSource
- Relationships: Property has many PriceHistory entries, belongs to one EmailSource
- Indexes on: idealista_id (unique), created_at, current_price, status

**API Endpoints**:
- GET /properties (list with filters)
- GET /properties/{idealista_id} (single property with history)
- GET /properties/price-drops (filtered list)
- POST /crawl/trigger (manual crawl)
- GET /crawl/status (crawl status)
- GET /stats (aggregate statistics)

**Email Parsing Pattern** (from example):
```
{title}\n{original_price}€ ↓{drop}%\n{current_price} €\n{size} m² {bedrooms} hab. {floor} {exterior?} {url}
```

### Phase 2: Task Generation (Next Step)

Ready for `/speckit.tasks` to generate implementation tasks based on:
- Feature specification
- This implementation plan
- Data model
- API contracts

## Dependencies

This project uses [UV](https://docs.astral.sh/uv/) for dependency management.

### Production

All production dependencies are defined in `pyproject.toml`:

```toml
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "sqlalchemy>=2.0.0",
    "alembic>=1.12.0",
    "apscheduler>=3.10.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
    "python-multipart>=0.0.6",
]
```

Install with: `uv sync`

### Development

Development dependencies are defined as optional extras:

```toml
[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.1.0",
    "black>=23.0.0",
    "flake8>=6.1.0",
    "mypy>=1.7.0",
    "httpx>=0.25.0",
]
```

Install with: `uv sync --extra dev`

## Configuration

Environment variables (via `.env` file):

```env
GMAIL_EMAIL=your.email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
DATABASE_URL=sqlite:///./idealista_properties.db
CRAWL_INTERVAL_HOURS=1
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
```

## Testing Strategy

### Unit Tests

- **test_parser.py**: Test regex patterns against sample emails
- **test_imap_client.py**: Mock IMAP responses, test connection handling
- **test_models.py**: Test SQLAlchemy model validation

### Integration Tests

- **test_api.py**: Test all endpoints with test database
- **test_crawler.py**: Test crawl service with mocked IMAP

### E2E Test

- **test_full_flow.py**: 
  1. Start API server
  2. Trigger crawl with mock email
  3. Verify property stored
  4. Query API for property
  5. Verify price history tracked

## Deployment

### Local Development

```bash
# 1. Setup (install dependencies)
uv sync

# 2. Configure
cp .env.example .env
# Edit .env with your credentials

# 3. Initialize
uv run src/database/init.py

# 4. Run
# Option 1: Run main.py directly (recommended)
uv run src/main.py

# Option 2: Run with uvicorn explicitly
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

### Production (Future)

- Docker containerization
- Environment-based configuration
- Logging to file/syslog
- Health check endpoint
- Process manager (systemd/supervisor)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Idealista changes email format | High | Parser logging to detect failures early; versioned parser |
| Gmail API/IMAP changes | Medium | Use standard IMAP, monitor for deprecation notices |
| SQLite concurrency issues | Low | Single-process design; document limitation |
| Property URL format changes | Medium | URL parsing with regex; fallback patterns |
| Missing data in emails | Low | Nullable fields in schema; validation per field |

## Future Enhancements (Out of Scope)

- Web UI for browsing properties
- Email notifications for price drops
- Support for other property sites (fotocasa, etc.)
- Machine learning for better parsing
- PostgreSQL backend for multi-user
- Property image extraction
- Geocoding for map visualization
- Export to CSV/Excel
