// API communication service
import type { 
  BatchIngestionRequest, 
  BatchIngestionResponse, 
  CrawlSession,
  SavedSearch,
  CrawlSessionCreate,
  SavedSearchSyncRequest,
} from '../types';

const API_VERSION = 'v1';

/**
 * Get the API base URL from storage
 */
async function getApiBaseUrl(): Promise<string> {
  const { config } = await chrome.storage.local.get('config');
  const baseUrl = config?.server_url || 'http://localhost:8000';
  return `${baseUrl}/api/${API_VERSION}`;
}

/**
 * Make an API request with retry logic
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  maxRetries: number = 5
): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
        console.log(`Rate limited, retrying after ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }
      
      return await response.json() as T;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Request failed after max retries');
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a new crawl session
 */
export async function createCrawlSession(
  data: CrawlSessionCreate
): Promise<CrawlSession> {
  return apiRequest<CrawlSession>('/crawl/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get crawl session by ID
 */
export async function getCrawlSession(sessionId: number): Promise<CrawlSession> {
  return apiRequest<CrawlSession>(`/crawl/sessions/${sessionId}`);
}

/**
 * Complete a crawl session
 */
export async function completeCrawlSession(
  sessionId: number,
  data: { total_properties: number; pages_processed: number; searches_crawled: number }
): Promise<CrawlSession> {
  return apiRequest<CrawlSession>(`/crawl/sessions/${sessionId}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Submit a batch of properties for ingestion
 */
export async function ingestBatch(
  data: BatchIngestionRequest
): Promise<BatchIngestionResponse> {
  return apiRequest<BatchIngestionResponse>('/properties/batch', {
    method: 'POST',
    body: JSON.stringify(data),
  }, 3); // Fewer retries for batch requests
}

/**
 * Get all saved searches
 */
export async function getSavedSearches(): Promise<SavedSearch[]> {
  const response = await apiRequest<{ searches: SavedSearch[] }>('/searches');
  return response.searches;
}

/**
 * Sync saved searches from extension
 */
export async function syncSavedSearches(
  data: SavedSearchSyncRequest
): Promise<{ synced: number; created: number; updated: number }> {
  return apiRequest('/searches/sync', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Detect missing properties for a search
 */
export async function detectMissingProperties(
  sessionId: number,
  searchId: number,
  currentPropertyExternalIds: string[]
): Promise<{ missing_detected: number; marked_as_missing: number }> {
  return apiRequest(`/crawl/sessions/${sessionId}/searches/${searchId}/detect-missing`, {
    method: 'POST',
    body: JSON.stringify({ current_property_external_ids: currentPropertyExternalIds }),
  });
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
}
