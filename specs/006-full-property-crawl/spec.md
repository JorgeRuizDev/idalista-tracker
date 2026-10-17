# Feature Specification: Full Property Snapshot Crawler

**Feature Branch**: `006-full-property-crawl`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Quiero añadir un crawl completo a la web de idealista, que extraiga fotos así como descripción, localización etc. Básicamente una snapshot de de lo que hay en la web. Esto solo se va a implementar para las propiedades nuevas, no para toda la BBDD, y cabe resaltar que va a ser complicado técnicamente por todas las restricciones que tiene idealista a nivel de protección ati bots. Quiero que en la BBDD cada nueva propiedad permita identificar del estado de su detalle con al menos los siguientes valores: - Legacy: Son las propiedades ya crawleadas - Pending: Son las que están pendientes de crawlear de manera completa - Un tercer valor para identificar las que se han crawleado - Un cuarto valor para identificar las descartadas?"

## Clarifications

### Session 2026-10-17

- Q: Which crawling execution mechanism should perform the full web detail snapshot extraction given Idealista's strict anti-bot protections? → A: Hybrid workflow with a robust backend crawler ("heavy machinery", e.g., stealth browser automation / dedicated scraping engine) as primary executor, falling back to the Chrome extension when bot challenges or CAPTCHAs block backend progress.
- Q: How should listing photos be stored and managed in the snapshot? → A: Full gallery local download. Download and store all image binary files locally in persistent media storage so photos remain permanently accessible after properties are delisted on Idealista.
- Q: What failure conditions and retry limits should permanently transition a property to the discarded detail status? → A: Confirmed delisting (HTTP 404/410 / "ad removed") OR 3 failed crawl attempts by the Chrome extension fallback tier.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Detail Crawl Lifecycle and Scope Isolation (Priority: P1)

As a system operator, I want newly discovered properties to enter a pending queue for full detail crawling while existing historical listings remain preserved as legacy, so that full detail extraction is only attempted for new properties without retroactively crawling the entire database.

**Why this priority**: Fundamental to feature scope and database integrity. The user explicitly specified that full detail crawling must only execute for new properties, and database records must clearly reflect whether a property is legacy, pending, completed, or discarded.

**Independent Test**: Can be verified by ingesting a new property and confirming its detail status is set to `pending`, while verifying pre-existing database records are classified as `legacy` and never queued for detail crawling.

**Acceptance Scenarios**:

1. **Given** existing properties in the database prior to this feature, **When** the system runs, **Then** all existing properties are classified with detail status `legacy` and are excluded from the detail crawl queue.
2. **Given** a new property listing discovered via email ingestion or search monitoring, **When** the property is stored in the database, **Then** its detail status is automatically initialized to `pending`.
3. **Given** a property whose detail crawl successfully finishes, **When** the snapshot data is persisted, **Then** its detail status transitions from `pending` to `completed`.
4. **Given** a property that cannot be crawled due to permanent listing removal (e.g., 404/expired) or persistent failure, **When** maximum retry attempts are reached, **Then** its detail status transitions from `pending` to `discarded`.

---

### User Story 2 - Full Listing Snapshot Extraction (Priority: P1)

As a property analyst, I want the system to crawl the complete web page for pending properties to capture a full snapshot (complete photo gallery, full text description, and detailed location metadata), so that I have a rich, permanent record of the listing even if the external web page changes or is taken down.

**Why this priority**: Core value of the feature. Today's discovery channels only provide summary snippets. A full snapshot provides high-resolution photos, the seller's complete description, and precise location attributes necessary for in-depth property evaluation.

**Independent Test**: Can be verified by triggering a detail crawl on a `pending` property URL, then confirming that the complete photo gallery, full description text, and location attributes are stored and the property status becomes `completed`.

**Acceptance Scenarios**:

1. **Given** a property in `pending` detail status, **When** the detail crawler processes the property URL, **Then** the complete photo gallery (all available property images) is extracted and associated with the property.
2. **Given** a property in `pending` detail status, **When** the detail crawler processes the property URL, **Then** the full descriptive text and all granular location information (neighborhood, district, street/zone, coordinates where published) are extracted.
3. **Given** a successful detail extraction, **When** the snapshot is saved, **Then** the capture timestamp is recorded and the property detail status is updated to `completed`.
4. **Given** a property with `completed` status, **When** a user views the property details, **Then** the complete photo gallery, full description, and detailed location attributes are accessible.

---

### User Story 3 - Anti-Bot Friction Mitigation and Failure Handling (Priority: P2)

As a system operator, I want the crawler to navigate anti-bot protections gracefully through polite request pacing, adaptive delays, and failure handling, so that the crawling service avoids IP bans and automatically handles transient challenges.

**Why this priority**: Idealista employs aggressive anti-bot protections (rate limits, CAPTCHA, bot detection). Without built-in throttling, jitter, backoff, and failure classification, crawlers will rapidly get blocked or corrupt the crawl queue with hung jobs.

**Independent Test**: Can be verified by simulating anti-bot responses (e.g., rate limit HTTP 429, bot challenge, or connection timeouts) and verifying that the crawler applies exponential backoff, limits request concurrency, logs the challenge, and marks unrecoverable listings as `discarded` rather than crashing.

**Acceptance Scenarios**:

1. **Given** a crawl request encountering a rate limit or anti-bot challenge, **When** the failure is detected, **Then** the system initiates a backoff delay, increments the retry counter, and reschedules the crawl without stalling other system tasks.
2. **Given** a pending property whose listing page has been permanently deleted or expired (e.g., HTTP 404 / 410 / "ad removed"), **When** the delisting is confirmed, **Then** the property detail status transitions immediately to `discarded` with reason `delisted`.
3. **Given** a backend crawl attempt blocked by persistent anti-bot challenges or CAPTCHA, **When** backend retries are paused, **Then** the listing is delegated to the Chrome extension fallback tier to complete extraction within the user's authentic browser session.
4. **Given** a property delegated to the Chrome extension fallback tier, **When** the extension fails to extract the snapshot across 3 distinct crawl attempts, **Then** its detail status transitions to `discarded` with reason `extension_retries_exhausted`.
5. **Given** consecutive anti-bot challenges across multiple properties, **When** the challenge threshold is reached, **Then** the crawler pauses crawling activity for an adaptive cooldown period to prevent widespread IP blocking.

---

### User Story 4 - Detail Status Monitoring and Manual Override (Priority: P3)

As an administrator, I want to view detail crawl statuses across properties and manually re-queue or discard listings when needed, so that I have operational visibility and can recover from edge cases.

**Why this priority**: Provides operational transparency and administrative recovery tools for edge cases where automated crawling needs human intervention.

**Independent Test**: Can be verified by querying properties by their detail status (`legacy`, `pending`, `completed`, `discarded`) and manually triggering a re-queue of a `discarded` property back to `pending`.

**Acceptance Scenarios**:

1. **Given** the list of properties, **When** an operator filters by detail status, **Then** the system filters results accurately by `legacy`, `pending`, `completed`, or `discarded`.
2. **Given** a property currently in `discarded` status, **When** an operator manually requests a re-crawl, **Then** its detail status is reset to `pending` and its retry counter is cleared.
3. **Given** a property currently in `pending` status, **When** an operator manually flags it to skip crawling, **Then** its detail status transitions to `discarded` with a manual discard reason.

---

### Edge Cases

- **Listing Removed Before Crawling**: A property is discovered via email/alert, but by the time the detail crawl runs, the listing has been deleted or delisted (HTTP 404 / "Listing not available"). System must classify this as `discarded` with reason `listing_removed`.
- **Bot Detection / CAPTCHA Page Returned**: External site serves a verification challenge instead of listing content. System must detect non-listing challenge pages, avoid saving invalid snapshot content, back off, and pause or retry according to policy.
- **Listing Without Photos or Description**: A valid listing exists but has zero photos or an empty description. System must capture all available data, mark `completed`, and record an indicator that media or text was absent in the original source.
- **Transient Connection Drop Mid-Extraction**: Network drops while downloading listing metadata or gallery assets. System must discard partial corrupted records, roll back to `pending`, and retry on the next cycle.
- **Listing Redirection**: Property URL redirects to a different URL (e.g. canonical URL or search page if expired). System must follow legitimate canonical redirects within the same listing ID, but discard if redirected to a generic homepage or search result.
- **Duplicate Listing Ingestion**: A property is ingested that already exists in the database with status `completed` or `legacy`. System must preserve existing snapshot data and avoid re-queuing duplicate crawls.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST maintain a detail crawl status for every property record with exactly four valid states: `legacy`, `pending`, `completed`, and `discarded`.
- **FR-002**: The system MUST classify all existing properties created prior to the rollout of this feature with detail status `legacy`.
- **FR-003**: The system MUST exclude properties in `legacy` status from automated full detail crawling.
- **FR-004**: The system MUST automatically assign detail status `pending` to all newly ingested property records upon creation.
- **FR-005**: The system MUST extract a comprehensive web snapshot for `pending` properties, including:
  - Complete photo gallery downloaded and persisted locally in media storage (all available images saved as local files with original source URL and display order preserved, ensuring permanence even after remote delisting).
  - Full property description text preserving formatting/paragraphs.
  - Granular location hierarchy (neighborhood, district, municipality/city, province, and geographical coordinates if exposed).
  - Detailed property features (e.g., square meters, floor number, elevator presence, room breakdown, amenities, and property condition attributes).
- **FR-006**: The system MUST transition a property's detail status from `pending` to `completed` upon successful extraction and persistence of the full snapshot, recording the snapshot capture timestamp.
- **FR-007**: The system MUST implement a hybrid crawl execution architecture to overcome anti-bot protections:
  - **Primary Tier**: An autonomous backend crawler equipped with advanced browser automation ("heavy machinery" with stealth execution, realistic browser fingerprinting, and dynamic JavaScript rendering) to crawl pending listings automatically.
  - **Fallback Tier**: When the backend crawler encounters persistent bot challenges (e.g. CAPTCHAs, Cloudflare interstitials), the property MUST be flagged for fallback execution via the Chrome extension in the user's authentic browser session.
  - **Pacing Safeguards**: Configurable minimum and maximum delays between consecutive requests (jittered rate limiting), controlled concurrency, and adaptive cooldown periods when bot detection signals or rate-limit responses are encountered.
- **FR-008**: The system MUST transition a property's detail status to `discarded` strictly when:
  - The listing page is confirmed delisted or permanently unavailable (HTTP 404, 410, or verified "listing removed" indicator).
  - The property fails extraction across 3 distinct crawl attempts by the Chrome extension fallback tier.
  - An operator manually marks the property as discarded.
- **FR-009**: The system MUST record a failure/discard reason whenever a property transitions to `discarded` (e.g., `delisted`, `extension_retries_exhausted`, `manual_discard`).
- **FR-010**: The system MUST allow operators to query, filter, and inspect properties by their detail crawl status.
- **FR-011**: The system MUST allow operators to manually re-queue a `discarded` property back to `pending` status for re-extraction.

### Key Entities *(include if feature involves data)*

- **PropertyDetailStatus**: Enumeration representing the crawl status of a property's detailed snapshot:
  - `legacy`: Discovered prior to full crawl implementation; not eligible for automated detail crawling.
  - `pending`: Newly discovered; queued awaiting full detail crawl.
  - `completed`: Full web snapshot successfully extracted and stored.
  - `discarded`: Crawl permanently abandoned due to listing removal, repeated failure, or manual exclusion.
- **PropertySnapshot**: Rich entity storing the full web snapshot for a property:
  - Captured timestamp.
  - Source listing URL and canonical identifier.
  - Full description text.
  - Location details (neighborhood, district, city, coordinates, address details).
  - Extended characteristics (amenities, floor plan details, condition, energy ratings).
- **PropertyPhoto**: Media entity representing photos belonging to the listing snapshot:
  - Property reference.
  - Local media file path (guaranteeing availability after external delisting).
  - Original source URL.
  - Display order / sequence index.
  - Caption / title (if provided by source).
- **CrawlAttemptLog**: Record tracking extraction attempts and failures:
  - Property reference.
  - Attempt timestamp.
  - HTTP status code or anti-bot challenge type.
  - Outcome (`success`, `retryable_failure`, `terminal_failure`).
  - Error message or discard reason.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pre-existing database properties are assigned `legacy` status during rollout, with 0 unintended automated crawl requests initiated for legacy records.
- **SC-002**: 100% of newly ingested properties are initialized with `pending` status upon initial persistence.
- **SC-003**: For reachable active listings, at least 85% successfully reach `completed` status within 24 hours of ingestion.
- **SC-004**: 100% of properties with `completed` status contain all available photos from the external gallery and the full listing description text.
- **SC-005**: Anti-bot IP block rate remains below 2% of total crawl requests due to rate limiting, adaptive delays, and polite crawling pacing.
- **SC-006**: 100% of listings that are delisted or unretrievable after retry exhaustion transition to `discarded` with an explicit reason, resulting in 0 listings indefinitely stuck in `pending`.
- **SC-007**: Operators can query and filter properties by detail status with response times under 500 milliseconds for datasets up to 10,000 properties.

## Assumptions

- **Status Names**: The four lifecycle states are explicitly defined as `legacy`, `pending`, `completed`, and `discarded`, directly addressing the user's specification for legacy, pending, crawled (completed), and discarded listings.
- **Scope Restriction**: Full crawling is strictly restricted to newly discovered properties. Legacy properties are neither automatically queued nor backfilled.
- **Asynchronous Execution**: Due to anti-bot restrictions and the need for pacing/throttling, detail crawling operates asynchronously in the background rather than synchronously blocking property ingestion.
- **Photo Storage Strategy**: The snapshot downloads and persists all external high-resolution gallery images locally in persistent media storage so that photos remain fully accessible even if the original listing is subsequently delisted or deactivated on Idealista.
- **Discard Policy**: Properties transition to `discarded` strictly upon confirmed delisting (HTTP 404/410/removed) or after exhausting 3 failed crawl attempts in the Chrome extension fallback tier (or via explicit operator action). Transient backend anti-bot challenges trigger fallback delegation to the extension rather than premature discard.
