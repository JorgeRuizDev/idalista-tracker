# Quickstart & Validation Guide: Background Crawl Automation

**Feature Branch**: `010-background-crawl-automation`  
**Date**: 2026-11-10  
**Status**: Completed  

## 1. Prerequisites

1. **Backend Service Running**:
   ```bash
   curl -s http://localhost:8050/health
   # Expected: {"status": "healthy", ...}
   ```
2. **Chrome Extension Built & Loaded**:
   - Directory: `extension/`
   - Build command:
     ```bash
     cd extension && npm run build
     ```
   - Load unpacked extension into Chrome from `extension/dist` (or `extension/` via dev tooling).

---

## 2. Validation Scenarios

### Scenario 1: Non-Intrusive Search Pagination (Background Navigation)

- **Objective**: Verify that crawling a multi-page search does not steal tab focus or switch windows.
- **Steps**:
  1. Open Chrome with two tabs: Tab A (e.g. YouTube or GitHub) and the extension popup in Tab A.
  2. Launch a crawl with a saved search that contains $\ge 2$ pages of listings.
  3. Immediately switch focus to Tab A and interact with it (e.g. scroll or type in an input box).
  4. Observe background crawling as page 1 finishes and the crawler advances to page 2 and page 3.
- **Expected Outcome**:
  - The crawler tab opens as an inactive tab in the background (`active: false`).
  - When advancing from page 1 to page 2 and beyond, Tab A remains active and in focus. Zero focus stealing occurs.

---

### Scenario 2: Anti-Bot Challenge Notification & Focus on Click

- **Objective**: Verify that an anti-bot challenge triggers an OS/Chrome desktop notification and that clicking it focuses the challenge tab.
- **Steps**:
  1. Trigger or simulate a challenge page on an active crawl tab.
  2. Observe system notification behavior while viewing an unrelated desktop window.
  3. Click the desktop notification.
- **Expected Outcome**:
  - A desktop notification appears with title *"Idalista Tracker: Verificación humana requerida"* and stays visible (`requireInteraction: true`).
  - Clicking the notification brings the browser window to the front and activates the exact tab containing the challenge.
  - Solving the challenge allows the crawler to resume automatically and return to background mode.

---

### Scenario 3: 24-Hour Automated Crawl Scheduling

- **Objective**: Verify that after 24 hours have elapsed without a full crawl, launching the browser or triggering the alarm automatically starts a full background crawl.
- **Steps**:
  1. Open extension settings (`options/index.html`).
  2. Ensure *"Activar rastreo automático en segundo plano"* (Auto Crawl) is checked and interval is set to 24 hours. Save settings.
  3. In extension storage console or test harness, set `lastCrawlStats.completedAt` to 25 hours ago:
     ```javascript
     chrome.storage.local.set({
       lastCrawlStats: {
         sessionId: 1,
         totalProperties: 10,
         pagesProcessed: 1,
         searchesCrawled: 1,
         completedAt: Date.now() - (25 * 60 * 60 * 1000),
         trigger: 'manual'
       }
     });
     ```
  4. Trigger extension startup check (or restart browser / reload extension).
- **Expected Outcome**:
  - The extension detects that 25 hours have elapsed ($> 24$ hours).
  - An automated full crawl starts quietly in the background without opening popups or interrupting the user.
  - On crawl completion, `lastCrawlStats.completedAt` updates to the current timestamp.
  - A subsequent startup check does not trigger a crawl because $< 24$ hours have elapsed.
