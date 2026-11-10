# Feature Specification: Automated Background Crawling and Human Challenge Notifications

**Feature Branch**: `010-background-crawl-automation`

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description: "Quiero mejorar la extension para 'automatizar' el crawl. Ahora mismo, la extensión abre una pestaña en PRIMERA página y cada vez que se interactúa con la web para pasar de página, se cambiar a esa pestaña. Pero el deep crawl no hace esto, este funciona en segundo plano. Quiero que funcione el avanzar de página en segundo plano. Luego, quiero que si aparece un bloqueo en el que se solicite revisión humana, salte una notificación de chrome / escritorio. Con todo esto, si pasan 24h sin un crawl completo pero he abierto el navegador y se ha cargado la extensión, quiero que se inicie el proceso de crawl en segundo plano (esto se debe poder activar o desactivar en el panel de config), pero sin que moleste, solo debe interrumpir si se necesita interacción humana."

## Clarifications

### Session 2026-11-10

- Q: ¿Qué comportamiento debe seguir el rastreador automático si el servidor backend no responde al cumplirse las 24 horas? → A: Mostrar una notificación en el escritorio avisando de que el backend no está disponible y reintentar en el siguiente ciclo periódico.
- Q: ¿Cómo debe comportarse la notificación de escritorio y la pestaña de reto anti-bot si el usuario no interactúa con la alerta de inmediato? → A: Combinación A + C: emitir notificación de escritorio persistente (requireInteraction: true) con tiempo límite de seguridad (5-10 min) y a la vez traer automáticamente la pestaña al frente de inmediato para máxima visibilidad.
- Q: ¿La realización de un rastreo manual completo por parte del usuario debe reiniciar la cuenta atrás del rastreo automático? → A: Sí (Opción A), cualquier rastreo completo (manual o automático) reinicia la cuenta atrás. Además, el intervalo temporal (orientativo de 24 horas por defecto) debe ser configurable por el usuario en el panel de ajustes de la extensión.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Non-Intrusive Background Pagination for Search Crawling (Priority: P1)

As a daily browser user and property tracker, I want search result pagination to occur completely in background browser tabs without switching my active tab or stealing window focus, so that the extension can crawl property listings smoothly without interrupting my active work or browsing.

**Why this priority**: It solves the primary friction and disruption in the current search crawl experience. While deep listing inspection already functions in the background, search pagination currently forces the browser to focus the search tab on every page transition, causing disruptive window switching.

**Independent Test**: Can be tested by initiating a multi-page search crawl while actively reading or typing in another browser tab, verifying that page transitions (e.g., page 1 to 2 to 3) execute entirely in an inactive background tab and never steal focus or activate the tab.

**Acceptance Scenarios**:

1. **Given** a user has started a search crawl and is working in another tab, **When** the crawler opens the first search results page, **Then** the page loads in a background (inactive) tab and does not steal focus from the user's active tab.
2. **Given** a search crawl is currently processing page $N$, **When** the crawler advances to page $N+1$, **Then** the navigation occurs in the background tab without making that tab active or changing the user's viewport.
3. **Given** a search crawl finishes all result pages, **When** the search crawl completes, **Then** the background tab closes quietly without disturbing the user's active browsing session.

---

### User Story 2 - Desktop & Browser Alerts for Human Review Blocks (Priority: P2)

As a user running property crawls in the background, I want to receive an immediate system/desktop notification whenever an anti-bot challenge or verification block requires human intervention, so that I am alerted promptly without having to constantly monitor background tabs.

**Why this priority**: Because crawls now execute invisibly in the background, any block or anti-bot challenge requiring human interaction would otherwise stall unnoticed. A clear, immediate notification ensures timely resolution and prevents prolonged crawl interruptions.

**Independent Test**: Can be tested by triggering a verification challenge during either a search crawl or deep crawl, verifying that a system notification appears with an explanatory message, and verifying that clicking the alert or opening the tab focuses the challenge page for the user to solve.

**Acceptance Scenarios**:

1. **Given** a crawl is operating in the background, **When** a security challenge, CAPTCHA, or human verification barrier is detected on a search page or detail page, **Then** the crawl pauses execution, brings the challenge tab immediately to active foreground focus, and displays an immediate, persistent desktop/browser notification stating that human verification is required.
2. **Given** a verification notification is displayed, **When** the user clicks the notification, **Then** the browser window and tab containing the challenge are focused and brought to the foreground for manual completion.
3. **Given** a paused crawl awaiting human verification, **When** the user completes the challenge and the page returns to normal listing content, **Then** the crawler automatically detects clearance, resumes the crawl, and returns execution to the background without further intervention.
4. **Given** a verification alert is raised, **When** the user does not resolve it within a configurable safety timeout (5–10 minutes), **Then** the crawl times out safely, cleans up tabs, and logs the timeout without data loss or duplicate spam notifications.

---

### User Story 3 - Automated Configurable Periodic Background Crawling (Default: 24h) (Priority: P3)

As a property tracker operator, I want the extension to automatically initiate a full background crawl if a configurable time interval (defaulting to 24 hours) has passed since the last complete crawl (whether triggered manually or automatically) whenever the browser is launched and active, with an on/off toggle and interval configuration in settings, so that property data stays fresh automatically without manual effort.

**Why this priority**: It delivers the full "set-it-and-forget-it" automation requested by the user, ensuring property market data is refreshed on a regular cadence while respecting user autonomy through clear configuration controls for both enabling the feature and defining the desired interval.

**Independent Test**: Can be tested by enabling the auto-crawl toggle in settings, specifying a test interval (e.g., 24 hours), simulating a last complete crawl timestamp older than the interval, loading the extension/starting the browser, and confirming that a complete background crawl kicks off automatically without user interaction.

**Acceptance Scenarios**:

1. **Given** the extension configuration panel, **When** the user views settings, **Then** there is a clear toggle control to enable or disable automatic background crawling, and an interval input field in hours (defaulting to 24 hours, minimum 1 hour).
2. **Given** automatic background crawling is enabled and the elapsed time since the last complete crawl reaches or exceeds the configured interval (e.g., 24 hours), **When** the browser is opened or the extension initializes, **Then** the extension automatically starts a full crawl (search discovery and deep analysis) in the background.
3. **Given** a complete crawl finishes successfully (whether launched manually by the user or triggered automatically), **When** completion is confirmed, **Then** the elapsed time counter is reset, establishing a new baseline for the configured interval.
4. **Given** automatic background crawling is enabled but the elapsed time since the last complete crawl is less than the configured interval, **When** the browser is opened or the extension initializes, **Then** no automatic crawl is triggered.
5. **Given** automatic background crawling is disabled in settings, **When** the browser is opened or runs regardless of elapsed time, **Then** no automatic crawl is ever triggered.
6. **Given** an automated background crawl is executing, **When** it progresses through searches and detail analysis, **Then** it runs completely silently in background tabs without opening popups or stealing focus, interrupting the user only if human verification is required (triggering the alert from User Story 2).
7. **Given** a crawl is already running (manually or automatically), **When** an automated schedule check occurs, **Then** the system detects active execution and does not launch a duplicate concurrent crawl.

---

### Edge Cases

- **Browser Closed During Automatic Background Crawl**: If the browser or machine is shut down during an automatic background crawl, the incomplete run is safely terminated; on the next launch, the system recognizes that 24 hours have passed since the last *complete* crawl and schedules or launches a fresh run cleanly.
- **Multiple Browser Windows**: When a user opens multiple browser windows simultaneously on startup, the extension must evaluate the 24-hour trigger centrally (single background coordinator) so that only one crawl session is created.
- **Backend API Unreachable at Scheduled Time**: If the backend service is offline or unreachable when the 24-hour auto-crawl triggers, the extension displays a desktop notification informing the user that the backend server is unavailable, leaves the crawl unmarked as complete, and re-evaluates connectivity on the next scheduled interval.
- **Long Browser Sessions**: If the browser remains open continuously for multiple days without being restarted, a periodic background check (e.g., hourly alarm) evaluates the 24-hour rule so that daily crawls still occur even without browser restarts.
- **Notification Permissions Blocked**: If operating system or browser notification permissions are denied by the user, the crawler still brings the challenge tab to focus or updates its extension badge/status to signal that human interaction is needed, without raising unhandled errors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST perform all search listing navigation and pagination in background browser tabs without setting the tab to active or stealing window focus.
- **FR-002**: System MUST preserve the user's active browser tab and window focus across all search crawl page transitions.
- **FR-003**: System MUST detect anti-bot verification challenges, CAPTCHAs, and human review barriers on both search listing pages and detail property pages.
- **FR-004**: System MUST trigger a persistent operating system / desktop notification (`requireInteraction: true`) and immediately bring the challenge tab to the active foreground upon detecting any human verification requirement.
- **FR-005**: System MUST ensure that clicking the verification notification focuses the browser window and challenge tab if minimized or backgrounded.
- **FR-006**: System MUST pause crawling execution safely while awaiting human verification (enforcing a 5–10 minute safety timeout before aborting) and resume background crawling automatically once the challenge is resolved.
- **FR-007**: System MUST record and persist the exact timestamp of the most recent successfully completed full crawl (covering active searches and deep analysis), whether triggered manually or automatically.
- **FR-008**: System MUST provide user settings in the extension configuration panel to enable or disable automatic background crawling, and to specify the crawl interval in hours (default: 24 hours, minimum: 1 hour).
- **FR-009**: System MUST check on extension load / browser startup whether automatic background crawling is enabled and whether the elapsed time since the last completed crawl is at least the configured interval threshold.
- **FR-010**: System MUST automatically initiate a background crawl when the configured interval threshold is exceeded and the toggle is enabled.
- **FR-011**: System MUST maintain periodic background checks to evaluate the configured interval threshold during prolonged open-browser sessions.
- **FR-012**: System MUST guarantee mutual exclusion so that no more than one crawl process (manual or automatic) can execute concurrently.
- **FR-013**: System MUST record activity and status logs distinguishing between manual and automated crawl runs.
- **FR-014**: System MUST trigger a desktop notification informing the user if an automated crawl cannot start because the backend server is unreachable, and schedule a retry for the next periodic check.
- **FR-015**: System MUST reset the interval countdown upon completion of any full crawl, whether the crawl was initiated manually or automatically.

### Key Entities

- **Crawl Automation Settings**:
  - `auto_crawl_enabled`: Boolean flag indicating if periodic background crawls are activated by the user (persisted in extension settings).
  - `crawl_interval_hours`: Numerical duration threshold (default: 24 hours) required between complete runs.
- **Crawl Execution State**:
  - `last_complete_crawl_at`: Timestamp indicating when the last comprehensive crawl run finished successfully.
  - `current_run_type`: Execution origin indicator (`manual` or `automatic`).
  - `challenge_pending`: Boolean flag indicating whether the crawler is currently paused awaiting human verification.
  - `challenge_tab_id`: Tab identifier currently presenting the verification challenge.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Multi-page search crawling across 10 or more pages executes with 0 instances of tab switching or window focus stealing.
- **SC-002**: 100% of detected human verification challenges trigger a desktop notification within 3 seconds of page load.
- **SC-003**: When the configured interval threshold is reached and the feature is enabled, automated background crawl initiates within 60 seconds of browser startup.
- **SC-004**: 0 duplicate or concurrent crawl executions occur when multiple windows open or when repetitive triggers fire.
- **SC-005**: 100% of automated background crawls run quietly to completion without opening new foreground tabs or interrupting the user unless human interaction is required.
- **SC-006**: Users can toggle automatic crawling on or off and configure the interval hours in the configuration panel with immediate persistence and zero browser restart required.

## Assumptions

- The user operates a Chromium-compatible desktop browser that supports background tabs, desktop notifications, and persistent local extension storage.
- Desktop notifications are supported by the operating system and have not been globally muted or disabled for the browser.
- A "complete crawl" is defined as successfully finishing all active saved searches and completing deep property analysis on pending listings.
- If the browser is closed or off at the exact 24-hour mark, the crawl triggers automatically on the next browser session when the extension loads.
- The default state for automatic background crawling can be configured in settings (with a recommended default enabled once configured).
