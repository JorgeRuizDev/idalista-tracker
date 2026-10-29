import { describe, expect, it } from 'vitest';
import {
  INITIAL_FILTERS,
  buildQueryString,
  buildUrl,
  parseUrlState,
} from '../urlParams';

describe('urlParams utilities', () => {
  it('parses empty search query to default initial state', () => {
    const state = parseUrlState('');
    expect(state.tab).toBe('explorer');
    expect(state.propertyId).toBeNull();
    expect(state.filter).toEqual(INITIAL_FILTERS);
    expect(state.offset).toBe(0);
    expect(state.intervalState.metric).toBeNull();
  });

  it('parses property detail param and aliases', () => {
    expect(parseUrlState('?property=111427424').propertyId).toBe('111427424');
    expect(parseUrlState('?property_id=222427425').propertyId).toBe('222427425');
    expect(parseUrlState('?id=333427426').propertyId).toBe('333427426');
    expect(parseUrlState('?detail=444427427').propertyId).toBe('444427427');
  });

  it('parses explorer filters correctly', () => {
    const search = '?status=only_sold&zone=Gamonal&min_price=120000&max_price=250000&date_from=2026-01-01&date_to=2026-06-30&deals=true&completed=true&search=vitoria&sort=price_asc&page=3';
    const state = parseUrlState(search);

    expect(state.filter.soldStatus).toBe('only_sold');
    expect(state.filter.zone).toBe('Gamonal');
    expect(state.filter.priceMin).toBe(120000);
    expect(state.filter.priceMax).toBe(250000);
    expect(state.filter.dateStart).toBe('2026-01-01');
    expect(state.filter.dateEnd).toBe('2026-06-30');
    expect(state.filter.onlyDeals).toBe(true);
    expect(state.filter.onlyCompletedDetails).toBe(true);
    expect(state.filter.searchQuery).toBe('vitoria');
    expect(state.filter.sortBy).toBe('price_asc');
    expect(state.offset).toBe(48); // (3 - 1) * 24
  });

  it('parses filter aliases gracefully', () => {
    const search = '?soldStatus=only_active&q=calle+mayor&priceMin=90000&priceMax=150000&dateStart=2026-02-01&dateEnd=2026-05-01&onlyDeals=1&sortBy=days_desc&offset=24';
    const state = parseUrlState(search);

    expect(state.filter.soldStatus).toBe('only_active');
    expect(state.filter.searchQuery).toBe('calle mayor');
    expect(state.filter.priceMin).toBe(90000);
    expect(state.filter.priceMax).toBe(150000);
    expect(state.filter.dateStart).toBe('2026-02-01');
    expect(state.filter.dateEnd).toBe('2026-05-01');
    expect(state.filter.onlyDeals).toBe(true);
    expect(state.filter.sortBy).toBe('days_desc');
    expect(state.offset).toBe(24);
  });

  it('parses active tabs and interval audit state', () => {
    const search = '?tab=intervals&preset=custom&interval_start=2026-05-01&interval_end=2026-05-31&interval_metric=sales&interval_zone=Centro&interval_page=2';
    const state = parseUrlState(search);

    expect(state.tab).toBe('intervals');
    expect(state.intervalState.preset).toBe('custom');
    expect(state.intervalState.startDate).toBe('2026-05-01');
    expect(state.intervalState.endDate).toBe('2026-05-31');
    expect(state.intervalState.metric).toBe('sales');
    expect(state.intervalState.zone).toBe('Centro');
    expect(state.intervalState.offset).toBe(24);
  });

  it('builds clean query string omitting defaults', () => {
    const qs = buildQueryString({
      tab: 'explorer',
      filter: INITIAL_FILTERS,
      offset: 0,
      propertyId: null,
    });
    expect(qs).toBe('');
  });

  it('builds query string with property detail and active filters', () => {
    const qs = buildQueryString({
      tab: 'explorer',
      filter: {
        ...INITIAL_FILTERS,
        soldStatus: 'only_sold',
        zone: 'Gamonal',
        priceMin: 100000,
        onlyDeals: true,
        onlyCompletedDetails: true,
        sortBy: 'price_asc',
      },
      offset: 24,
      limit: 24,
      propertyId: '111427424',
    });

    const params = new URLSearchParams(qs);
    expect(params.get('property')).toBe('111427424');
    expect(params.get('status')).toBe('only_sold');
    expect(params.get('zone')).toBe('Gamonal');
    expect(params.get('min_price')).toBe('100000');
    expect(params.get('deals')).toBe('true');
    expect(params.get('completed')).toBe('true');
    expect(params.get('sort')).toBe('price_asc');
    expect(params.get('page')).toBe('2');
    expect(params.has('tab')).toBe(false); // explorer is default
  });

  it('buildUrl produces valid path with query string', () => {
    const url = buildUrl(
      {
        tab: 'trends',
        filter: INITIAL_FILTERS,
        offset: 0,
        propertyId: null,
      },
      '/app'
    );
    expect(url).toBe('/app?tab=trends');
  });
});
