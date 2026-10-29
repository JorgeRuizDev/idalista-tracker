import type {
  IntervalAudit,
  MarketTrends,
  NormalizedZone,
  Property,
  PropertyListResponse,
  PropertyQueryParams,
  PropertySnapshotResponse,
} from '../types/property';

export type { PropertyQueryParams };

const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorMessage = typeof errorJson.detail === 'string'
          ? errorJson.detail
          : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Ignore JSON parse failure on error response
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  /**
   * Fetch paginated properties list with filters.
   */
  async getProperties(params: PropertyQueryParams = {}): Promise<PropertyListResponse> {
    const query = new URLSearchParams();
    if (params.movement_type && params.movement_type !== 'all') {
      query.append('movement_type', params.movement_type);
    }
    if (params.status && params.status !== 'all') {
      query.append('status', params.status);
    }
    if (params.zone && params.zone !== 'all') {
      query.append('zone', params.zone);
    }
    if (params.min_price != null && params.min_price > 0) {
      query.append('min_price', params.min_price.toString());
    }
    if (params.max_price != null && params.max_price > 0) {
      query.append('max_price', params.max_price.toString());
    }
    if (params.date_from) {
      query.append('date_from', params.date_from);
    }
    if (params.date_to) {
      query.append('date_to', params.date_to);
    }
    if (params.has_price_drop) {
      query.append('has_price_drop', 'true');
    }
    if (params.detail_status) {
      query.append('detail_status', params.detail_status);
    }
    if (params.search) {
      query.append('search', params.search);
    }
    if (params.sort_by) {
      query.append('sort_by', params.sort_by);
    }
    if (params.limit != null) {
      query.append('limit', params.limit.toString());
    }
    if (params.offset != null) {
      query.append('offset', params.offset.toString());
    }

    const qs = query.toString();
    return request<PropertyListResponse>(`/properties${qs ? `?${qs}` : ''}`);
  },

  /**
   * Fetch full property detail with price history.
   */
  async getPropertyDetail(idealistaId: string): Promise<Property> {
    const data = await request<any>(`/properties/${encodeURIComponent(idealistaId)}`);
    const orig = data.original_price ?? 0;
    const curr = data.current_price ?? 0;
    const hasDiscount = orig > curr && orig > 0;
    const discAmount = hasDiscount ? orig - curr : (data.discount_amount ?? 0);
    const discPct = hasDiscount
      ? Math.round(((orig - curr) / orig) * 1000) / 10
      : (data.discount_pct ?? data.price_drop_percentage ?? 0);
    const pricePerM2 = data.price_per_m2 ?? (data.size_m2 && curr ? Math.round(curr / data.size_m2) : null);

    return {
      ...data,
      zone: data.zone || data.location || 'Burgos Centro / Otras Zonas',
      address: data.address || data.location || data.title,
      discount_amount: discAmount,
      discount_pct: discPct,
      price_per_m2: pricePerM2,
      photos: data.photos && data.photos.length > 0 ? data.photos : (data.image_url ? [data.image_url] : []),
      price_history_count: data.price_history_count ?? data.price_history?.length ?? 0,
    };
  },

  /**
   * Fetch full property detail snapshot including photos and features.
   */
  async getPropertySnapshot(propertyId: number | string): Promise<PropertySnapshotResponse> {
    return request<PropertySnapshotResponse>(`/properties/${encodeURIComponent(propertyId)}/snapshot`);
  },

  /**
   * Fetch canonical 23-zone census statistics.
   */
  async getZones(): Promise<NormalizedZone[]> {
    return request<NormalizedZone[]>('/zones');
  },

  /**
   * Fetch time interval market audit for a date range.
   */
  async getIntervalAudit(startDate: string, endDate: string): Promise<IntervalAudit> {
    const query = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    return request<IntervalAudit>(`/analytics/interval?${query.toString()}`);
  },

  /**
   * Fetch monthly market trends time series.
   */
  async getMarketTrends(): Promise<MarketTrends> {
    return request<MarketTrends>('/analytics/trends');
  },
};
