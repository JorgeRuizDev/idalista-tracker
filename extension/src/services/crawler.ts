// Crawl orchestration service
import type { CrawlConfig, CrawlState, SavedSearch, Property, PaginationInfo } from '../types';
import * as storage from './storage';
import * as api from './api';

// Crawl state
let isRunning = false;
let currentSessionId: number | null = null;
let currentSearchIndex = 0;
let selectedSearches: SavedSearch[] = [];
let abortController: AbortController | null = null;

/**
 * Start a new crawl session
 */
export async function startCrawl(
  searchIds: number[],
  serverUrl: string
): Promise<{ success: boolean; session_id?: number; error?: string }> {
  if (isRunning) {
    return { success: false, error: 'Crawl already running' };
  }
  
  try {
    // Get searches from local storage (where they were saved from the page)
    const searches = await storage.getSavedSearches();
    selectedSearches = searches.filter(s => searchIds.includes(s.id));
    
    if (selectedSearches.length === 0) {
      return { success: false, error: 'No valid searches selected. Please sync searches from Idealista first.' };
    }
    
    // Create crawl session
    let session;
    try {
      session = await api.createCrawlSession({
        server_url: serverUrl,
        human_like_enabled: true,
        extension_version: '1.0.0',
        selected_search_ids: searchIds,
      });
      console.log('Crawl session created:', session);
    } catch (apiError) {
      console.error('Failed to create crawl session:', apiError);
      isRunning = false;
      return { 
        success: false, 
        error: `Backend error: ${(apiError as Error).message}. Make sure the backend server is running.` 
      };
    }
    
    if (!session || !session.id) {
      isRunning = false;
      return { success: false, error: 'Invalid response from backend: missing session ID' };
    }
    
    currentSessionId = session.id;
    isRunning = true;
    currentSearchIndex = 0;
    abortController = new AbortController();
    
    // Save initial state
    const crawlState: CrawlState = {
      is_running: true,
      session_id: session.id,
      progress: {
        total_searches: selectedSearches.length,
        completed_searches: 0,
        total_pages: 0,
        total_properties: 0,
      },
    };
    await storage.saveCrawlState(crawlState);
    
    // Start crawling
    crawlLoop();
    
    return { success: true, session_id: session.id };
  } catch (error) {
    console.error('Failed to start crawl:', error);
    isRunning = false;
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Pause the current crawl
 */
export async function pauseCrawl(): Promise<{ success: boolean; can_resume: boolean }> {
  if (!isRunning) {
    return { success: false, can_resume: false };
  }
  
  abortController?.abort();
  isRunning = false;
  
  // Update state
  const state = await storage.getCrawlState();
  if (state) {
    state.is_running = false;
    await storage.saveCrawlState(state);
  }
  
  return { success: true, can_resume: currentSessionId !== null };
}

/**
 * Resume a paused crawl
 */
export async function resumeCrawl(): Promise<{ success: boolean; error?: string }> {
  if (isRunning) {
    return { success: false, error: 'Crawl already running' };
  }
  
  const state = await storage.getCrawlState();
  if (!state || !state.session_id) {
    return { success: false, error: 'No session to resume' };
  }
  
  isRunning = true;
  currentSessionId = state.session_id;
  abortController = new AbortController();
  
  // Update state
  state.is_running = true;
  await storage.saveCrawlState(state);
  
  // Resume crawling
  crawlLoop();
  
  return { success: true };
}

/**
 * Get current crawl status
 */
export async function getCrawlStatus(): Promise<CrawlState> {
  const state = await storage.getCrawlState();
  
  if (!state) {
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
  
  return state;
}

/**
 * Main crawl loop
 */
async function crawlLoop(): Promise<void> {
  const config = await storage.getConfig();
  
  console.log(`Starting crawl loop for ${selectedSearches.length} searches`);
  
  for (let i = currentSearchIndex; i < selectedSearches.length; i++) {
    if (!isRunning || abortController?.signal.aborted) {
      console.log('Crawl loop stopping (paused or aborted)');
      break;
    }
    
    currentSearchIndex = i;
    const search = selectedSearches[i];
    
    console.log(`Crawling search ${i + 1}/${selectedSearches.length}: ${search.name}`);
    
    try {
      await crawlSearch(search, config);
    } catch (error) {
      console.error(`Failed to crawl search ${search.name}:`, error);
    }
    
    // Update progress
    const state = await storage.getCrawlState();
    if (state) {
      state.progress.completed_searches = i + 1;
      await storage.saveCrawlState(state);
    }
  }
  
  // Complete session
  if (isRunning && currentSessionId) {
    console.log('All searches completed, finalizing session');
    const state = await storage.getCrawlState();
    if (state) {
      try {
        await api.completeCrawlSession(currentSessionId, {
          total_properties: state.progress.total_properties,
          pages_processed: state.progress.total_pages,
          searches_crawled: state.progress.completed_searches,
        });
        console.log('Session completed successfully');
      } catch (error) {
        console.error('Failed to complete session:', error);
      }
    }
  }
  
  isRunning = false;
  
  // Update state to reflect crawl is no longer running
  const finalState = await storage.getCrawlState();
  if (finalState) {
    finalState.is_running = false;
    await storage.saveCrawlState(finalState);
  }
  
  currentSessionId = null;
  currentSearchIndex = 0;
  
  console.log('Crawl loop ended');
}

/**
 * Crawl a single search
 */
async function crawlSearch(search: SavedSearch, config: CrawlConfig | null): Promise<void> {
  console.log(`Crawling search: ${search.name}`);
  
  // Update state with current search
  let state = await storage.getCrawlState();
  if (state) {
    state.current_search = { id: search.id, name: search.name };
    state.current_page = 1;
    await storage.saveCrawlState(state);
  }
  
  let currentUrl = search.full_url;
  let pageCount = 0;
  const maxPages = 100; // Safety limit
  
  console.log(`Starting crawl for ${search.name} at ${currentUrl}`);
  
  while (currentUrl && pageCount < maxPages) {
    if (!isRunning || abortController?.signal.aborted) {
      console.log('Crawl paused or aborted, breaking loop');
      break;
    }
    
    console.log(`Navigating to page ${pageCount + 1}: ${currentUrl}`);
    
    // Navigate to page
    const tab = await navigateToUrl(currentUrl);
    if (!tab.id) {
      console.error('Failed to get tab ID after navigation');
      break;
    }
    
    // Wait for page load with human-like delay
    if (config?.human_like_enabled) {
      const delay = getRandomDelay(config.min_page_delay, config.max_page_delay);
      console.log(`Waiting ${delay}ms for page load...`);
      await sleep(delay);
    }
    
    // Wait a bit more for content script to be ready
    await sleep(1000);
    
    // Extract listings
    let pageData;
    try {
      pageData = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_LISTINGS' });
      console.log(`Extracted ${pageData?.listings?.length || 0} listings from page`);
    } catch (error) {
      console.error('Failed to extract listings:', error);
      // Try once more after a delay
      await sleep(2000);
      try {
        pageData = await chrome.tabs.sendMessage(tab.id, { action: 'EXTRACT_LISTINGS' });
        console.log(`Retry: Extracted ${pageData?.listings?.length || 0} listings from page`);
      } catch (retryError) {
        console.error('Retry failed, moving to next search:', retryError);
        break;
      }
    }
    
    if (pageData?.listings && pageData.listings.length > 0) {
      // Submit batch
      await submitBatch(search, pageData.listings, pageCount + 1);
      
      // Update stats
      state = await storage.getCrawlState();
      if (state) {
        state.progress.total_properties += pageData.listings.length;
        state.progress.total_pages++;
        await storage.saveCrawlState(state);
      }
    } else {
      console.log('No listings found on this page');
    }
    
    // Check for next page
    if (pageData?.pagination?.has_next_page && pageData.pagination.next_page_url) {
      currentUrl = pageData.pagination.next_page_url;
      pageCount++;
      
      // Update current page in state
      state = await storage.getCrawlState();
      if (state) {
        state.current_page = pageCount + 1;
        await storage.saveCrawlState(state);
      }
      
      // Navigation delay
      if (config?.human_like_enabled) {
        const delay = getRandomDelay(config.min_navigation_delay, config.max_navigation_delay);
        console.log(`Waiting ${delay}ms before navigating to next page...`);
        await sleep(delay);
      }
    } else {
      console.log('No more pages for this search');
      break;
    }
  }
  
  console.log(`Finished crawling ${search.name}, processed ${pageCount} pages`);
  
  // Detect missing properties
  // TODO: Implement missing property detection
}

/**
 * Navigate to URL in a new or existing tab
 */
async function navigateToUrl(url: string): Promise<chrome.tabs.Tab> {
  // Ensure URL is absolute and valid
  let safeUrl = url;
  if (!url.startsWith('http')) {
    // If it's a relative URL, prepend the base
    if (url.startsWith('/')) {
      safeUrl = `https://www.idealista.com${url}`;
    } else {
      safeUrl = `https://www.idealista.com/${url}`;
    }
    console.warn(`URL was not absolute, converted: ${url} -> ${safeUrl}`);
  }
  
  // Validate URL
  try {
    new URL(safeUrl);
  } catch (e) {
    throw new Error(`Invalid URL: ${safeUrl}`);
  }
  
  console.log(`Navigating to: ${safeUrl}`);
  
  // Find existing idealista tab or create new one
  const tabs = await chrome.tabs.query({ url: 'https://www.idealista.com/*' });
  
  if (tabs.length > 0 && tabs[0].id) {
    await chrome.tabs.update(tabs[0].id, { url: safeUrl, active: true });
    return tabs[0];
  } else {
    const tab = await chrome.tabs.create({ url: safeUrl, active: true });
    return tab;
  }
}

/**
 * Submit a batch of properties to the API
 */
async function submitBatch(
  search: SavedSearch,
  listings: Property[],
  page: number
): Promise<void> {
  if (!currentSessionId) return;
  
  try {
    await api.ingestBatch({
      session_id: currentSessionId,
      search_id: search.id,
      external_search_id: search.external_id,
      page,
      properties: listings,
      metadata: {
        crawled_at: new Date().toISOString(),
        extension_version: '1.0.0',
        human_like_used: true,
      },
    });
  } catch (error) {
    console.error('Failed to submit batch:', error);
    // Store for retry
    await storage.addFailedBatch({ search, listings, page });
  }
}

/**
 * Get random delay between min and max
 */
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
