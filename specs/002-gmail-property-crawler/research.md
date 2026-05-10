# Research: Gmail Property Crawler

**Feature**: Gmail Property Crawler  
**Generated**: 2026-05-10  
**Status**: Complete

## Decisions Made

### 1. Email Parsing Strategy

**Decision**: Use regex pattern matching for idealista email format

**Rationale**: 
- Email format is consistent and structured
- Contains clear delimiters (€, m², hab., planta)
- URL is always present with extractable ID
- Regex provides reliable extraction without heavy dependencies

**Pattern Identified**:
```
{title}\n{original_price}€ ↓{drop_percentage}%\n{current_price} €\n{size} m² {bedrooms} hab. {floor} {exterior/interior} {url}
```

**Alternatives considered**:
- HTML parsing: Not needed as plain text is sufficient
- Machine learning: Overkill for structured format
- External parsing service: Adds unnecessary complexity

### 2. Database Technology

**Decision**: SQLite with SQLAlchemy ORM

**Rationale**:
- Specified in requirements
- Single-file, zero-config database
- Perfect for local single-user application
- SQLAlchemy provides ORM abstraction and future migration path

**Alternatives considered**:
- PostgreSQL: Overkill for single-user local use
- JSON file: Loses relational integrity and query capabilities

### 3. Scheduling Mechanism

**Decision**: APScheduler with background executor

**Rationale**:
- Pure Python, no external cron dependency
- Integrates well with FastAPI/Flask applications
- Supports interval-based scheduling (hourly crawls)
- Can run within the same process as the API

**Alternatives considered**:
- System cron: Requires external configuration
- Celery: Overkill, needs message broker
- Manual sleep loops: Less reliable

### 4. Web Framework

**Decision**: FastAPI

**Rationale**:
- Modern Python async framework
- Automatic API documentation (Swagger/OpenAPI)
- Type hints and validation built-in
- Easy to integrate with SQLAlchemy

**Alternatives considered**:
- Flask: Mature but lacks async and auto-docs
- Django: Too heavy for this use case
- Starlette: Lower-level, FastAPI builds on it

### 5. IMAP Library

**Decision**: imaplib (standard library) + email.parser

**Rationale**:
- No external dependencies
- Sufficient for Gmail IMAP
- Well-documented in Python standard library

**Alternatives considered**:
- imap-tools: Provides higher-level abstractions but adds dependency
- pyzmail: Overkill for simple email fetching

### 6. Property ID Extraction

**Decision**: Regex to extract numeric ID from URL path

**Pattern**: `https://www.idealista.com/inmueble/(\d+)/`

**Rationale**:
- URL format is consistent
- ID is numeric and in predictable location
- Simple and reliable extraction

### 7. Price Change Detection

**Decision**: Store both original and current prices, calculate drop percentage

**Fields**:
- `original_price`: First seen price
- `current_price`: Latest price
- `price_drop_percentage`: Calculated from original
- `price_history`: Related table tracking all changes

### 8. Data Normalization

**Decision**: Store raw extracted values, normalize on query

**Rationale**:
- Keep extraction simple and fast
- Handle edge cases (missing data) gracefully
- Normalize currency symbols and formats when displaying

### 9. Error Handling Strategy

**Decision**: Log and continue for non-fatal errors, retry for transient failures

**Behavior**:
- Email parse error → Log error, skip email, continue
- IMAP connection error → Retry with exponential backoff
- Database error → Rollback transaction, log error

### 10. Configuration Management

**Decision**: Environment variables with pydantic-settings

**Variables**:
- `GMAIL_EMAIL`: Gmail address
- `GMAIL_APP_PASSWORD`: App-specific password
- `DATABASE_URL`: SQLite database path
- `CRAWL_INTERVAL_HOURS`: Hours between crawls (default: 1)
- `API_HOST`: API bind address (default: 0.0.0.0)
- `API_PORT`: API port (default: 8000)

## Email Content Analysis

From the example email:

```
Piso en Barriada Juan XXIII, Juan XXIII - Las Torres - G2, Burgos
189.900€ ↓5%
180.000 €
80 m² 4 hab. 5ª planta exterior https://www.idealista.com/inmueble/109446213/...
```

**Extracted Fields**:
- **title**: "Piso en Barriada Juan XXIII, Juan XXIII - Las Torres - G2, Burgos"
- **property_type**: "Piso" (first word)
- **location**: "Barriada Juan XXIII, Juan XXIII - Las Torres - G2, Burgos"
- **original_price**: 189900
- **current_price**: 180000
- **price_drop_percentage**: 5
- **size_m2**: 80
- **bedrooms**: 4
- **floor**: "5ª planta"
- **has_elevator**: false (exterior access indicated)
- **property_url**: "https://www.idealista.com/inmueble/109446213/"
- **idealista_id**: "109446213"

## Open Questions (None)

All critical decisions have been resolved based on the email example and specification.
