/**
 * Property type definitions
 * Based on data-model.md specifications
 */

export type PropertyStatus = 'active' | 'missing' | 'sold';

export interface Property {
  id: number;
  idealista_id: string;
  title: string;
  property_type: string | null;
  location: string;
  original_price: number;
  current_price: number;
  price_drop_percentage: number | null;
  price_history_count?: number;
  size_m2: number | null;
  bedrooms: number | null;
  floor: string | null;
  has_elevator: boolean | null;
  property_url: string;
  image_url: string | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  missing_since: string | null;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  status: PropertyStatus;
}

export interface PriceBucket {
  range: string;      // Display label for the price range
  min: number;        // Lower bound of price range (EUR)
  max: number;        // Upper bound of price range (EUR)
  count: number;      // Number of properties in this bucket
}

export interface PriceDistribution {
  buckets: PriceBucket[];
  total_properties: number;
  min_price: number;
  max_price: number;
  avg_price: number;
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_properties: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PaginatedProperties {
  properties: Property[];
  pagination: PaginationInfo;
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: 'CONNECTION_FAILED' | 'QUERY_FAILED' | 'NOT_FOUND'
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// ============================================================================
// Filter and Sort Types (Feature 005)
// ============================================================================

/**
 * Filter state for property filtering
 */
export interface FilterState {
  search?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string[];
  bedroomsMin?: number;
  bedroomsMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  hasPriceChange?: boolean;
  includeActive?: boolean;
  includeInactive?: boolean;
}

/**
 * Sort options for property list
 */
export interface SortOption {
  field: 'price' | 'createdAt' | 'priceChange' | 'size' | 'bedrooms' | 'pricePerSqM';
  direction: 'asc' | 'desc';
}

/**
 * Price change information for display
 */
export interface PriceChangeInfo {
  amount: number;
  percentage: number;
  direction: 'up' | 'down';
  changedAt: Date;
}

/**
 * Price bucket for histogram (insights)
 */
export interface InsightPriceBucket {
  range: string;
  min: number;
  max: number;
  count: number;
}

/**
 * Insight statistics for filtered property set
 */
export interface InsightStats {
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgPriceChange: number | null;
  avgDaysToSell: number | null;
  priceDistribution: InsightPriceBucket[];
  pricePerSqmDistribution: InsightPriceBucket[];
  sizeDistribution: InsightPriceBucket[];
  typeDistribution: TypeDistribution[];
  avgPricePerSqm: number;
  medianPrice: number;
  propertyTypeCount: Record<string, number>;
  statusDistribution: StatusDistribution;
}

export interface TypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface StatusDistribution {
  active: number;
  missing: number;
  sold: number;
}

export interface PriceHistoryEntry {
  id: number;
  old_price: number | null;
  new_price: number;
  change_type: string;
  change_date: string;
}

export interface PropertyWithHistory extends Property {
  price_history: PriceHistoryEntry[];
}

export interface PropertyDetailResponse {
  id: number;
  idealista_id: string;
  title: string;
  property_type: string | null;
  location: string;
  original_price: number;
  current_price: number;
  price_drop_percentage: number | null;
  price_history_count: number;
  size_m2: number | null;
  bedrooms: number | null;
  floor: string | null;
  has_elevator: boolean | null;
  property_url: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  status: string;
  price_history: PriceHistoryEntry[];
}

export interface CrawlHistoryEntry {
  date: string;
  new_properties: number;
  new_inactives: number;
  price_drops: number;
  price_increases: number;
  avg_drop_amount: number | null;
  avg_increase_amount: number | null;
}

export interface CrawlHistoryResponse {
  entries: CrawlHistoryEntry[];
}

export interface CrawlHistoryPropertySummary {
  id: number;
  idealista_id: string;
  title: string;
  location: string;
  current_price: number;
  status: string;
  property_url: string;
}

export interface CrawlHistoryPriceDropDetail extends CrawlHistoryPropertySummary {
  old_price: number | null;
  new_price: number | null;
  drop_amount: number | null;
}

export interface CrawlHistoryPriceIncreaseDetail extends CrawlHistoryPropertySummary {
  old_price: number | null;
  new_price: number | null;
  increase_amount: number | null;
}

export interface CrawlHistoryDetailResponse {
  date: string;
  new_properties: CrawlHistoryPropertySummary[];
  price_drops: CrawlHistoryPriceDropDetail[];
  price_increases: CrawlHistoryPriceIncreaseDetail[];
  new_missing: CrawlHistoryPropertySummary[];
  new_sold: CrawlHistoryPropertySummary[];
}
