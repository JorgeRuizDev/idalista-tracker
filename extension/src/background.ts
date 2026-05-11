// Background service worker for crawl orchestration
import type { CrawlConfig, CrawlState, SavedSearch, ExtractedSavedSearch } from './types';
import * as crawler from './services/crawler';
import * as storage from './services/storage';

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Idalista Property Crawler installed');
  
  // Set default configuration
  const defaultConfig: CrawlConfig = {
    server_url: 'http://localhost:8000',
    human_like_enabled: true,
    min_page_delay: 2000,
    max_page_delay: 8000,
    min_navigation_delay: 5000,
    max_navigation_delay: 15000,
  };
  
  chrome.storage.local.set({ config: defaultConfig });
});

// Handle messages from popup and content scripts
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

// Handle save searches - saves to local storage only
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
    
    const defaultConfig: CrawlConfig = {
      server_url: 'http://localhost:8000',
      human_like_enabled: true,
      min_page_delay: 2000,
      max_page_delay: 8000,
      min_navigation_delay: 5000,
      max_navigation_delay: 15000,
    };
    
    return { config: config || defaultConfig };
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
chrome.runtime.onStartup.addListener(async () => {
  const state = await storage.getCrawlState();
  
  if (state && state.is_running) {
    console.log('Found running crawl session on startup:', state.session_id);
    addLogEntry(`Found running session ${state.session_id} on startup`, 'info');
    // The crawler will handle resume internally when called
  }
});
