'use client';

/**
 * Insights Page Client Component
 * Displays statistics and visualizations for filtered properties
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FilterPanel } from '@/components/FilterPanel';
import { StatsCard } from '@/components/StatsCard';
import { InsightsChart } from '@/components/InsightsChart';
import { DistributionChart } from '@/components/DistributionChart';
import { PropertyTypeChart } from '@/components/PropertyTypeChart';
import { CrawlHistoryTable } from '@/components/CrawlHistoryTable';
import { CrawlHistoryDetailModal } from '@/components/CrawlHistoryDetailModal';
import { EmptyState } from '@/components/EmptyState';
import { useFilters } from '@/hooks/useFilters';
import { getUniqueLocations, getPriceRange, getBedroomRange, getSizeRange, filterProperties } from '@/lib/filters';
import { calculateInsightStats, formatCompactCurrency, formatNumber } from '@/lib/stats';
import { Property, PriceDistribution, CrawlHistoryResponse } from '@/types/property';

interface InsightsPageClientProps {
  properties: Property[];
  priceDistribution: PriceDistribution;
  crawlHistory: CrawlHistoryResponse;
}

export function InsightsPageClient({ properties, priceDistribution, crawlHistory }: InsightsPageClientProps) {
  const { filters, hasActiveFilters, setFilters, clearFilters } = useFilters();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Extract filter options from properties
  const availableLocations = useMemo(() => getUniqueLocations(properties), [properties]);
  const priceRange = useMemo(() => getPriceRange(properties), [properties]);
  const bedroomRange = useMemo(() => getBedroomRange(properties), [properties]);
  const sizeRange = useMemo(() => getSizeRange(properties), [properties]);

  // Apply filters and calculate stats
  const filteredProperties = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return properties;
    }
    return filterProperties(properties, filters);
  }, [properties, filters]);

  const stats = useMemo(() => {
    return calculateInsightStats(filteredProperties);
  }, [filteredProperties]);

  const hasProperties = filteredProperties.length > 0;

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to List
              </Link>
            </div>
            <div className="text-center flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Property Insights
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Analytics and statistics for your property search
              </p>
            </div>
            <div className="w-24" /> {/* Spacer for alignment */}
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
            {!hasProperties ? (
              <EmptyState
                title="No properties match your filters"
                description="Adjust your filters to see insights for available properties."
                onClearFilters={clearFilters}
              />
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Property Count */}
                  <StatsCard
                    title="Properties"
                    value={formatNumber(stats.count)}
                    subtitle={hasActiveFilters ? 'Matching your filters' : 'Total properties'}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                    }
                  />

                  {/* Average Price */}
                  <StatsCard
                    title="Average Price"
                    value={formatCompactCurrency(stats.avgPrice)}
                    subtitle="Mean across all properties"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    }
                  />

                  {/* Median Price */}
                  <StatsCard
                    title="Median Price"
                    value={formatCompactCurrency(stats.medianPrice)}
                    subtitle="50th percentile"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    }
                  />

                  {/* Price Range */}
                  <StatsCard
                    title="Price Range"
                    value={`${formatCompactCurrency(stats.minPrice)} - ${formatCompactCurrency(stats.maxPrice)}`}
                    subtitle="Minimum to maximum"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                        />
                      </svg>
                    }
                  />

                  {/* Average Price per m² */}
                  <StatsCard
                    title="Avg. Price/m²"
                    value={stats.avgPricePerSqm > 0 ? `${formatCompactCurrency(stats.avgPricePerSqm)}/m²` : 'N/A'}
                    subtitle="For properties with size data"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                    }
                  />

                  {/* Average Price Change */}
                  <StatsCard
                    title="Avg. Price Change"
                    value={stats.avgPriceChange === null ? 'N/A' : `${stats.avgPriceChange.toFixed(1)}%`}
                    subtitle="For properties with price changes"
                    trend={
                      stats.avgPriceChange === null
                        ? 'neutral'
                        : stats.avgPriceChange > 0
                          ? 'down'
                          : stats.avgPriceChange < 0
                            ? 'up'
                            : 'neutral'
                    }
                    trendValue={
                      stats.avgPriceChange === null
                        ? 'No price changes'
                        : stats.avgPriceChange > 0
                          ? 'Drop'
                          : stats.avgPriceChange < 0
                            ? 'Increase'
                            : 'No change'
                    }
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    }
                  />

                  {/* Properties with Price Changes */}
                  <StatsCard
                    title="With Price History"
                    value={formatNumber(
                      filteredProperties.filter(
                        (p) => (p.price_history_count ?? 0) > 0
                      ).length
                    )}
                    subtitle="Properties tracked over time"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    }
                  />

                  {/* Average Property Size */}
                  <StatsCard
                    title="Avg. Size"
                    value={`${Math.round(
                      filteredProperties.reduce((acc, p) => acc + (p.size_m2 || 0), 0) /
                        filteredProperties.filter((p) => p.size_m2).length || 1
                    )} m²`}
                    subtitle="Average square meters"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                    }
                  />

                  {/* Status: Active */}
                  <StatsCard
                    title="Active Listings"
                    value={formatNumber(stats.statusDistribution.active)}
                    subtitle={stats.count > 0 ? `${Math.round((stats.statusDistribution.active / stats.count) * 100)}% of total` : '0%'}
                    trend="up"
                    trendValue="Active"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    }
                  />

                  {/* Sold Properties */}
                  <StatsCard
                    title="Sold / Delisted"
                    value={formatNumber(stats.statusDistribution.sold + stats.statusDistribution.missing)}
                    subtitle={`${stats.statusDistribution.sold} sold, ${stats.statusDistribution.missing} missing`}
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                        />
                      </svg>
                    }
                  />

                  {/* Average Days to Sell */}
                  <StatsCard
                    title="Avg. Time to Sell"
                    value={stats.avgDaysToSell === null ? 'N/A' : `${stats.avgDaysToSell} days`}
                    subtitle="Avg. days from delist to sold"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    }
                  />
                </div>

                {/* Price Distribution Chart */}
                <InsightsChart buckets={stats.priceDistribution} />

                {/* Additional Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <DistributionChart
                    buckets={stats.pricePerSqmDistribution}
                    title="Price per m² Distribution"
                    subtitle="Number of properties by €/m² range"
                  />
                  <DistributionChart
                    buckets={stats.sizeDistribution}
                    title="Size Distribution"
                    subtitle="Number of properties by m² range"
                  />
                </div>

                {/* Property Type Chart */}
                <PropertyTypeChart typeDistribution={stats.typeDistribution} />

                {/* Crawl History Table */}
                <CrawlHistoryTable entries={crawlHistory.entries} onDateClick={setSelectedDate} />

                {/* Crawl History Detail Modal */}
                {selectedDate && (
                  <CrawlHistoryDetailModal
                    date={selectedDate}
                    onClose={() => setSelectedDate(null)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default InsightsPageClient;
