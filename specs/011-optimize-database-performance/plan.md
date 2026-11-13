# Implementation Plan: Database and Query Performance Optimization

**Branch**: `011-optimize-database-performance` | **Date**: 2026-11-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/011-optimize-database-performance/spec.md`

## Summary

This feature resolves the severe latency and memory exhaustion issues affecting the web application on resource-constrained hardware. It extracts 374 MB of Base64 image blobs from SQLite into local disk files (`data/media/properties/{id}/cover.jpg`), reduces the database from 391 MB to under 30 MB with `VACUUM`, enables SQLite Write-Ahead Logging (WAL) and memory tuning, adds persistent indexed columns (`canonical_zone`, `discount_pct`, `price_per_m2`), and shifts property list filtering, sorting, and pagination entirely into SQL.

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript 5.6 + Node 20 (frontend)  
**Primary Dependencies**: FastAPI, SQLAlchemy 2.0, SQLite 3, Pydantic 2, React 19, Vite  
**Storage**: SQLite (`idealista_properties.db`) configured with WAL mode; local disk filesystem (`data/media/properties/{id}/`)  
**Testing**: pytest (backend unit, migration, security, and performance integration tests)  
**Target Platform**: Linux host / Docker container (`idalista-tracker`) on dual-core CPU with 3.6 GB RAM  
**Project Type**: Web application (FastAPI backend serving compiled React SPA, static media, and JSON REST API)  
**Performance Goals**: Property list response < 500 ms (p95); SQL query latency < 50 ms; query peak memory < 10 MB; database file size < 50 MB (target: ~25 MB)  
**Constraints**: Zero database locking errors between concurrent crawlers and web readers; strict path traversal containment on all media asset endpoints; exact visual and functional consistency in UI  
**Scale/Scope**: ~2,500 properties, ~75,000 visibility records, ~20,000 photos  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Plan Status | Justification / Notes |
|---|---|---|---|
| **I. Code Quality** | Enforce consistent linting and clean architecture | **PASS** | Refactored queries use standard SQLAlchemy expressions; migration is isolated in `src/database/migrate_performance.py`. |
| **II. Testing Standards** | Automated tests for changed behavior and regressions | **PASS** | Tests verify migration data integrity, query speedups, memory bounds, and path traversal protection. |
| **III. UX Consistency** | Preserve UI interaction patterns, design system, and visual presentation | **PASS** | Property cards, photo URLs, filters, and metrics in React frontend remain visually identical. |
| **IV. Performance Requirements** | Response time < 500ms p95; memory within documented budgets | **PASS** | Eliminates 374 MB RAM allocation per request; benchmarks show 160x query acceleration (from 7.9s to <0.05s). |
| **V. Simplicity** | Prefer simplest maintainable solution; avoid unnecessary dependencies | **PASS** | Retains embedded SQLite instead of deploying external PostgreSQL service, saving ~200 MB of host RAM. |

## Project Structure

### Documentation (this feature)

```text
specs/011-optimize-database-performance/
├── spec.md              # Feature specification with clarifications
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0: Technical decisions, pragmas, and benchmarks
├── data-model.md        # Phase 1: Entity updates, index design, and migration flow
├── quickstart.md        # Phase 1: Runnable verification commands
├── contracts/           # Phase 1: Interface contracts
│   └── properties-api.yaml
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── api/
│   └── routes/
│       └── properties.py         # Update list_properties to SQL pagination & strict image serving
├── config.py                     # PRAGMA configuration / media paths
├── database/
│   ├── connection.py             # Add SQLite connect event listener for WAL & cache pragmas
│   ├── migrate_performance.py    # Batch extraction, backfill, and VACUUM migration script
│   └── models.py                 # Add canonical_zone, discount_pct, price_per_m2 columns & indexes
├── services/
│   ├── media_service.py          # Add resolve_safe_path with strict path traversal containment
│   └── property_service.py       # SQL-based filtering/pagination; auto-compute columns on crawl
tests/
├── integration/
│   ├── test_media_security.py    # Test path traversal prevention and file extension whitelisting
│   └── test_performance_migration.py # Test migration extraction, VACUUM, and query speedups
└── unit/
    └── test_property_sql_query.py # Test SQL filtering by zone, status, discount, and pagination
```

## Structure Decision

The existing monolithic backend structure (`src/api`, `src/database`, `src/services`) is maintained. All enhancements are backward-compatible and directly improve database access efficiency and media file containment.

## Complexity Tracking

> **Constitution Check passed with zero violations.** No architectural complexity added; complexity was reduced by moving data from Base64 text blobs in SQLite to standard static image files.
