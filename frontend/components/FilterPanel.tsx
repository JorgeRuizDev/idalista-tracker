'use client';

import { useState, useCallback, useMemo } from 'react';
import { FilterState } from '@/types/property';
import { formatCurrency, formatSize } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface FilterPanelProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  availableLocations?: string[];
  priceRange?: { min: number; max: number };
  bedroomRange?: { min: number; max: number };
  sizeRange?: { min: number; max: number };
  className?: string;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  availableLocations = [],
  priceRange,
  bedroomRange,
  sizeRange,
  className,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  useMemo(() => {
    setLocalFilters(filters);
  }, [filters]);

  const hasActiveFilters = useMemo(() => {
    return (
      (filters.search !== undefined && filters.search.trim() !== '') ||
      filters.priceMin !== undefined ||
      filters.priceMax !== undefined ||
      (filters.location && filters.location.length > 0) ||
      filters.bedroomsMin !== undefined ||
      filters.bedroomsMax !== undefined ||
      filters.sizeMin !== undefined ||
      filters.sizeMax !== undefined ||
      filters.hasPriceChange === true ||
      filters.includeActive !== undefined ||
      filters.includeInactive !== undefined
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search && filters.search.trim() !== '') count++;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++;
    if (filters.location && filters.location.length > 0) count++;
    if (filters.bedroomsMin !== undefined || filters.bedroomsMax !== undefined) count++;
    if (filters.sizeMin !== undefined || filters.sizeMax !== undefined) count++;
    if (filters.hasPriceChange === true) count++;
    if (filters.includeActive !== undefined || filters.includeInactive !== undefined) count++;
    return count;
  }, [filters]);

  const handlePriceMinChange = useCallback((value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setLocalFilters(prev => ({ ...prev, priceMin: numValue }));
  }, []);

  const handlePriceMaxChange = useCallback((value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setLocalFilters(prev => ({ ...prev, priceMax: numValue }));
  }, []);

  const handleLocationToggle = useCallback((location: string) => {
    setLocalFilters(prev => {
      const currentLocations = prev.location || [];
      const newLocations = currentLocations.includes(location)
        ? currentLocations.filter(l => l !== location)
        : [...currentLocations, location];
      return { ...prev, location: newLocations.length > 0 ? newLocations : undefined };
    });
  }, []);

  const handleBedroomsMinChange = useCallback((value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setLocalFilters(prev => ({ ...prev, bedroomsMin: numValue }));
  }, []);

  const handleBedroomsMaxChange = useCallback((value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setLocalFilters(prev => ({ ...prev, bedroomsMax: numValue }));
  }, []);

  const handleSizeMinChange = useCallback((value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setLocalFilters(prev => ({ ...prev, sizeMin: numValue }));
  }, []);

  const handleSizeMaxChange = useCallback((value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    setLocalFilters(prev => ({ ...prev, sizeMax: numValue }));
  }, []);

  const handlePriceChangeToggle = useCallback((checked: boolean) => {
    setLocalFilters(prev => ({ ...prev, hasPriceChange: checked || undefined }));
  }, []);

  const handleActiveToggle = useCallback((checked: boolean) => {
    setLocalFilters(prev => ({ ...prev, includeActive: checked }));
  }, []);

  const handleInactiveToggle = useCallback((checked: boolean) => {
    setLocalFilters(prev => ({ ...prev, includeInactive: checked }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setLocalFilters(prev => ({ ...prev, search: value || undefined }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    onFiltersChange(localFilters);
  }, [localFilters, onFiltersChange]);

  const handleClearAll = useCallback(() => {
    setLocalFilters({});
    onClearFilters();
  }, [onClearFilters]);

  return (
    <div className={cn('bg-white rounded-lg border border-border shadow-sm flex flex-col max-h-[calc(100vh-2rem)]', className)}>
      {/* Header — always visible */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-foreground">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-primary rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={isExpanded}
            aria-controls="filter-panel-content"
          >
            <svg
              className={cn('w-5 h-5 transition-transform', isExpanded && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Action buttons — always visible at top */}
      <div className="flex gap-2 px-4 py-2 border-b border-border flex-shrink-0 bg-muted/30">
        <button
          onClick={handleApplyFilters}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Apply Filters
        </button>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-md hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-border focus:ring-offset-2"
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div
        id="filter-panel-content"
        className={cn(
          'flex-1 overflow-y-auto p-4 space-y-6',
          !isExpanded && 'hidden md:block'
        )}
      >
        {/* Text Search */}
        <div className="space-y-2">
          <label htmlFor="filter-search" className="text-sm font-medium text-foreground">
            Search
          </label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              id="filter-search"
              type="text"
              placeholder="Search title, location, type..."
              value={localFilters.search ?? ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-8 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              aria-label="Search properties"
            />
            {localFilters.search && localFilters.search.trim() !== '' && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter (Active/Inactive) */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Status</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
              <input
                type="checkbox"
                checked={localFilters.includeActive !== false}
                onChange={(e) => handleActiveToggle(e.target.checked)}
                className="w-4 h-4 text-green-600 border-border rounded focus:ring-green-500"
                aria-label="Include active properties"
              />
              <span className="text-sm text-foreground">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded">
              <input
                type="checkbox"
                checked={localFilters.includeInactive !== false}
                onChange={(e) => handleInactiveToggle(e.target.checked)}
                className="w-4 h-4 text-red-600 border-border rounded focus:ring-red-500"
                aria-label="Include inactive properties"
              />
              <span className="text-sm text-foreground">Inactive</span>
            </label>
          </div>
        </div>

        {/* Price Range Filter */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Price Range</label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              <input
                type="number"
                placeholder="Min"
                value={localFilters.priceMin ?? ''}
                onChange={(e) => handlePriceMinChange(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                min={0}
                step={1000}
                aria-label="Minimum price"
              />
            </div>
            <span className="text-muted-foreground">-</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
              <input
                type="number"
                placeholder="Max"
                value={localFilters.priceMax ?? ''}
                onChange={(e) => handlePriceMaxChange(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                min={0}
                step={1000}
                aria-label="Maximum price"
              />
            </div>
          </div>
          {priceRange && (
            <p className="text-xs text-muted-foreground">
              Range: {formatCurrency(priceRange.min)} - {formatCurrency(priceRange.max)}
            </p>
          )}
        </div>

        {/* Location Filter */}
        {availableLocations.length > 0 && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Location</label>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {availableLocations.map((location) => (
                <label
                  key={location}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={(localFilters.location || []).includes(location)}
                    onChange={() => handleLocationToggle(location)}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                    aria-label={`Filter by ${location}`}
                  />
                  <span className="text-sm text-foreground">{location}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Bedrooms Filter */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Bedrooms</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={localFilters.bedroomsMin ?? ''}
              onChange={(e) => handleBedroomsMinChange(e.target.value)}
              className="w-20 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              min={0}
              max={10}
              aria-label="Minimum bedrooms"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="number"
              placeholder="Max"
              value={localFilters.bedroomsMax ?? ''}
              onChange={(e) => handleBedroomsMaxChange(e.target.value)}
              className="w-20 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              min={0}
              max={10}
              aria-label="Maximum bedrooms"
            />
          </div>
          {bedroomRange && bedroomRange.max > 0 && (
            <p className="text-xs text-muted-foreground">
              Range: {bedroomRange.min} - {bedroomRange.max} beds
            </p>
          )}
        </div>

        {/* Size Filter (m²) */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Size (m²)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={localFilters.sizeMin ?? ''}
              onChange={(e) => handleSizeMinChange(e.target.value)}
              className="w-20 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              min={0}
              aria-label="Minimum size in m²"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="number"
              placeholder="Max"
              value={localFilters.sizeMax ?? ''}
              onChange={(e) => handleSizeMaxChange(e.target.value)}
              className="w-20 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              min={0}
              aria-label="Maximum size in m²"
            />
          </div>
          {sizeRange && sizeRange.max > 0 && (
            <p className="text-xs text-muted-foreground">
              Range: {formatSize(sizeRange.min)} - {formatSize(sizeRange.max)}
            </p>
          )}
        </div>

        {/* Price Change Filter */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localFilters.hasPriceChange === true}
              onChange={(e) => handlePriceChangeToggle(e.target.checked)}
              className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
              aria-label="Show only properties with price changes"
            />
            <span className="text-sm text-foreground">Has price change</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default FilterPanel;
