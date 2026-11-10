// Background service worker for crawl orchestration
import type {
  CrawlConfig,
  CrawlState,
  SavedSearch,
  ExtractedSavedSearch,
  ActiveChallengeState,
  ChallengeDetectedPayload,
  CheckAutoCrawlPayload,
  CheckAutoCrawlResponse,
} from './types';
import * as crawler from './services/crawler';
import * as storage from './services/storage';
import * as api from './services/api';
import { runFallbackDetailCrawlCycle } from './services/detail_crawler';

// In-memory active challenge registry
const activeChallenges = new Map<number, ActiveChallengeState>();

export function _resetChallengeStateForTesting(): void {
  activeChallenges.clear();
}

export function getActiveChallenge(tabId: number): ActiveChallengeState | null {
  return activeChallenges.get(tabId) || null;
}

/**
 * Dispatch desktop notification when anti-bot challenge is detected
 */
export async function handleChallengeNotification(
  payload: ChallengeDetectedPayload
): Promise<string> {
  const notificationId = `challenge-${payload.tab_id}-${Date.now()}`;
  let windowId = 0;

  try {
    if (chrome.tabs && chrome.tabs.get) {
      const tab = await chrome.tabs.get(payload.tab_id);
      windowId = tab?.windowId || 0;
    }
  } catch (_) {}

  const state: ActiveChallengeState = {
    tabId: payload.tab_id,
    windowId,
    notificationId,
    detectedAt: Date.now(),
    stage: payload.stage,
    url: payload.url,
    resolved: false,
  };

  activeChallenges.set(payload.tab_id, state);

  if (chrome.notifications && chrome.notifications.create) {
    await chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Idalista Tracker: Verificación humana requerida',
      message: 'Se ha detectado un reto anti-bot. Haz clic aquí para resolverlo y reanudar el rastreo.',
      requireInteraction: true,
      priority: 2,
    });
  }

  return notificationId;
}

/**
 * Handle notification click: focus window and challenge tab, dismiss notification
 */
export async function handleNotificationClick(notificationId: string): Promise<void> {
  let matchedTabId: number | null = null;
  let matchedChallenge: ActiveChallengeState | null = null;

  for (const [tabId, challenge] of activeChallenges.entries()) {
    if (challenge.notificationId === notificationId) {
      matchedTabId = tabId;
      matchedChallenge = challenge;
      break;
    }
  }

  if (matchedChallenge) {
    try {
      if (matchedChallenge.windowId && chrome.windows?.update) {
        await chrome.windows.update(matchedChallenge.windowId, { focused: true });
      }
      if (chrome.tabs?.update) {
        await chrome.tabs.update(matchedChallenge.tabId, { active: true });
      }
    } catch (err) {
      console.warn('Failed to focus challenge window/tab:', err);
    }
  }

  if (chrome.notifications?.clear) {
    await chrome.notifications.clear(notificationId);
  }
}

/**
 * Dismiss challenge notification and state when resolved
 */
export async function dismissChallengeNotification(tabId: number): Promise<void> {
  const challenge = activeChallenges.get(tabId);
  if (challenge) {
    if (chrome.notifications?.clear) {
      await chrome.notifications.clear(challenge.notificationId);
    }
    activeChallenges.delete(tabId);
  }
}

export const AUTO_CRAWL_SCHEDULE_ALARM = 'AUTO_CRAWL_SCHEDULE_ALARM';

/**
 * Configure periodic alarm for background crawl evaluation
 */
export async function setupAutoCrawlAlarm(enabled: boolean): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.alarms) return;

  if (enabled) {
    chrome.alarms.create(AUTO_CRAWL_SCHEDULE_ALARM, {
      periodInMinutes: 30,
    });
    console.log('[AutoCrawl] Periodic alarm configured (every 30m).');
  } else {
    chrome.alarms.clear(AUTO_CRAWL_SCHEDULE_ALARM);
    console.log('[AutoCrawl] Periodic alarm cleared.');
  }
}

/**
 * Evaluate automated background crawl condition based on schedule, flags, and connectivity
 */
export async function evaluateAutoCrawlCondition(
  payload?: CheckAutoCrawlPayload
): Promise<CheckAutoCrawlResponse> {
  const config = await storage.getConfig();
  if (!config || !config.auto_crawl_enabled) {
    return { triggered: false, reason: 'disabled' };
  }

  const crawlState = await storage.getCrawlState();
  if (crawlState && crawlState.is_running) {
    console.log('[AutoCrawl] Crawl already running. Skipping automatic trigger.');
    return { triggered: false, reason: 'running' };
  }

  const lastStats = await storage.getLastCrawlStats();
  const intervalHours = config.auto_crawl_interval_hours || 24;
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const completedAt = lastStats?.completedAt || 0;
  const elapsedMs = Date.now() - completedAt;

  if (!payload?.forced && completedAt > 0 && elapsedMs < intervalMs) {
    console.log(
      `[AutoCrawl] Interval not elapsed: ${Math.round(elapsedMs / 3600000)}h / ${intervalHours}h elapsed.`
    );
    return {
      triggered: false,
      reason: 'interval_not_elapsed',
      elapsed_ms: elapsedMs,
      interval_ms: intervalMs,
    };
  }

  // Check backend connectivity
  const isHealthy = await api.checkBackendHealth(config.server_url);
  if (!isHealthy) {
    console.warn('[AutoCrawl] Backend server unreachable. Deferring crawl and alerting user.');
    if (typeof chrome !== 'undefined' && chrome.notifications?.create) {
      await chrome.notifications.create(`backend-offline-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Idalista Tracker: Servidor no disponible',
        message: 'No se pudo conectar con el servidor local para el rastreo automático programado. Se reintentará en el próximo ciclo.',
      });
    }
    return { triggered: false, reason: 'backend_offline' };
  }

  // Get active saved searches
  const searches = await storage.getSavedSearches();
  const activeSearches = searches.filter(s => s.crawl_enabled);
  if (activeSearches.length === 0) {
    console.log('[AutoCrawl] No enabled searches found for automated crawl.');
    return { triggered: false, reason: 'no_searches' };
  }

  console.log(
    `[AutoCrawl] Starting automated background crawl for ${activeSearches.length} searches (interval: ${intervalHours}h)...`
  );
  addLogEntry(
    `[AutoCrawl] Starting automated background crawl (${activeSearches.length} searches)`,
    'info'
  );

  const result = await crawler.startCrawl(
    activeSearches.map(s => s.id),
    config.server_url,
    'automatic'
  );

  return { triggered: result.success, reason: result.success ? 'started' : 'disabled' };
}

// Notification click listener
if (typeof chrome !== 'undefined' && chrome.notifications?.onClicked) {
  chrome.notifications.onClicked.addListener((notificationId) => {
    handleNotificationClick(notificationId).catch(console.error);
  });
}

// Alarm listener for periodic schedule evaluation
if (typeof chrome !== 'undefined' && chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === AUTO_CRAWL_SCHEDULE_ALARM) {
      console.log('[AutoCrawl] Alarm triggered, evaluating schedule condition...');
      evaluateAutoCrawlCondition().catch(console.error);
    }
  });
}

// Initialize extension on install
if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(async () => {
    console.log('Idalista Property Crawler installed');
    const existing = await storage.getConfig();
    if (!existing) {
      await storage.saveConfig(storage.DEFAULT_CONFIG);
    }
    const config = await storage.getConfig();
    await setupAutoCrawlAlarm(Boolean(config?.auto_crawl_enabled));
  });
}

// Handle messages from popup and content scripts
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type, message);
  
  if (!message.type) {
    console.error('Message without type received:', message);
    sendResponse({ error: 'Message type is required' });
    return false;
  }
  
  switch (message.type) {
    case 'START_CRAWL':
      handleStartCrawl(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async
      
    case 'GET_STATUS':
      handleGetStatus()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ is_running: false, error: error.message }));
      return true;
      
    case 'PAUSE_CRAWL':
      handlePauseCrawl()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, can_resume: false, error: error.message }));
      return true;
      
    case 'RESUME_CRAWL':
      handleResumeCrawl()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'GET_SEARCHES':
      handleGetSearches()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ searches: [], error: error.message }));
      return true;
      
    case 'SAVE_SEARCHES':
      handleSaveSearches(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'SYNC_SEARCHES':
      handleSyncSearches()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'RUN_DETAIL_FALLBACK_CRAWL':
      runFallbackDetailCrawlCycle()
        .then(response => sendResponse({ success: true, ...response }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'GET_PENDING_DETAILS_COUNT':
      api
        .fetchPendingDetails(1, false)
        .then(res => sendResponse({ success: true, count: res.pending_count }))
        .catch(err => sendResponse({ success: false, count: 0, error: err.message }));
      return true;

    case 'START_DETAIL_CRAWL_ONLY':
      crawler
        .startDetailCrawlOnly()
        .then(res => sendResponse(res))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'CHALLENGE_DETECTED':
      handleChallengeNotification(message.payload)
        .then(notificationId => sendResponse({ success: true, notificationId }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'DISMISS_CHALLENGE':
      dismissChallengeNotification(message.payload?.tab_id)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'CHECK_AUTO_CRAWL':
      evaluateAutoCrawlCondition(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ triggered: false, reason: error.message }));
      return true;

    case 'SAVE_CONFIG':
      handleSaveConfig(message.payload)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'GET_CONFIG':
      handleGetConfig()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ config: null, error: error.message }));
      return true;
      
    case 'STOP_CRAWL':
      handleStopCrawl()
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      console.error('Unknown message type received:', message.type, message);
      sendResponse({ error: `Unknown message type: ${message.type}` });
  }
  });
}

// Handle start crawl - now uses the actual crawler service
async function handleStartCrawl(payload: { search_ids: number[]; server_url: string }) {
  try {
    console.log('Starting crawl with searches:', payload.search_ids);
    addLogEntry(`Starting crawl with ${payload.search_ids.length} searches...`, 'info');
    
    // Use the actual crawler service
    const result = await crawler.startCrawl(payload.search_ids, payload.server_url);
    
    if (result.success) {
      addLogEntry(`Crawl session started: ${result.session_id}`, 'success');
    } else {
      addLogEntry(`Failed to start crawl: ${result.error}`, 'error');
    }
    
    return result;
  } catch (error) {
    console.error('Failed to start crawl:', error);
    const errorMsg = (error as Error).message;
    addLogEntry(`Failed to start crawl: ${errorMsg}`, 'error');
    return { success: false, error: errorMsg };
  }
}

// Handle get status - now uses the crawler service
async function handleGetStatus() {
  try {
    const status = await crawler.getCrawlStatus();
    return status;
  } catch (error) {
    console.error('Failed to get status:', error);
    return {
      is_running: false,
      progress: {
        total_searches: 0,
        completed_searches: 0,
        total_pages: 0,
        total_properties: 0,
      },
    };
  }
}

// Handle pause crawl - now uses the crawler service
async function handlePauseCrawl() {
  try {
    const result = await crawler.pauseCrawl();
    if (result.success) {
      addLogEntry('Crawl paused', 'warning');
    }
    return { success: result.success, can_resume: result.can_resume };
  } catch (error) {
    console.error('Failed to pause crawl:', error);
    return { success: false, can_resume: false };
  }
}

// Handle resume crawl - now uses the crawler service
async function handleResumeCrawl() {
  try {
    const result = await crawler.resumeCrawl();
    if (result.success) {
      addLogEntry('Crawl resumed', 'success');
    } else {
      addLogEntry(`Failed to resume: ${result.error}`, 'error');
    }
    return result;
  } catch (error) {
    console.error('Failed to resume crawl:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Handle stop crawl - force stop and clear state
async function handleStopCrawl() {
  try {
    addLogEntry('Force stopping crawl...', 'warning');
    
    // First try to pause gracefully
    await crawler.pauseCrawl();
    
    // Clear crawl state from storage
    await storage.clearCrawlState();
    
    addLogEntry('Crawl stopped and state cleared', 'success');
    return { success: true };
  } catch (error) {
    console.error('Failed to stop crawl:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Handle get searches - returns from storage
async function handleGetSearches() {
  try {
    const searches = await storage.getSavedSearches();
    return { searches };
  } catch (error) {
    console.error('Failed to get searches:', error);
    return { searches: [] };
  }
}

// Handle save searches - saves to local storage and syncs with backend
async function handleSaveSearches(payload: { searches: ExtractedSavedSearch[] }) {
  try {
    // Convert extracted searches to SavedSearch format with IDs
    const existingSearches = await storage.getSavedSearches();
    const searches: SavedSearch[] = payload.searches.map((extracted, index) => {
      // Check if this search already exists
      const existing = existingSearches.find(s => s.external_id === extracted.external_id);
      return {
        id: existing?.id || Date.now() + index,
        external_id: extracted.external_id,
        name: extracted.name,
        url: extracted.url,
        full_url: extracted.full_url,
        result_count: extracted.result_count,
        description: extracted.description,
        crawl_enabled: existing?.crawl_enabled ?? false,
        last_crawled_at: existing?.last_crawled_at,
      };
    });

    await storage.saveSavedSearches(searches);
    addLogEntry(`Saved ${searches.length} searches to local storage`, 'success');

    // Sync with backend
    try {
      // Map local search format to backend format
      const backendSearches = searches.map(s => ({
        external_search_id: s.external_id,
        name: s.name,
        url_path: s.url,
        full_url: s.full_url,
        description: s.description,
        result_count: s.result_count,
      }));

      const syncResult = await api.syncSavedSearches({ searches: backendSearches as any });
      addLogEntry(`Synced ${syncResult.synced} searches with backend (${syncResult.created} created, ${syncResult.updated} updated)`, 'success');

      // Fetch updated searches from backend to get their IDs
      const fetchedSearches = await api.getSavedSearches();

      // Update local searches with backend IDs
      // Note: Backend returns external_search_id, we map it to external_id
      const updatedSearches = searches.map(localSearch => {
        const backendSearch = fetchedSearches.find(s =>
          (s as any).external_search_id === localSearch.external_id || s.external_id === localSearch.external_id
        );
        if (backendSearch) {
          return {
            ...localSearch,
            id: backendSearch.id, // Use backend ID for future API calls
          };
        }
        return localSearch;
      });

      await storage.saveSavedSearches(updatedSearches);
      addLogEntry(`Updated local searches with backend IDs`, 'success');
    } catch (syncError) {
      console.error('Failed to sync searches with backend:', syncError);
      addLogEntry(`Failed to sync searches: ${(syncError as Error).message}`, 'error');
      // Continue anyway - searches are saved locally
    }

    return { success: true, searches };
  } catch (error) {
    console.error('Failed to save searches:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Handle sync searches - goes to Idealista page and extracts searches
async function handleSyncSearches() {
  try {
    addLogEntry('Opening Idealista saved searches page...', 'info');
    
    // Open the saved searches page
    const tab = await chrome.tabs.create({ 
      url: 'https://www.idealista.com/usuario/tus-alertas',
      active: true 
    });
    
    // Wait for page to load and then extract
    setTimeout(async () => {
      if (tab.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_SEARCHES' });
          if (response && response.data && response.data.length > 0) {
            await handleSaveSearches({ searches: response.data });
            addLogEntry(`Synced ${response.data.length} searches from Idealista`, 'success');
          } else {
            addLogEntry('No searches found on Idealista page', 'warning');
          }
        } catch (error) {
          console.log('Could not extract searches yet, page may still be loading');
        }
      }
    }, 3000);
    
    return { success: true, message: 'Opened Idealista saved searches page' };
  } catch (error) {
    console.error('Failed to sync searches:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Handle save config
async function handleSaveConfig(config: CrawlConfig) {
  try {
    await storage.saveConfig(config);
    await setupAutoCrawlAlarm(Boolean(config.auto_crawl_enabled));
    addLogEntry('Configuration saved', 'info');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Handle get config
async function handleGetConfig() {
  try {
    const config = await storage.getConfig();
    
    // Auto-migrate legacy default port 8000 to 8050
    if (config && config.server_url === 'http://localhost:8000') {
      config.server_url = 'http://localhost:8050';
      await storage.saveConfig(config);
    }

    return { config: config || storage.DEFAULT_CONFIG };
  } catch (error) {
    return { config: null, error: (error as Error).message };
  }
}

// Helper to add log entry (for background logging)
function addLogEntry(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
}

// Check for resume on startup
if (typeof chrome !== 'undefined' && chrome.runtime?.onStartup) {
  chrome.runtime.onStartup.addListener(async () => {
    const state = await storage.getCrawlState();
    
    if (state && state.is_running) {
      console.log('Found running crawl session on startup:', state.session_id);
      addLogEntry(`Found running session ${state.session_id} on startup`, 'info');
      // The crawler will handle resume internally when called
    } else {
      // Evaluate automated background crawl schedule on browser launch
      evaluateAutoCrawlCondition().catch(console.error);
    }
  });
}
