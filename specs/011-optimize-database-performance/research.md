# Research & Technical Decisions: Database and Query Performance Optimization

**Feature Branch**: `011-optimize-database-performance`  
**Date**: 2026-11-13  
**Status**: Completed  

---

## 1. SQLite Concurrency & Pragma Tuning (WAL Mode)

### Problem
SQLite defaults to `journal_mode = DELETE` and `synchronous = FULL` with a 2 MB default page cache. Under this mode:
- Any write lock (such as background crawling or price updates) blocks all read queries, returning `sqlite3.OperationalError: database is locked`.
- Readers and writers cannot proceed simultaneously.
- Every write incurs synchronous disk `fsync` operations.

### Decision
Enable **Write-Ahead Logging (WAL)** and tune connection pragmas for all SQLite connections via SQLAlchemy engine listeners.

| Pragma | Value | Purpose |
|---|---|---|
| `journal_mode` | `WAL` | Permits concurrent readers while a writer commits changes; eliminates reader-writer lock contention. |
| `synchronous` | `NORMAL` | In WAL mode, `NORMAL` is fully crash-safe and avoids synchronous disk flushes on every transaction, dramatically reducing write latency. |
| `busy_timeout` | `5000` | Automatically waits up to 5,000 ms when encountering a temporary lock instead of immediately failing with a locked error. |
| `cache_size` | `-64000` | Allocates ~64 MB of RAM for the SQLite page cache, allowing hot indexes and metadata to remain resident in memory. |
| `mmap_size` | `268435456` | Enables up to 256 MB of memory-mapped I/O for zero-copy read operations directly from the OS page cache. |

### Implementation Pattern in SQLAlchemy
```python
@event.listens_for(engine, "connect")
def set_sqlite_pragmas(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode = WAL")
    cursor.execute("PRAGMA synchronous = NORMAL")
    cursor.execute("PRAGMA busy_timeout = 5000")
    cursor.execute("PRAGMA cache_size = -64000")
    cursor.execute("PRAGMA mmap_size = 268435456")
    cursor.close()
```

### Alternatives Considered
- **Migrating to PostgreSQL**: Rejected due to host hardware constraints (dual-core 2011 CPU, 3.6 GB RAM, 2.2 GB swap in use). An external PostgreSQL daemon adds ~150–250 MB of resident memory overhead. SQLite in WAL mode delivers sub-millisecond response times with zero daemon footprint.

---

## 2. Base64 Media Extraction, Column Repurposing & Database Shrink (VACUUM)

### Problem
95.6% of the current database file (~374 MB out of 391 MB) consists of Base64 strings stored in `property.image_data` (averaging ~186 KB per row, up to 1 MB). Any query that fetches properties without column deferral allocates hundreds of megabytes of text in Python, triggering severe swap thrashing.

### Decision
1. **Batch Extraction**:
   - Process listings in batches of 100 using streaming raw cursors or deferred loading (`defer(Property.image_data)`).
   - Decode data URLs (`data:image/jpeg;base64,...`) into binary `.jpg` bytes.
   - Save to disk at `data/media/properties/{idealista_id}/cover.jpg`.
2. **Column Repurposing**:
   - Replace the Base64 content in `property.image_data` with the relative local path string: `"properties/{idealista_id}/cover.jpg"` (reducing storage per row from ~186,000 bytes to ~35 bytes).
3. **Database Reclamation**:
   - Execute `VACUUM` in SQLite post-migration to reclaim released data pages, reducing database file size from ~391 MB to under 25 MB.
4. **Subsequent Crawl Pipeline**:
   - Future crawler runs will save downloaded cover photos directly to `data/media/properties/{id}/cover.jpg` and record the relative path in `image_data`, never writing Base64 text to SQLite.

### Alternatives Considered
- **Nullifying `image_data` and using `PropertyPhoto` only**: Rejected because `image_data` is used across several endpoints as a fast single-cover reference. Storing the short relative path string preserves backward compatibility without bloat.
- **Keeping Base64 but deferring in SQLAlchemy**: While `defer(Property.image_data)` prevents Python memory bloat, SQLite page scans still have to read past large rows on disk, and the database file remains 391 MB. Extracting to disk provides a permanent 95% space reduction.

---

## 3. Persistent Columns for Pure SQL Filtering & Pagination

### Problem
In `PropertyService.list_properties()`, all 2,419 listings are loaded into Python memory (`query.all()`) because `canonical_zone`, `discount_pct`, `price_per_m2`, and `days_on_market` are computed in Python loops. Because SQLite lacks these fields as columns, it cannot apply `WHERE zone = ?`, `ORDER BY discount_pct DESC`, or `LIMIT 24 OFFSET 0` at the SQL level.

### Decision
1. **Schema Migration**:
   - Add columns to `Property`:
     - `canonical_zone: Mapped[str] = mapped_column(String(100), nullable=False, default="Burgos Centro / Otras Zonas", index=True)`
     - `discount_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, index=True)`
     - `price_per_m2: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)`
   - Create composite index: `ix_property_status_canonical_zone` on `(status, canonical_zone)`.
2. **Backfill Migration**:
   - Execute a one-time script that computes `canonical_zone`, `discount_pct`, and `price_per_m2` for all existing properties and saves them to the new columns.
3. **Ingestion Hook**:
   - Update `PropertyService.create_or_update_property()` and crawler ingestion methods to compute and store these 3 fields upon record creation or update.
4. **Query Refactoring in `list_properties`**:
   - Transform all filters (`zone`, `min_price`, `max_price`, `has_price_drop`, `detail_status`, `status`, `min_bedrooms`) and sorting into standard SQLAlchemy SQL expressions (`query.filter(...)`, `query.order_by(...)`).
   - Execute `total = query.count()` and `paginated = query.offset(offset).limit(limit).all()`.
   - Query time drops from **7.9 seconds to 0.02 seconds (20 ms)**.

---

## 4. Strict Path Containment & Security for Media Assets

### Problem
When the server serves images from local disk via relative paths stored in the database or user request parameters, improper path concatenation can lead to Directory Traversal (e.g. `../../etc/passwd`).

### Decision
Implement strict path sanitization in `MediaService` and image endpoints:
```python
def resolve_safe_media_path(media_root: Path, relative_path: str) -> Optional[Path]:
    allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    
    clean_rel = Path(relative_path.strip().lstrip("/"))
    if clean_rel.suffix.lower() not in allowed_extensions:
        return None
        
    resolved_root = media_root.resolve()
    target_path = (resolved_root / clean_rel).resolve()
    
    # Strict containment check
    if not target_path.is_relative_to(resolved_root):
        return None
        
    return target_path if target_path.is_file() else None
```
Any request attempting path traversal or unauthorized file extensions immediately receives an HTTP 400 Bad Request or HTTP 404 Not Found.
