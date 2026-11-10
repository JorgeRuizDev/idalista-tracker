# Contract: Crawler Automation & Notification Interfaces

**Feature Branch**: `010-background-crawl-automation`  
**Date**: 2026-11-10  
**Status**: Completed  

## 1. Extension Runtime Message Contracts

### 1.1 `CHECK_AUTO_CRAWL` (Internal Schedule Check)

Dispatched on browser startup (`chrome.runtime.onStartup`) and alarm triggers (`chrome.alarms.onAlarm`).

- **Sender**: `background.ts` (Alarm / Startup handler)
- **Receiver**: `background.ts:evaluateAutoCrawlCondition`

#### Request Payload
```typescript
interface CheckAutoCrawlPayload {
  forced?: boolean;          // If true, bypasses elapsed time check (for testing)
}
```

#### Response Payload
```typescript
interface CheckAutoCrawlResponse {
  triggered: boolean;        // True if automated crawl was initiated
  reason?: 'disabled' | 'running' | 'interval_not_elapsed' | 'no_searches' | 'started';
  elapsed_ms?: number;
  interval_ms?: number;
}
```

---

### 1.2 `CHALLENGE_DETECTED` / Notification Event

Triggered by `crawler.ts` or `detail_crawler.ts` when a human review challenge is identified.

- **Sender**: Crawler sub-service
- **Handler**: `background.ts:handleChallengeNotification`

#### Event Payload
```typescript
interface ChallengeDetectedPayload {
  stage: 'search' | 'detail';
  tab_id: number;
  url: string;
  reason: 'cloudflare_turnstile' | 'captcha' | 'antibot_block';
}
```

#### Expected System Actions
1. Emit desktop notification:
   ```typescript
   chrome.notifications.create(notificationId, {
     type: 'basic',
     iconUrl: 'icons/icon128.png',
     title: 'Idalista Tracker: Verificación humana requerida',
     message: 'Se ha detectado un reto anti-bot. Haz clic aquí para resolverlo y reanudar el rastreo.',
     requireInteraction: true,
     priority: 2,
   });
   ```
2. Store `ActiveChallengeState` linking `notificationId` to `tab_id`.
3. On `chrome.notifications.onClicked(notificationId)`:
   - Identify `tab_id`.
   - Update Chrome window to `{ focused: true }`.
   - Update Chrome tab to `{ active: true }`.
   - Clear notification.

---

### 1.3 `CONFIG_UPDATED` (Options Page -> Background)

Dispatched when user updates settings in the options page.

#### Request Payload
```typescript
interface SaveConfigMessage {
  type: 'SAVE_CONFIG';
  payload: {
    server_url: string;
    human_like_enabled: boolean;
    min_page_delay: number;
    max_page_delay: number;
    min_navigation_delay: number;
    max_navigation_delay: number;
    auto_crawl_enabled: boolean;
    auto_crawl_interval_hours: number;
  };
}
```

#### Response Payload
```typescript
interface SaveConfigResponse {
  success: boolean;
  error?: string;
}
```

---

## 2. Chrome Alarms Contract

- **Alarm Name**: `AUTO_CRAWL_SCHEDULE_ALARM`
- **Period**: `30` or `60` minutes
- **Lifecycle**:
  - Registered or updated during `chrome.runtime.onInstalled` and whenever `SAVE_CONFIG` is processed.
  - If `auto_crawl_enabled` is set to `false`, the alarm is cleared or ignored upon triggering.
