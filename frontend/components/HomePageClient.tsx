'use client';

/**
 * Home Page Client Component
 * Displays paginated property list with filters and price distribution chart
 */

import { useMemo } from 'react';
import { ClientPropertyList } from '@/components/ClientPropertyList';
import { FilterPanel } from '@/components/FilterPanel';
import { SortDropdown } from '@/components/SortDropdown';
import { useFilters } from '@/hooks/useFilters';
import { getUniqueLocations, getPriceRange, getBedroomRange, getSizeRange } from '@/lib/filters';
import { Property } from '@/types/property';
import Link from 'next/link';

interface HomePageClientProps {
  properties: Property[];
  totalProperties: number;
}

export function HomePageClient({ properties, totalProperties }: HomePageClientProps) {
  const { filters, sort, hasActiveFilters, setFilters, setSort, clearFilters } = useFilters();

  // Extract filter options from properties
  const availableLocations = useMemo(() => getUniqueLocations(properties), [properties]);
  const priceRange = useMemo(() => getPriceRange(properties), [properties]);
  const bedroomRange = useMemo(() => getBedroomRange(properties), [properties]);
  const sizeRange = useMemo(() => getSizeRange(properties), [properties]);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Property Tracker
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track and analyze property listings
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/insights"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                View Insights
              </Link>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Properties</p>
                <p className="text-2xl font-bold text-primary">
                  {totalProperties.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Sidebar with Filters */}
          <div className="lg:col-span-1 order-first">
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={clearFilters}
              availableLocations={availableLocations}
              priceRange={priceRange}
              bedroomRange={bedroomRange}
              sizeRange={sizeRange}
              className="sticky top-4"
            />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Sort and Mobile Insights Link */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <SortDropdown sort={sort} onSortChange={setSort} />
              <Link
                href="/insights"
                className="sm:hidden inline-flex items-center px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                View Insights
              </Link>
            </div>

            {/* Property List */}
            <ClientPropertyList
              properties={properties}
              pageSize={20}
              filters={filters}
              sort={sort}
              onClearFilters={clearFilters}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default HomePageClient;
