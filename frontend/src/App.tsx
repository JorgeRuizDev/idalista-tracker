import { useCallback, useEffect, useState } from 'react';
import { Header, type ActiveTab } from './components/layout/Header';
import { FilterToolbar } from './components/explorer/FilterToolbar';
import { PropertyGrid } from './components/explorer/PropertyGrid';
import { PropertyDetailModal } from './components/modal/PropertyDetailModal';
import { IntervalSelector } from './components/intervals/IntervalSelector';
import { IntervalMetricCards } from './components/intervals/IntervalMetricCards';
import { IntervalZoneTable } from './components/intervals/IntervalZoneTable';
import { PriceEvolutionChart } from './components/trends/PriceEvolutionChart';
import { DropsVsSalesChart } from './components/trends/DropsVsSalesChart';
import { CensusTable } from './components/trends/CensusTable';
import { ZoneDiagnosticModal } from './components/modal/ZoneDiagnosticModal';
import { api } from './services/api';
import type {
  FilterState,
  IntervalAudit,
  MarketTrends,
  NormalizedZone,
  Property,
} from './types/property';

const INITIAL_FILTERS: FilterState = {
  soldStatus: 'all',
  zone: 'all',
  priceMin: undefined,
  priceMax: undefined,
  dateStart: undefined,
  dateEnd: undefined,
  onlyDeals: false,
  searchQuery: '',
  sortBy: 'discount_desc',
};

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('explorer');

  // Explorer State
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTERS);
  const [zones, setZones] = useState<NormalizedZone[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [limit] = useState<number>(24);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Interval Audit State
  const [intervalPreset, setIntervalPreset] = useState<string>('2026-07');
  const [intervalStart, setIntervalStart] = useState<string>('2026-07-01');
  const [intervalEnd, setIntervalEnd] = useState<string>('2026-07-31');
  const [intervalData, setIntervalData] = useState<IntervalAudit | null>(null);
  const [isLoadingInterval, setIsLoadingInterval] = useState<boolean>(false);

  // Trends & Census State
  const [marketTrends, setMarketTrends] = useState<MarketTrends | null>(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState<boolean>(false);

  // Load Zones Census on mount
  useEffect(() => {
    api
      .getZones()
      .then((data) => setZones(data))
      .catch((err) => console.error('Failed to load zones census:', err));
  }, []);

  // Compute total counts
  const grandTotal = zones.reduce((acc, z) => acc + z.total, 0) || totalResults;
  const soldCount = zones.reduce((acc, z) => acc + z.sold, 0);
  const activeCount = zones.reduce((acc, z) => acc + z.active, 0);

  // Load properties whenever filters or pagination change
  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    try {
      let statusParam: string | undefined = undefined;
      if (filter.soldStatus === 'only_sold') statusParam = 'sold';
      else if (filter.soldStatus === 'only_active') statusParam = 'active';

      const response = await api.getProperties({
        status: statusParam,
        zone: filter.zone !== 'all' ? filter.zone : undefined,
        min_price: filter.priceMin,
        max_price: filter.priceMax,
        date_from: filter.dateStart,
        date_to: filter.dateEnd,
        has_price_drop: filter.onlyDeals ? true : undefined,
        search: filter.searchQuery.trim() || undefined,
        sort_by: filter.sortBy,
        limit,
        offset,
      });

      setProperties(response.items);
      setTotalResults(response.total);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter, offset, limit]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Load Interval Audit data
  const fetchIntervalAudit = useCallback(async (start: string, end: string) => {
    setIsLoadingInterval(true);
    try {
      const data = await api.getIntervalAudit(start, end);
      setIntervalData(data);
    } catch (err) {
      console.error('Failed to fetch interval audit:', err);
    } finally {
      setIsLoadingInterval(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'intervals' && (!intervalData || intervalData.start_date !== intervalStart || intervalData.end_date !== intervalEnd)) {
      fetchIntervalAudit(intervalStart, intervalEnd);
    }
  }, [activeTab, intervalStart, intervalEnd, intervalData, fetchIntervalAudit]);

  // Load Market Trends data
  useEffect(() => {
    if (activeTab === 'trends' && !marketTrends) {
      setIsLoadingTrends(true);
      api
        .getMarketTrends()
        .then((data) => setMarketTrends(data))
        .catch((err) => console.error('Failed to fetch market trends:', err))
        .finally(() => setIsLoadingTrends(false));
    }
  }, [activeTab, marketTrends]);

  const handleSelectPreset = (presetId: string, start: string, end: string) => {
    setIntervalPreset(presetId);
    setIntervalStart(start);
    setIntervalEnd(end);
    fetchIntervalAudit(start, end);
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setIntervalPreset('custom');
    setIntervalStart(start);
    setIntervalEnd(end);
    fetchIntervalAudit(start, end);
  };

  const handleFilterChange = (newFilter: FilterState) => {
    setFilter(newFilter);
    setOffset(0);
  };

  const handleResetFilters = () => {
    setFilter(INITIAL_FILTERS);
    setOffset(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalCount={grandTotal}
        soldCount={soldCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tab 1: Property Explorer */}
        {activeTab === 'explorer' && (
          <div className="space-y-6">
            <FilterToolbar
              filter={filter}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
              zones={zones}
              totalResults={totalResults}
              soldCount={soldCount}
              activeCount={activeCount}
            />

            <PropertyGrid
              properties={properties}
              total={totalResults}
              limit={limit}
              offset={offset}
              isLoading={isLoading}
              onPageChange={setOffset}
              onSelectProperty={setSelectedProperty}
              onResetFilters={handleResetFilters}
            />
          </div>
        )}

        {/* Tab 2: Interval Audit */}
        {activeTab === 'intervals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Auditoría por Intervalos & Dinámica de Mercado
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Análisis cuantitativo de captaciones, ventas concluidas, rebajas y velocidad de absorción
                </p>
              </div>
            </div>

            <IntervalSelector
              selectedPreset={intervalPreset}
              startDate={intervalStart}
              endDate={intervalEnd}
              onSelectPreset={handleSelectPreset}
              onCustomDateChange={handleCustomDateChange}
              isLoading={isLoadingInterval}
            />

            <IntervalMetricCards
              data={intervalData}
              isLoading={isLoadingInterval}
            />

            {intervalData && (
              <IntervalZoneTable
                zoneBreakdown={intervalData.zone_breakdown}
                intervalLabel={intervalData.interval_label}
              />
            )}
          </div>
        )}

        {/* Tab 3: Trends & Census */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Evolución Macroeconómica de Precios & Censo de Zonas
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Curva histórica de €/m², balance mensual de rebajas frente a ventas y censo unificado
                </p>
              </div>
            </div>

            {/* Charts Grid */}
            {isLoadingTrends ? (
              <div className="h-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 flex items-center justify-center text-sm text-slate-400 animate-pulse">
                Cargando series históricas de mercado...
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <PriceEvolutionChart data={marketTrends?.monthly || []} />
                <DropsVsSalesChart data={marketTrends?.monthly || []} />
              </div>
            )}

            {/* 23 Canonical Zones Census Table */}
            <CensusTable
              zones={zones}
              onOpenDiagnostic={() => setIsDiagnosticOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />

      {/* Zone Diagnostic Modal */}
      <ZoneDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
        zonesCount={zones.length}
        totalListings={grandTotal}
      />
    </div>
  );
}

export default App;
