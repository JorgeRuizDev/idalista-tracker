# Technical Research: Automated Background Crawling and Human Challenge Notifications

**Feature Branch**: `010-background-crawl-automation`  
**Date**: 2026-11-10  
**Status**: Completed  

## 1. Background Tab Navigation & Focus Preservation

### Context
In Chrome Extension Manifest V3, search crawling currently uses `chrome.tabs.update(tab.id, { url, active: true })` and `chrome.tabs.create({ url, active: true })` inside `crawler.ts:navigateToUrl`. Every time the crawler navigates to a new page or changes search pagination, it forces the tab to become active (`active: true`), stealing the user's active viewport and interfering with their browsing. Conversely, `detail_crawler.ts` successfully creates tabs with `active: false`.

### Decision
- **Dedicated Crawl Tab**: Standardize search crawl navigation to maintain a single background tab reference (`crawlTabId`).
- **Inactive Tab Navigation**: Use `chrome.tabs.create({ url, active: false })` when opening the crawl tab, and `chrome.tabs.update(crawlTabId, { url, active: false })` during page transitions.
- **Focus Preservation**: Ensure the user's current active tab in the focused window is preserved at all times during page navigation.
- **Tab Cleanup**: Close the dedicated crawl tab when the crawl finishes (or on stop/abort).

### Rationale
- Completely eliminates window/tab switching during pagination (P1 requirement).
- Reuses the background tab pattern already validated in `detail_crawler.ts`.
- Prevents polluting the user's workspace with multiple stray search tabs.

### Alternatives Considered
- *Offscreen Document / Fetch*: Idealista employs client-side rendering, session cookies, and anti-bot fingerprints that fail when fetched headlessly or without full browser rendering context. Background browser tabs provide authentic browser fidelity without fingerprint anomalies.
- *Discarded Tab / Hidden Window*: Chrome does not support completely hidden browser windows without native/system window tricks. Background inactive tabs (`active: false`) in the current window are the standard and reliable extension pattern.

---

## 2. Desktop & Browser Notifications for Human Verification

### Context
When anti-bot challenges (Cloudflare Turnstile, PerimeterX, CAPTCHA, or human verification barriers) are encountered during background search crawling or deep listing extraction, the process must pause and alert the user immediately. Because crawls run quietly in the background, a system/desktop notification is necessary.

### Decision
- **Permissions**: Add `"notifications"` to `manifest.json`.
- **Notification Trigger**: Use `chrome.notifications.create(notificationId, options)` when a challenge is detected in either `crawler.ts` or `detail_crawler.ts`.
- **Sticky Notification**: Configure options with `requireInteraction: true`, `priority: 2`, and informative title/message (*"Idalista Tracker: Verificación humana requerida"*).
- **Click-to-Focus Handler**: Register a top-level `chrome.notifications.onClicked` listener in `background.ts`. When clicked:
  1. Retrieve the window and tab ID where the challenge is hosted.
  2. Focus the browser window: `chrome.windows.update(windowId, { focused: true })`.
  3. Activate the challenge tab: `chrome.tabs.update(tabId, { active: true })`.
  4. Dismiss the notification: `chrome.notifications.clear(notificationId)`.
- **Challenge Resolution Loop**: Retain polling until the challenge DOM resolves. Once resolved, the crawler logs the clearance and continues crawling in the background without needing a manual restart.

### Rationale
- `requireInteraction: true` keeps the desktop notification visible even if the user stepped away momentarily, ensuring the crawler is not left stalled indefinitely without notice.
- Seamlessly connects the notification click to the exact tab requiring intervention.

### Alternatives Considered
- *Auto-activating the tab immediately without notification*: Directly stealing user focus when browsing another site is jarring and intrusive. The desktop notification gives clear context before bringing the tab forward.
- *Audio beep only*: Audio can be muted or unhelpful if the user is in a different room or listening to media. Desktop notification is OS-native and persistent.

---

## 3. 24-Hour Periodic Auto-Crawl Scheduling in Manifest V3

### Context
Manifest V3 background service workers are ephemeral: Chrome terminates them after 30 seconds of inactivity. In-memory `setInterval` or `setTimeout` timers are destroyed upon service worker teardown.

### Decision
- **Alarms API**: Use `chrome.alarms` to schedule periodic evaluation checks. Create a recurring alarm named `AUTO_CRAWL_CHECK_ALARM` with `periodInMinutes: 30` (or `60`).
- **Startup Trigger**: Register `chrome.runtime.onStartup` to check the schedule immediately whenever the browser launches.
- **24-Hour Eligibility Rule**:
  - Read `config.auto_crawl_enabled` (boolean, defaults to false until enabled or configured).
  - Read `lastCrawlStats.completedAt` (stored timestamp in ms).
  - Condition: `is_running === false` AND `auto_crawl_enabled === true` AND (`!completedAt || (now - completedAt) >= 24 * 60 * 60 * 1000)`.
- **Crawl Execution**:
  - Fetch active saved searches with `crawl_enabled !== false`.
  - If searches exist and backend is responsive, execute `crawler.startCrawl(searchIds, serverUrl)`.
  - Mark crawl trigger origin as `automatic`.
- **Anti-Concurrency Lock**:
  - Central check in `background.ts` verifies `crawlState.is_running`. If already running (manual or automated), the trigger is ignored.

### Rationale
- `chrome.alarms` is the official, battery-friendly, and persistent mechanism supported by Chromium for waking service workers.
- Combining `onStartup` and `onAlarm` guarantees that:
  - Users who restart their browser daily trigger the check immediately upon launch.
  - Users who keep their browser open indefinitely still trigger the check via the periodic alarm once 24 hours have elapsed.

### Alternatives Considered
- *Backend-driven Webhooks/Push*: Would require a persistent push server or WebSocket connection to the extension, adding architectural complexity. Local Chrome alarms are completely self-contained within the extension.
- *Offscreen document with continuous setInterval*: Disallowed by Chrome Web Store policies when alarms provide the exact intended functionality.

---

## 4. Unification of Anti-Bot Challenge Detection

### Context
`detail_crawler.ts` already has robust challenge detection (`inspectTabContent`) and polling routines. However, `crawler.ts` (search listing crawl) does not check for challenge pages, meaning a bot challenge on a search page results in empty extraction or script errors.

### Decision
- Extract challenge detection patterns into a shared utility or adapt `crawler.ts` to inspect the page after navigation:
  - Check for Cloudflare Turnstile containers (`#challenge-running`, `.cf-turnstile`, `iframe[src*="cloudflare"]`).
  - Check for Idealista verification / bot challenge text (`geo.captcha`, `Verifica que eres humano`, `Atención: Por favor, introduce el código`).
- If detected during search crawling:
  - Trigger desktop notification.
  - Set stage to `paused_challenge`.
  - Wait for challenge resolution before attempting DOM listing extraction.
  - Once resolved, proceed with listing parsing.

### Rationale
- Guarantees end-to-end resilience across both crawl stages (Search Discovery and Deep Analysis).
