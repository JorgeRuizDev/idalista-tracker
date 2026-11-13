# Feature Specification: Database and Query Performance Optimization

**Feature Branch**: `011-optimize-database-performance`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Haz todos los pasos recomendados (extraer imagenes base64 de la base de datos a disco, reducir el tamaño de la base de datos con VACUUM, diferir campos pesados, optimizar consultas con paginación SQL y habilitar modo WAL), olvídate de postgres."

## Clarifications

### Session 2026-11-13

- Q: ¿Cómo deben referenciarse y servirse las imágenes de portada una vez que se extraigan las cadenas Base64 a archivos en disco? → A: Extraer a disco (`data/media/properties/{id}/cover.jpg`), sustituir el contenido Base64 en `image_data` por la ruta relativa (`properties/{id}/cover.jpg`) y aplicar validación estricta de rutas (prevención de path traversal, contención obligatoria en el directorio raíz de media y comprobación de extensiones de imagen seguras).
- Q: ¿Cómo deben gestionarse la zona normalizada (`canonical_zone`) y las métricas de rebaja (`discount_pct`, `price_per_m2`) para que los filtros y la ordenación se ejecuten al 100% en SQL con `LIMIT / OFFSET`? → A: Añadir columnas persistentes e indexadas en la tabla `property` (`canonical_zone`, `discount_pct`, `price_per_m2`), calculadas durante la ingesta/actualización de inmuebles y rellenadas mediante una migración inicial para que todos los filtros y ordenaciones se resuelvan nativamente en SQL.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instant Property Explorer Navigation and Filtering (Priority: P1)

As a real estate investor or property seeker browsing tracked listings, I want the property list, filters, and pagination to load smoothly and quickly without freezing the browser or exhausting machine memory, so that I can inspect opportunities efficiently.

**Why this priority**: Navigating listings is the core functionality of the platform. The current 8-second delay and memory exhaustion render the web UI practically unusable on modest hardware.

**Independent Test**: Can be tested by opening the explorer dashboard, filtering by price/zone, and changing pages, verifying sub-second response times and minimal host memory footprint.

**Acceptance Scenarios**:

1. **Given** a user opens the web application dashboard, **When** the property list is loaded, **Then** the first page of listings displays within 1 second without freezing the host or causing memory spikes.
2. **Given** a user changes search filters (such as zone, price range, or discount), **When** applying the filter, **Then** updated matching listings are returned and rendered in under 500 milliseconds.
3. **Given** a user navigates between pagination pages, **When** clicking next or specific page numbers, **Then** only the requested subset of items is retrieved and rendered smoothly.

---

### User Story 2 - Decoupled Image Asset Storage on Disk (Priority: P2)

As a platform user and host administrator, I want property cover images and media to be stored as discrete files on disk and served as static media rather than embedded as large text payloads inside database tables, so that the database remains lightweight and fast to query.

**Why this priority**: Inline Base64 image data accounts for over 95% of the total database size (~374 MB out of 391 MB), which bloats every database query and causes massive memory thrashing.

**Independent Test**: Can be tested by verifying that property cover images load correctly in the browser while the main property query response payload remains minimal (kilobytes instead of megabytes).

**Acceptance Scenarios**:

1. **Given** existing property records with embedded image payloads, **When** the asset migration executes, **Then** cover photos are extracted into dedicated media files on disk without data loss.
2. **Given** listings with extracted media files, **When** viewed on the web interface, **Then** all cover photos render accurately via static media paths.
3. **Given** database maintenance executes following asset extraction, **When** storage space is reclaimed, **Then** the relational database file size decreases by more than 80%.

---

### User Story 3 - Smooth Concurrency Between Browsing and Background Tasks (Priority: P3)

As a user interacting with the platform while crawls, synchronization, or analysis run in the background, I want the web interface to remain responsive without encountering database lock errors or degraded browsing performance, so that automated crawlers do not disrupt interactive usage.

**Why this priority**: Data crawling and user browsing happen concurrently; write locks should not block user reads, and read operations should not starve crawling tasks.

**Independent Test**: Can be tested by running an active background crawl or data update while simultaneously browsing and filtering listings in the web application.

**Acceptance Scenarios**:

1. **Given** an active background crawl writing updates to listings, **When** a user browses and filters listings in the web UI, **Then** listings load without "database locked" errors or noticeable latency degradation.
2. **Given** concurrent read requests from multiple UI components on page load, **When** simultaneous queries execute, **Then** all queries complete in parallel without contention.

---

### Edge Cases

- **Missing or corrupted inline image data**: Listings with corrupt or missing image payloads must fall back gracefully to placeholder images or original URLs without breaking the migration or page rendering.
- **Path traversal attempt on media endpoints**: Any requested media path resolving outside the designated media root or containing unauthorized file extensions MUST be rejected with a 400/404 error, ensuring arbitrary filesystem reading is strictly prohibited.
- **Concurrent read during asset migration**: The migration process must safely update records without corrupting ongoing reads or halting the server.
- **Empty filter results**: Queries with highly restrictive filter combinations that match zero listings must return an empty list immediately without unnecessary database scans.
- **Deep pagination offsets**: Navigating to high offset pages must remain bounded in execution time and memory usage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST perform listing pagination directly at the database storage retrieval layer (`LIMIT` / `OFFSET`) rather than loading full datasets into application memory.
- **FR-002**: The system MUST store listing cover images as individual static files on disk (e.g. `properties/{id}/cover.jpg`) and store only the relative path reference in the database record rather than inline Base64 data.
- **FR-003**: The system MUST migrate all existing inline cover images to disk files in the media directory without loss of visible photos, updating records to relative path strings.
- **FR-004**: The system MUST enforce strict path containment and file extension validation when resolving media assets to prevent arbitrary file reading and directory traversal attacks.
- **FR-005**: The system MUST add persistent, indexed columns to the property entity for normalized zone, discount percentage, and price per square meter (`canonical_zone`, `discount_pct`, `price_per_m2`), backfilling existing listings via a database migration.
- **FR-006**: The system MUST compute and update `canonical_zone`, `discount_pct`, and `price_per_m2` at ingestion/crawl time so that search filters and sort orders execute natively in database queries.
- **FR-007**: The system MUST reclaim unused database file space via vacuuming after extracting inline image data.
- **FR-008**: The system MUST ensure property list queries exclude heavy media attributes by default, loading image assets only when specifically requested by the client.
- **FR-009**: The system MUST configure the storage engine with Write-Ahead Logging (WAL) and appropriate cache sizing to allow concurrent non-blocking reads during background write operations.
- **FR-010**: The system MUST maintain exact visual and functional consistency in the user interface, including photo presentation, zone tagging, discounts, and sorting orders.

### Key Entities

- **Property**: Real estate listing entity storing core attributes (price, location, size, bedrooms, timestamps, status) plus persistent, indexed derived attributes (`canonical_zone`, `discount_pct`, `price_per_m2`, `image_data` relative path).
- **Property Media Asset**: Physical image file stored in the local file system (`data/media/properties/{id}/...`) referenced by URL path.
- **Search Query Filter**: Retrieval criteria containing pagination boundaries, zone filters, price boundaries, and sorting direction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Property listing and filter API responses complete in under 500 milliseconds (p95) on the host environment (down from ~8 seconds baseline).
- **SC-002**: Peak memory usage per property list query does not exceed 10 MB (down from ~377 MB baseline, an over 95% reduction).
- **SC-003**: Primary relational database file size is reduced from ~391 MB to under 50 MB (an over 85% reduction) after asset extraction and vacuuming.
- **SC-004**: 100% of properties with existing cover images continue displaying their photos correctly without broken image links.
- **SC-005**: Background data ingestion tasks and user web navigation execute concurrently with 0 database locked errors.

## Assumptions

- The host environment has sufficient disk space (at least 500 MB) on the mounted storage volume to store extracted `.jpg` image files.
- The existing SQLite database engine is retained and optimized, eliminating the operational overhead and memory footprint of an external PostgreSQL server.
- The existing `/media` static asset endpoint serves disk-based files reliably.
