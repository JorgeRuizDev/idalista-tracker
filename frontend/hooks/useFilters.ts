'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { FilterState, SortOption } from '@/types/property';

const DEFAULT_SORT: SortOption = { field: 'createdAt', direction: 'desc' };

const VALID_SORT_FIELDS: SortOption['field'][] = [
  'price', 'createdAt', 'priceChange', 'size', 'bedrooms', 'pricePerSqM',
];

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: FilterState = useMemo(() => {
    const params: FilterState = {};

    const search = searchParams.get('search');
    if (search) params.search = search;

    const priceMin = searchParams.get('priceMin');
    if (priceMin) params.priceMin = parseInt(priceMin, 10);

    const priceMax = searchParams.get('priceMax');
    if (priceMax) params.priceMax = parseInt(priceMax, 10);

    const location = searchParams.get('location');
    if (location) params.location = location.split(',').filter(Boolean);

    const bedroomsMin = searchParams.get('bedroomsMin');
    if (bedroomsMin) params.bedroomsMin = parseInt(bedroomsMin, 10);

    const bedroomsMax = searchParams.get('bedroomsMax');
    if (bedroomsMax) params.bedroomsMax = parseInt(bedroomsMax, 10);

    const sizeMin = searchParams.get('sizeMin');
    if (sizeMin) params.sizeMin = parseInt(sizeMin, 10);

    const sizeMax = searchParams.get('sizeMax');
    if (sizeMax) params.sizeMax = parseInt(sizeMax, 10);

    const hasPriceChange = searchParams.get('hasPriceChange');
    if (hasPriceChange) params.hasPriceChange = hasPriceChange === 'true';

    const includeActive = searchParams.get('includeActive');
    if (includeActive) params.includeActive = includeActive === 'true';

    const includeInactive = searchParams.get('includeInactive');
    if (includeInactive) params.includeInactive = includeInactive === 'true';

    return params;
  }, [searchParams]);

  const sort: SortOption = useMemo(() => {
    const field = searchParams.get('sortField') as SortOption['field'] | null;
    const direction = searchParams.get('sortDir') as SortOption['direction'] | null;

    if (field && (VALID_SORT_FIELDS as string[]).includes(field)) {
      return {
        field,
        direction: direction === 'asc' ? 'asc' : 'desc',
      };
    }

    return DEFAULT_SORT;
  }, [searchParams]);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0;
  }, [filters]);

  const setFilters = useCallback(
    (newFilters: FilterState) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newFilters.search !== undefined && newFilters.search.trim() !== '') {
        params.set('search', newFilters.search.trim());
      } else {
        params.delete('search');
      }

      if (newFilters.priceMin !== undefined) {
        params.set('priceMin', newFilters.priceMin.toString());
      } else {
        params.delete('priceMin');
      }

      if (newFilters.priceMax !== undefined) {
        params.set('priceMax', newFilters.priceMax.toString());
      } else {
        params.delete('priceMax');
      }

      if (newFilters.location && newFilters.location.length > 0) {
        params.set('location', newFilters.location.join(','));
      } else {
        params.delete('location');
      }

      if (newFilters.bedroomsMin !== undefined) {
        params.set('bedroomsMin', newFilters.bedroomsMin.toString());
      } else {
        params.delete('bedroomsMin');
      }

      if (newFilters.bedroomsMax !== undefined) {
        params.set('bedroomsMax', newFilters.bedroomsMax.toString());
      } else {
        params.delete('bedroomsMax');
      }

      if (newFilters.sizeMin !== undefined) {
        params.set('sizeMin', newFilters.sizeMin.toString());
      } else {
        params.delete('sizeMin');
      }

      if (newFilters.sizeMax !== undefined) {
        params.set('sizeMax', newFilters.sizeMax.toString());
      } else {
        params.delete('sizeMax');
      }

      if (newFilters.hasPriceChange !== undefined) {
        params.set('hasPriceChange', newFilters.hasPriceChange.toString());
      } else {
        params.delete('hasPriceChange');
      }

      if (newFilters.includeActive !== undefined) {
        params.set('includeActive', newFilters.includeActive.toString());
      } else {
        params.delete('includeActive');
      }

      if (newFilters.includeInactive !== undefined) {
        params.set('includeInactive', newFilters.includeInactive.toString());
      } else {
        params.delete('includeInactive');
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const setSort = useCallback(
    (newSort: SortOption) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sortField', newSort.field);
      params.set('sortDir', newSort.direction);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.delete('priceMin');
    params.delete('priceMax');
    params.delete('location');
    params.delete('bedroomsMin');
    params.delete('bedroomsMax');
    params.delete('sizeMin');
    params.delete('sizeMax');
    params.delete('hasPriceChange');
    params.delete('includeActive');
    params.delete('includeInactive');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const resetSort = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('sortField');
    params.delete('sortDir');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const clearAll = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  return {
    filters,
    sort,
    hasActiveFilters,
    setFilters,
    setSort,
    clearFilters,
    resetSort,
    clearAll,
  };
}
