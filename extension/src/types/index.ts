/** TypeScript type definitions for the Chrome Extension Property Crawler */

/** Property data extracted from Idealista listings */
export interface Property {
  external_id: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  url: string;
  square_meters?: number;
  bedrooms?: number;
  floor_info?: string;
  description?: string;
  photos?: string[];
}

/** Saved search from Idealista */
export interface SavedSearch {
  id: number;
  external_id: string;
  name: string;
  url: string;
  full_url: string;
  result_count?: number;
  description?: string;
  last_crawled_at?: string;
  crawl_enabled: boolean;
}

/** Crawl session state */
export interface CrawlState {
  is_running: boolean;
  session_id?: number;
  current_search?: {
    id: number;
    name: string;
  };
  current_page?: number;
  progress: {
    total_searches: number;
    completed_searches: number;
    total_pages: number;
    total_properties: number;
  };
}

/** Crawl configuration */
export interface CrawlConfig {
  server_url: string;
  human_like_enabled: boolean;
  min_page_delay: number;
  max_page_delay: number;
  min_navigation_delay: number;
  max_navigation_delay: number;
}

/** Batch ingestion request payload */
export interface BatchIngestionRequest {
  session_id: number;
  search_id: number;
  external_search_id: string;
  page: number;
  properties: Property[];
  metadata: {
    crawled_at: string;
    extension_version: string;
    human_like_used: boolean;
  };
}

/** Batch ingestion response */
export interface BatchIngestionResponse {
  success: boolean;
  summary: {
    total_received: number;
    created: number;
    updated: number;
    seen: number;
    invalid: number;
  };
  results: PropertyResult[];
  errors: PropertyError[];
  meta: {
    processed_at: string;
    processing_time_ms: number;
    api_version: string;
  };
}

/** Individual property result from batch processing */
export interface PropertyResult {
  external_id: string;
  action: 'created' | 'updated' | 'seen' | 'error';
  property_id?: number;
  changes?: PropertyChangeInfo[];
}

/** Property change information */
export interface PropertyChangeInfo {
  attribute: string;
  old_value: unknown;
  new_value: unknown;
}

/** Property error information */
export interface PropertyError {
  external_id?: string;
  index: number;
  code: string;
  message: string;
  field?: string;
}

/** Crawl session data */
export interface CrawlSession {
  id: number;
  status: 'running' | 'completed' | 'paused' | 'failed';
  started_at: string;
  ended_at?: string;
  total_properties: number;
  pages_processed: number;
  searches_crawled: number;
}

/** Crawl session creation request */
export interface CrawlSessionCreate {
  server_url: string;
  human_like_enabled: boolean;
  extension_version: string;
  selected_search_ids: number[];
}

/** Saved search sync request */
export interface SavedSearchSyncRequest {
  searches: SavedSearch[];
}

/** Message types for extension communication */
export type MessageType =
  | 'START_CRAWL'
  | 'GET_STATUS'
  | 'PAUSE_CRAWL'
  | 'RESUME_CRAWL'
  | 'STOP_CRAWL'
  | 'GET_SEARCHES'
  | 'SAVE_SEARCHES'
  | 'SYNC_SEARCHES'
  | 'SAVE_CONFIG'
  | 'GET_CONFIG';

/** Base message interface */
export interface BaseMessage {
  type: MessageType;
  payload?: unknown;
}

/** Start crawl message */
export interface StartCrawlMessage extends BaseMessage {
  type: 'START_CRAWL';
  payload: {
    search_ids: number[];
    server_url: string;
  };
}

/** Get status message */
export interface GetStatusMessage extends BaseMessage {
  type: 'GET_STATUS';
}

/** Pause crawl message */
export interface PauseCrawlMessage extends BaseMessage {
  type: 'PAUSE_CRAWL';
}

/** Resume crawl message */
export interface ResumeCrawlMessage extends BaseMessage {
  type: 'RESUME_CRAWL';
}

/** Get searches message */
export interface GetSearchesMessage extends BaseMessage {
  type: 'GET_SEARCHES';
}

/** Save searches message */
export interface SaveSearchesMessage extends BaseMessage {
  type: 'SAVE_SEARCHES';
  payload: {
    searches: ExtractedSavedSearch[];
  };
}

/** Sync searches message */
export interface SyncSearchesMessage extends BaseMessage {
  type: 'SYNC_SEARCHES';
}

/** Save config message */
export interface SaveConfigMessage extends BaseMessage {
  type: 'SAVE_CONFIG';
  payload: CrawlConfig;
}

/** Get config message */
export interface GetConfigMessage extends BaseMessage {
  type: 'GET_CONFIG';
}

/** Response types */
export interface StartCrawlResponse {
  success: boolean;
  session_id?: number;
  error?: string;
}

export interface GetStatusResponse {
  is_running: boolean;
  session_id?: number;
  current_search?: {
    id: number;
    name: string;
  };
  current_page?: number;
  progress: CrawlState['progress'];
}

export interface PauseCrawlResponse {
  success: boolean;
  can_resume: boolean;
}

export interface ResumeCrawlResponse {
  success: boolean;
  session_id?: number;
  error?: string;
}

export interface GetSearchesResponse {
  searches: SavedSearch[];
}

export interface SaveSearchesResponse {
  success: boolean;
  searches?: SavedSearch[];
  error?: string;
}

export interface SyncSearchesResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SaveConfigResponse {
  success: boolean;
  error?: string;
}

export interface GetConfigResponse {
  config: CrawlConfig;
}

/** Extracted saved search from DOM */
export interface ExtractedSavedSearch {
  external_id: string;
  name: string;
  url: string;
  full_url: string;
  result_count?: number;
  description?: string;
}

/** Extracted property from DOM */
export interface ExtractedProperty {
  external_id: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  url: string;
  square_meters?: number;
  bedrooms?: number;
  floor_info?: string;
  description?: string;
  photos: string[];
}

/** Pagination information */
export interface PaginationInfo {
  current_page: number;
  has_next_page: boolean;
  next_page_url?: string;
  total_pages?: number;
}
