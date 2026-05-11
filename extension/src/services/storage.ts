// Chrome Storage API wrapper
import type { CrawlConfig, CrawlState, SavedSearch } from '../types';

const STORAGE_KEYS = {
  CONFIG: 'config',
  CRAWL_STATE: 'crawlState',
  FAILED_BATCHES: 'failedBatches',
  LAST_CRAWL_STATS: 'lastCrawlStats',
  SAVED_SEARCHES: 'savedSearches',
} as const;

/**
 * Get configuration from storage
 */
export async function getConfig(): Promise<CrawlConfig | null> {
  const { config } = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
  return config || null;
}

/**
 * Save configuration to storage
 */
export async function saveConfig(config: CrawlConfig): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: config });
}

/**
 * Get crawl state from storage
 */
export async function getCrawlState(): Promise<CrawlState | null> {
  const { crawlState } = await chrome.storage.local.get(STORAGE_KEYS.CRAWL_STATE);
  return crawlState || null;
}

/**
 * Save crawl state to storage
 */
export async function saveCrawlState(state: CrawlState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.CRAWL_STATE]: state });
}

/**
 * Update crawl state partially
 */
export async function updateCrawlState(updates: Partial<CrawlState>): Promise<void> {
  const currentState = await getCrawlState();
  const newState = { ...currentState, ...updates };
  await saveCrawlState(newState as CrawlState);
}

/**
 * Clear crawl state
 */
export async function clearCrawlState(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.CRAWL_STATE);
}

/**
 * Add a failed batch for retry
 */
export async function addFailedBatch(batchData: unknown): Promise<void> {
  const { failedBatches = [] } = await chrome.storage.local.get(STORAGE_KEYS.FAILED_BATCHES);
  failedBatches.push({
    data: batchData,
    timestamp: Date.now(),
    retryCount: 0,
  });
  await chrome.storage.local.set({ [STORAGE_KEYS.FAILED_BATCHES]: failedBatches });
}

/**
 * Get all failed batches
 */
export async function getFailedBatches(): Promise<Array<{ data: unknown; timestamp: number; retryCount: number }>> {
  const { failedBatches = [] } = await chrome.storage.local.get(STORAGE_KEYS.FAILED_BATCHES);
  return failedBatches;
}

/**
 * Remove a failed batch
 */
export async function removeFailedBatch(index: number): Promise<void> {
  const { failedBatches = [] } = await chrome.storage.local.get(STORAGE_KEYS.FAILED_BATCHES);
  failedBatches.splice(index, 1);
  await chrome.storage.local.set({ [STORAGE_KEYS.FAILED_BATCHES]: failedBatches });
}

/**
 * Clear all failed batches
 */
export async function clearFailedBatches(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.FAILED_BATCHES);
}

/**
 * Save last crawl statistics
 */
export async function saveLastCrawlStats(stats: {
  sessionId: number;
  totalProperties: number;
  pagesProcessed: number;
  searchesCrawled: number;
  completedAt: number;
}): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_CRAWL_STATS]: stats });
}

/**
 * Get last crawl statistics
 */
export async function getLastCrawlStats(): Promise<{
  sessionId: number;
  totalProperties: number;
  pagesProcessed: number;
  searchesCrawled: number;
  completedAt: number;
} | null> {
  const { lastCrawlStats } = await chrome.storage.local.get(STORAGE_KEYS.LAST_CRAWL_STATS);
  return lastCrawlStats || null;
}

/**
 * Clear all storage (use with caution!)
 */
export async function clearAllStorage(): Promise<void> {
  await chrome.storage.local.clear();
}

/**
 * Save saved searches to storage
 */
export async function saveSavedSearches(searches: SavedSearch[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SAVED_SEARCHES]: searches });
}

/**
 * Get saved searches from storage
 */
export async function getSavedSearches(): Promise<SavedSearch[]> {
  const { savedSearches } = await chrome.storage.local.get(STORAGE_KEYS.SAVED_SEARCHES);
  return savedSearches || [];
}

/**
 * Update a single saved search
 */
export async function updateSavedSearch(searchId: number, updates: Partial<SavedSearch>): Promise<void> {
  const searches = await getSavedSearches();
  const index = searches.findIndex(s => s.id === searchId);
  if (index !== -1) {
    searches[index] = { ...searches[index], ...updates };
    await saveSavedSearches(searches);
  }
}

/**
 * Clear saved searches
 */
export async function clearSavedSearches(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.SAVED_SEARCHES);
}
