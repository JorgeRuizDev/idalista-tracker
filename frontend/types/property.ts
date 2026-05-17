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
  size_m2: number | null;
  bedrooms: number | null;
  floor: string | null;
  has_elevator: boolean | null;
  property_url: string;
  image_url: string | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
  is_active: boolean;
  status: PropertyStatus;
}

export interface PriceBucket {
  bucket_min: number;    // Lower bound of price range (EUR)
  bucket_max: number;    // Upper bound of price range (EUR)
  count: number;         // Number of properties in this bucket
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
