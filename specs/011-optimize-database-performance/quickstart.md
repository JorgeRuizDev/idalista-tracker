# Quickstart & Verification Guide: Database Performance Optimization

**Feature Branch**: `011-optimize-database-performance`  
**Date**: 2026-11-13  
**Status**: Ready  

This guide provides runnable instructions to execute the migration, verify the database shrinkage, validate SQL query acceleration, and test path security.

---

## 1. Prerequisites

- Python 3.11+ / Docker environment.
- File write access to `data/media/properties/`.
- SQLite database at `idealista_properties.db`.

---

## 2. Execute Performance Migration

Run the unified migration script that sets SQLite pragmas, extracts Base64 photos to disk, backfills `canonical_zone`, `discount_pct`, and `price_per_m2`, and executes `VACUUM`:

```bash
python3 -m src.database.migrate_performance
```

### Expected Output
- Progress log extracting ~2,107 Base64 images to `data/media/properties/{id}/cover.jpg`.
- Backfill of `canonical_zone`, `discount_pct`, and `price_per_m2` for all rows.
- Rebuilt indexes on `property`.
- `VACUUM` execution completed.
- Confirmation: Database size reduced from ~391 MB to under 30 MB.

---

## 3. Verify Database Shrinkage & WAL Mode

Run this inspection command to check database file size and pragmas:

```bash
python3 -c "
import sqlite3, os

db_path = 'idealista_properties.db'
size_mb = os.path.getsize(db_path) / (1024 * 1024)
print(f'Database Size: {size_mb:.2f} MB (Target: < 50 MB)')

conn = sqlite3.connect(db_path)
cur = conn.cursor()
for p in ['journal_mode', 'synchronous', 'cache_size', 'mmap_size']:
    val = cur.execute(f'PRAGMA {p}').fetchone()[0]
    print(f'PRAGMA {p}: {val}')
"
```

### Expected Result
- Database size is **< 30 MB** (down from 391 MB).
- `journal_mode: wal`.
- `synchronous: 1` (NORMAL).

---

## 4. Benchmark Query Performance and Memory

Benchmark the paginated `/api/v1/properties` endpoint logic:

```bash
python3 -c "
import time, tracemalloc, sqlite3

conn = sqlite3.connect('idealista_properties.db')
cur = conn.cursor()

# Test 1: Paginated query with zone filter
tracemalloc.start()
t0 = time.time()
cur.execute('SELECT count(*) FROM property WHERE canonical_zone = ?', ('Gamonal - San Bruno - G9',))
total = cur.fetchone()[0]
cur.execute('SELECT id, idealista_id, title, canonical_zone, current_price FROM property WHERE canonical_zone = ? ORDER BY discount_pct DESC LIMIT 24 OFFSET 0', ('Gamonal - San Bruno - G9',))
rows = cur.fetchall()
t1 = time.time()
_, peak = tracemalloc.get_traced_memory()
tracemalloc.stop()

print(f'Query executed in {(t1-t0)*1000:.2f} ms with {len(rows)} items (total: {total}). Peak RAM: {peak/(1024*1024):.3f} MB')
assert (t1 - t0) < 0.1, 'Query took too long!'
"
```

### Expected Result
- Query executes in **< 20 ms** (sub-50ms target).
- Peak RAM usage is **< 1 MB** (down from 377 MB).

---

## 5. Security & Path Traversal Verification

Verify that media endpoints prevent path traversal attacks:

```bash
python3 -c "
from pathlib import Path
from src.services.media_service import MediaService

service = MediaService()
malicious_paths = [
    '../../etc/passwd',
    '../idealista_properties.db',
    'properties/103444/../../../config.py',
    'properties/103444/script.sh',
]

for p in malicious_paths:
    safe = service.resolve_safe_path(p)
    print(f'Testing {p} -> Safe: {safe}')
    assert safe is None, f'Path traversal not blocked for {p}!'
print('All path traversal tests passed successfully.')
"
```

### Expected Result
- All malicious traversal attempts return `None` (blocked).
