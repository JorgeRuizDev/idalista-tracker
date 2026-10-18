/**
 * Domain types and interfaces for property analytics and market exploration.
 */

export type SoldStatusFilter = 'all' | 'only_active' | 'only_sold';

export type PropertySortBy =
  | 'discount_desc'
  | 'days_desc'
  | 'price_asc'
  | 'price_desc'
  | 'm2_asc'
  | 'date_desc';

export interface PriceHistoryEntry {
  id: number;
  property_id?: number;
  old_price?: number | null;
  new_price: number;
  change_date: string;
  change_type: 'initial' | 'update' | 'drop' | 'increase';
  diff_amount?: number | null;
  diff_pct?: number | null;
}

export interface Property {
  id: number;
  idealista_id: string;
  title: string;
  address?: string | null;
  zone: string;
  property_type?: string | null;
  original_price: number;
  current_price: number;
  discount_amount: number;
  discount_pct: number;
  size_m2?: number | null;
  price_per_m2?: number | null;
  bedrooms?: number | null;
  floor?: string | null;
  has_elevator?: boolean | null;
  status: 'active' | 'sold' | 'missing';
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  sold_at?: string | null;
  days_on_market?: number | null;
  photos: string[];
  property_url: string;
  price_history_count: number;
  price_history?: PriceHistoryEntry[];
}

export interface PropertyListResponse {
  items: Property[];
  total: number;
  limit: number;
  offset: number;
}

export interface NormalizedZone {
  zone: string;
  total: number;
  active: number;
  sold: number;
  missing: number;
  avg_price: number;
  avg_m2: number;
  avg_days_to_sell: number;
  avg_discount_pct: number;
}

export interface IntervalZoneMetric {
  zone: string;
  inclusions: number;
  sales: number;
  avg_days_to_sell: number;
  avg_discount_pct: number;
  avg_sale_price: number;
}

export interface IntervalAudit {
  start_date: string;
  end_date: string;
  interval_label: string;
  inclusions: number;
  sales: number;
  drops_count: number;
  avg_drop_pct: number;
  total_drop_amount: number;
  increases_count: number;
  avg_inc_pct: number;
  avg_days_to_sell: number;
  zone_breakdown: IntervalZoneMetric[];
}

export interface MonthlyTrend {
  month: string;
  label: string;
  avg_price: number;
  avg_m2: number;
  properties_active: number;
  properties_sold: number;
  price_drops: number;
  avg_drop_pct: number;
}

export interface MarketTrends {
  monthly: MonthlyTrend[];
}

export interface FilterState {
  soldStatus: SoldStatusFilter;
  zone: string; // 'all' or canonical zone name
  priceMin?: number;
  priceMax?: number;
  dateStart?: string; // YYYY-MM-DD
  dateEnd?: string;   // YYYY-MM-DD
  onlyDeals: boolean; // only properties with price reduction
  searchQuery: string;
  sortBy: PropertySortBy;
}
