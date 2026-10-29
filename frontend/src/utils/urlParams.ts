import type { ActiveTab } from '../components/layout/Header';
import type {
  FilterState,
  IntervalMetricType,
  PropertySortBy,
  SoldStatusFilter,
} from '../types/property';

export const INITIAL_FILTERS: FilterState = {
  soldStatus: 'all',
  zone: 'all',
  priceMin: undefined,
  priceMax: undefined,
  dateStart: undefined,
  dateEnd: undefined,
  onlyDeals: false,
  onlyCompletedDetails: false,
  searchQuery: '',
  sortBy: 'discount_desc',
};

const VALID_SORT_OPTIONS: Set<PropertySortBy> = new Set([
  'discount_desc',
  'days_desc',
  'price_asc',
  'price_desc',
  'm2_asc',
  'date_desc',
]);

const VALID_METRICS: Set<IntervalMetricType> = new Set([
  'inclusions',
  'sales',
  'price_drops',
  'price_increases',
  'all',
]);

export interface UrlIntervalState {
  preset?: string;
  startDate?: string;
  endDate?: string;
  metric?: IntervalMetricType | null;
  zone?: string | null;
  offset?: number;
}

export interface ParsedUrlState {
  tab: ActiveTab;
  filter: FilterState;
  offset: number;
  propertyId: string | null;
  intervalState: UrlIntervalState;
}

export interface SerializeUrlStateParams {
  tab: ActiveTab;
  filter: FilterState;
  offset: number;
  limit?: number;
  propertyId: string | null;
  intervalPreset?: string;
  intervalStart?: string;
  intervalEnd?: string;
  intervalMetric?: IntervalMetricType | null;
  intervalZone?: string | null;
  intervalOffset?: number;
  intervalLimit?: number;
}

/**
 * Parses URL query parameters into strongly-typed application state.
 */
export function parseUrlState(search = typeof window !== 'undefined' ? window.location.search : ''): ParsedUrlState {
  const params = new URLSearchParams(search);

  // 1. Tab
  const rawTab = params.get('tab');
  const tab: ActiveTab = rawTab === 'intervals' || rawTab === 'trends' ? rawTab : 'explorer';

  // 2. Property ID (detail modal)
  const propertyId =
    params.get('property') ||
    params.get('property_id') ||
    params.get('id') ||
    params.get('detail') ||
    null;

  // 3. Explorer filters
  const rawStatus = (params.get('status') || params.get('soldStatus') || params.get('sold_status') || 'all') as SoldStatusFilter;
  const soldStatus: SoldStatusFilter =
    rawStatus === 'only_active' || rawStatus === 'only_sold' ? rawStatus : 'all';

  const rawZone = params.get('zone');
  const zone = rawZone && rawZone.trim() && rawZone !== 'all' ? rawZone.trim() : 'all';

  const rawMinPrice = params.get('min_price') || params.get('priceMin') || params.get('minPrice');
  const priceMin = rawMinPrice && !isNaN(Number(rawMinPrice)) && Number(rawMinPrice) > 0
    ? Number(rawMinPrice)
    : undefined;

  const rawMaxPrice = params.get('max_price') || params.get('priceMax') || params.get('maxPrice');
  const priceMax = rawMaxPrice && !isNaN(Number(rawMaxPrice)) && Number(rawMaxPrice) > 0
    ? Number(rawMaxPrice)
    : undefined;

  const rawDateStart = params.get('date_from') || params.get('dateStart') || params.get('start_date');
  const dateStart = rawDateStart && /^\d{4}-\d{2}-\d{2}$/.test(rawDateStart) ? rawDateStart : undefined;

  const rawDateEnd = params.get('date_to') || params.get('dateEnd') || params.get('end_date');
  const dateEnd = rawDateEnd && /^\d{4}-\d{2}-\d{2}$/.test(rawDateEnd) ? rawDateEnd : undefined;

  const rawDeals = params.get('deals') || params.get('onlyDeals') || params.get('only_deals');
  const onlyDeals = rawDeals === 'true' || rawDeals === '1';

  const rawCompleted = params.get('completed') || params.get('onlyCompletedDetails') || params.get('detail_status');
  const onlyCompletedDetails = rawCompleted === 'true' || rawCompleted === '1' || rawCompleted === 'completed';

  const rawSearch = params.get('search') || params.get('q') || params.get('searchQuery');
  const searchQuery = rawSearch ? rawSearch.trim() : '';

  const rawSort = (params.get('sort') || params.get('sort_by') || params.get('sortBy')) as PropertySortBy;
  const sortBy: PropertySortBy = VALID_SORT_OPTIONS.has(rawSort) ? rawSort : 'discount_desc';

  // 4. Explorer Pagination
  const rawPage = params.get('page');
  const rawOffset = params.get('offset');
  let offset = 0;
  if (rawPage && !isNaN(Number(rawPage)) && Number(rawPage) > 1) {
    offset = (Number(rawPage) - 1) * 24;
  } else if (rawOffset && !isNaN(Number(rawOffset)) && Number(rawOffset) > 0) {
    offset = Number(rawOffset);
  }

  // 5. Interval Audit State
  const preset = params.get('preset') || undefined;
  const startDate = params.get('interval_start') || params.get('intervalStart') || undefined;
  const endDate = params.get('interval_end') || params.get('intervalEnd') || undefined;

  const rawMetric = params.get('interval_metric') || params.get('intervalMetric');
  const metric = rawMetric && VALID_METRICS.has(rawMetric as IntervalMetricType)
    ? (rawMetric as IntervalMetricType)
    : null;

  const rawIntervalZone = params.get('interval_zone') || params.get('intervalZone');
  const intervalZone = rawIntervalZone && rawIntervalZone.trim() ? rawIntervalZone.trim() : null;

  const rawIntervalPage = params.get('interval_page');
  const rawIntervalOffset = params.get('interval_offset');
  let intervalOffset = 0;
  if (rawIntervalPage && !isNaN(Number(rawIntervalPage)) && Number(rawIntervalPage) > 1) {
    intervalOffset = (Number(rawIntervalPage) - 1) * 24;
  } else if (rawIntervalOffset && !isNaN(Number(rawIntervalOffset)) && Number(rawIntervalOffset) > 0) {
    intervalOffset = Number(rawIntervalOffset);
  }

  return {
    tab,
    propertyId: propertyId ? propertyId.trim() : null,
    filter: {
      soldStatus,
      zone,
      priceMin,
      priceMax,
      dateStart,
      dateEnd,
      onlyDeals,
      onlyCompletedDetails,
      searchQuery,
      sortBy,
    },
    offset,
    intervalState: {
      preset,
      startDate,
      endDate,
      metric,
      zone: intervalZone,
      offset: intervalOffset,
    },
  };
}

/**
 * Builds a clean query string omitting default values.
 */
export function buildQueryString(params: SerializeUrlStateParams): string {
  const query = new URLSearchParams();

  // Detail Modal property ID takes top priority
  if (params.propertyId) {
    query.set('property', params.propertyId);
  }

  // Active Tab (omitted when 'explorer')
  if (params.tab && params.tab !== 'explorer') {
    query.set('tab', params.tab);
  }

  // Explorer Filters
  if (params.filter.soldStatus && params.filter.soldStatus !== 'all') {
    query.set('status', params.filter.soldStatus);
  }

  if (params.filter.zone && params.filter.zone !== 'all') {
    query.set('zone', params.filter.zone);
  }

  if (params.filter.priceMin != null && params.filter.priceMin > 0) {
    query.set('min_price', String(params.filter.priceMin));
  }

  if (params.filter.priceMax != null && params.filter.priceMax > 0) {
    query.set('max_price', String(params.filter.priceMax));
  }

  if (params.filter.dateStart) {
    query.set('date_from', params.filter.dateStart);
  }

  if (params.filter.dateEnd) {
    query.set('date_to', params.filter.dateEnd);
  }

  if (params.filter.onlyDeals) {
    query.set('deals', 'true');
  }

  if (params.filter.onlyCompletedDetails) {
    query.set('completed', 'true');
  }

  if (params.filter.searchQuery && params.filter.searchQuery.trim()) {
    query.set('search', params.filter.searchQuery.trim());
  }

  if (params.filter.sortBy && params.filter.sortBy !== 'discount_desc') {
    query.set('sort', params.filter.sortBy);
  }

  // Page offset
  const limit = params.limit || 24;
  if (params.offset > 0) {
    const page = Math.floor(params.offset / limit) + 1;
    if (page > 1) {
      query.set('page', String(page));
    }
  }

  // Intervals tab drilldown and presets
  if (params.tab === 'intervals') {
    if (params.intervalPreset && params.intervalPreset !== '2026-07') {
      query.set('preset', params.intervalPreset);
    }
    if (params.intervalStart && (params.intervalPreset === 'custom' || params.intervalStart !== '2026-07-01')) {
      query.set('interval_start', params.intervalStart);
    }
    if (params.intervalEnd && (params.intervalPreset === 'custom' || params.intervalEnd !== '2026-07-31')) {
      query.set('interval_end', params.intervalEnd);
    }
    if (params.intervalMetric) {
      query.set('interval_metric', params.intervalMetric);
    }
    if (params.intervalZone) {
      query.set('interval_zone', params.intervalZone);
    }
    const intervalLimit = params.intervalLimit || 24;
    if (params.intervalOffset && params.intervalOffset > 0) {
      const page = Math.floor(params.intervalOffset / intervalLimit) + 1;
      if (page > 1) {
        query.set('interval_page', String(page));
      }
    }
  }

  return query.toString();
}

/**
 * Builds full URL path + query string.
 */
export function buildUrl(params: SerializeUrlStateParams, pathname?: string): string {
  const base = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const qs = buildQueryString(params);
  return qs ? `${base}?${qs}` : base;
}
