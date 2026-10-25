# Feature Specification: Automated Deep Crawl for Inclusions and Pending Listings

**Feature Branch**: `009-deep-crawl-inclusions`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "Genera una nueva spec para actualizar el crawler e incluir esta funcionalidad. Cada vez que se ejecute el crawler, los que están en pending y nuevas inclusiones que detecte el crawler deberán analizarse en profundidad"

## Clarifications

### Session 2026-10-25

- Q: ¿Cómo debe gestionar el crawler el análisis en profundidad de las propiedades pendientes durante una sesión de rastreo? → A: Procesar siempre todas las pendientes y nuevas de forma ininterrumpida en una única sesión continua hasta vaciar la cola por completo.
- Q: ¿Qué comportamiento debe adoptar el crawler si se detecta un reto anti-bot (CAPTCHA / Cloudflare) durante el análisis en profundidad de una ficha? → A: Pausar automáticamente el rastreador y mostrar la pestaña para resolución manual por el usuario, reanudando al superarlo. Debe ser resiliente al cierre de pestaña o abandono del reto: todas las nuevas inclusiones se registran de inmediato como 'pending' en la base de datos antes del análisis profundo, garantizando que nunca se pierdan si la sesión se interrumpe.
- Q: ¿Cómo debe gestionar la extensión las pestañas de navegación durante el análisis en profundidad? → A: Abrir pestañas en segundo plano (no activas) de forma transparente para no interferir con la navegación del usuario, trayendo la pestaña al frente únicamente si salta un CAPTCHA o reto que requiera intervención manual.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Integrated Deep Listing Analysis on Crawl Execution (Priority: P1)

As a real estate investor/analyst, I want the property crawler to automatically perform an in-depth extraction (full photo gallery, complete description text, location hierarchy, and structured features) for all newly discovered listings and all listings currently pending detailed analysis whenever a crawl is initiated, so that every active property in my tracker has complete data without requiring separate manual intervention.

**Why this priority**: Core value of the user request. Currently, search crawls only capture basic summary snippets (title, price, superficial attributes). Listings marked as pending or newly discovered during search monitoring remain incomplete unless an automated, continuous deep analysis pipeline systematically processes them.

**Independent Test**: Can be tested by having several listings in pending status, launching the crawler, and verifying that the crawler captures search updates, discovers new inclusions, and systematically inspects each pending and newly detected listing to capture its complete web snapshot (gallery, text, features), transitioning their status to completed.

**Acceptance Scenarios**:

1. **Given** the system has properties with detail status `pending`, **When** an operator launches a crawl run, **Then** the crawler automatically executes the deep analysis phase for all `pending` listings in addition to processing search queries.
2. **Given** a crawl run is in progress and discovers brand new listings in search results, **When** the new listings are ingested into the system, **Then** they are immediately queued and processed during the deep analysis phase of that same crawl session.
3. **Given** a listing undergoes deep analysis, **When** extraction succeeds, **Then** all available property photos, the complete original description, and structured feature attributes are captured and stored, and the listing's detail status transitions from `pending` to `completed`.
4. **Given** a listing undergoes deep analysis but is found to be no longer active (e.g., delisted, removed, or returning a page-not-found error), **When** confirmed, **Then** its detail status transitions from `pending` to `discarded` with a clear removal reason.

---

### User Story 2 - Real-Time Extraction Progress & Operator Controls (Priority: P2)

As a system operator, I want to see clear, real-time feedback and control options for both discovery and deep analysis phases during a crawl, including pending queue counters and pause/stop controls, so that I can observe extraction pacing, avoid anti-bot friction, and interrupt the process if needed.

**Why this priority**: Deep listing analysis requires visiting individual property pages with polite pacing to prevent bot challenges or session disruptions. Operators need full visibility into the queue size, active listing being crawled, extraction progress, and the ability to control execution safely.

**Independent Test**: Can be tested by starting a crawl with pending listings, verifying that the crawler interface displays a multi-phase progress indicator (e.g., "Search Discovery" followed by "Deep Analysis: X of Y listings processed"), and testing pause and stop actions.

**Acceptance Scenarios**:

1. **Given** an operator opens the crawler control interface, **When** listings are awaiting deep analysis, **Then** the operator sees a distinct counter showing the total number of listings pending deep analysis.
2. **Given** a crawl session running deep analysis, **When** each listing is processed, **Then** the operator interface updates in real time showing the current listing ID, progress count (e.g., "Analyzing listing 5 of 68"), and photos captured.
3. **Given** a crawl session in progress, **When** the operator clicks pause or stop, **Then** the crawler finishes the current listing safely, halts further page requests, and leaves remaining listings in `pending` status ready to resume on the next crawl.
4. **Given** listings are pending deep analysis, **When** an operator wishes to run deep analysis without re-running full search discovery, **Then** the operator can trigger a dedicated "Analyze Pending Listings" action directly from the crawler interface.

---

### User Story 3 - Comprehensive Listing View in User Interface (Priority: P3)

As a property evaluator, I want the web interface's property detail modal to display the full captured snapshot (interactive full-resolution photo gallery, complete formatted description, and structured property characteristics) and clear crawl status indicators, so that I can thoroughly evaluate listings directly in the application without visiting external portals.

**Why this priority**: Capturing complete data delivers maximum value when operators and analysts can interact with the rich media and exhaustive information inside their primary evaluation workflow.

**Independent Test**: Can be tested by opening the detail modal of a listing with `completed` status and verifying that all downloaded photos are browsable in a high-resolution gallery, the complete description is rendered with formatting, and all features are displayed alongside a "Complete Analysis" verification badge.

**Acceptance Scenarios**:

1. **Given** a property with a completed deep analysis snapshot, **When** an operator opens its detail modal, **Then** the modal displays all captured photos in an interactive gallery with thumbnails and high-resolution preview.
2. **Given** a property with a completed deep analysis snapshot, **When** viewing the modal body, **Then** the complete description text is rendered preserving original paragraph formatting and line breaks.
3. **Given** a property with structured features extracted during deep analysis, **When** viewing the modal, **Then** all physical attributes and amenities (e.g., heating type, air conditioning, elevator, built-in wardrobes, exterior status) are organized in clear tag badges or attribute lists.
4. **Given** a property whose deep analysis is still `pending` or was `discarded`, **When** viewing its card or modal, **Then** an explicit status indicator informs the operator of the current analysis state.

---

### Edge Cases

- **Delisted Property During Crawl**: A listing was detected during search, but by the time deep analysis visits its specific page, the ad has been deactivated or removed. The system must verify the removal message, mark the listing as `discarded` with reason `delisted`, and continue without interrupting the queue.
- **Anti-Bot Challenge During Session**: A verification challenge appears while opening a listing page. The system MUST recognize the non-listing page, pause execution gracefully, bring the tab into focus for the operator to solve, and resume upon completion. If the operator closes the tab or aborts the challenge without solving it, the system must cleanly halt the session while keeping the in-flight listing and all unanalyzed inclusions safely stored in `pending` status without discarding them or losing data.
- **Empty Description or Zero Photos**: A listing is published with no descriptive text or without photographs. The system must extract all available data, preserve the record, mark the snapshot as `completed`, and record zero counts without failing.
- **Interrupted Session / Browser Close**: The browser or crawler process is closed mid-crawl. Previously processed listings remain `completed`, the currently in-flight listing returns to `pending`, and all remaining pending listings stay queued for the next execution.
- **Duplicate Detection**: The crawler encounters a listing URL already present with a `completed` snapshot. The system must update pricing/status without wiping or re-downloading identical media galleries unless the operator explicitly requests a refresh.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every crawl execution cycle MUST automatically execute a two-stage pipeline:
  1. **Discovery Stage**: Crawl search results to detect price changes, status updates, and newly included listings.
  2. **Deep Analysis Stage**: Systematically navigate to each listing awaiting full analysis, extracting the complete web snapshot.
- **FR-002**: Newly detected property inclusions from the Discovery Stage MUST be persisted immediately to persistent storage with detail status `pending` BEFORE the Deep Analysis Stage begins, ensuring zero data loss if the browser closes, network drops, or a challenge is abandoned mid-session.
- **FR-003**: All pre-existing property listings with detail status `pending` MUST be included in the Deep Analysis Stage whenever a crawl run begins, processing the entire accumulated pending queue and newly discovered inclusions in a single uninterrupted execution cycle until the queue is completely exhausted or explicitly paused/stopped by the operator.
- **FR-004**: During the Deep Analysis Stage, the crawler MUST extract:
  - Complete photo gallery (all available image references downloaded and preserved locally in persistent media storage).
  - Full property description text with paragraphs and whitespace preserved.
  - Granular location metadata (neighborhood, district, municipality, and published coordinates).
  - Structured physical features and amenities (e.g., surface area breakdown, floor level, elevator, heating, condition).
- **FR-005**: The system MUST apply polite request pacing (controlled jittered delay between consecutive listing page navigations) during the Deep Analysis Stage and execute navigations in non-active background tabs that close automatically upon completion, bringing a tab into active focus only if an anti-bot challenge requires manual operator resolution.
- **FR-006**: Upon successful snapshot extraction and media persistence, the system MUST transition the property's detail status to `completed` and record the timestamp of completion.
- **FR-007**: When a listing page is confirmed deleted, deactivated, or expired, the system MUST transition its detail status to `discarded` with reason `delisted`.
- **FR-008**: The crawler user interface MUST present:
  - An indicator of the current number of listings pending deep analysis.
  - A real-time progress monitor displaying the active stage, current listing index, and total queue count.
  - A dedicated action to trigger deep analysis of pending listings independently on demand.
  - Controls to pause or stop the crawl run cleanly.
- **FR-009**: The web application's property detail view MUST render the complete snapshot for properties with `completed` status:
  - An interactive gallery displaying all locally preserved photos with carousel and thumbnail selection.
  - The complete description text formatted cleanly.
  - Structured badges for all extracted physical features and equipment.
  - A status indicator differentiating listings with complete analysis from those still pending.
- **FR-010**: All properties marked with `legacy` detail status MUST continue to be excluded from automated deep analysis to protect historical database records from unintended reprocessing.

### Key Entities

- **Property**: The primary listing entity with status tracking (`legacy`, `pending`, `completed`, `discarded`), attempt counters, and capture timestamps.
- **PropertySnapshot**: Rich entity storing the full web snapshot of a property, including full description text, location hierarchy, extracted features, photo count, and capture timestamp.
- **PropertyPhoto**: Media entity representing each photo belonging to a listing snapshot, tracking original source URL, local persistent file path, display order index, and optional caption.
- **CrawlSession**: Orchestration entity tracking the execution lifecycle of a crawl run, including total searches processed, new inclusions discovered, pending listings queued, and snapshots successfully completed or discarded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly discovered property inclusions within a crawl session are automatically processed for deep analysis without manual operator intervention.
- **SC-002**: All listings in `pending` status are processed sequentially during crawl runs until the queue is exhausted or explicitly halted by the operator.
- **SC-003**: 100% of property photo galleries for successfully analyzed listings are preserved locally in persistent media storage and accessible directly even if remote portal listings expire.
- **SC-004**: Operators can initiate, monitor in real time, and interrupt deep crawl runs with 1-click controls from the crawler interface.
- **SC-005**: Property detail modal loads and renders the complete photo gallery, full description, and features in under 500ms for analyzed properties.
- **SC-006**: Crawler operates with polite pacing maintaining a zero-blocking rate (no IP or session bans) during regular operation.

## Assumptions

- The operator runs the crawler through the authentic browser extension session where clearance and active navigation cookies already exist.
- Local media directory storage has sufficient disk space to store high-resolution images (~5–15 MB per listing).
- Historical listings marked `legacy` will remain untouched unless an operator explicitly triggers a manual re-queue on an individual listing.
- Polite pacing between listing page loads is configured with a default delay between 2 and 5 seconds per listing inside the extension session.
