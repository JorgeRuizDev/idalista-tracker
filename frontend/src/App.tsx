import { useCallback, useEffect, useState } from 'react';
import { Filter, X } from 'lucide-react';
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
  IntervalMetricType,
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

const METRIC_LABELS: Record<string, string> = {
  inclusions: 'Inclusiones',
  sales: 'Ventas Concluidas',
  price_drops: 'Rebajas de Precio',
  price_increases: 'Aumentos de Precio',
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

  // Interval Drilldown State
  const [intervalMetric, setIntervalMetric] = useState<IntervalMetricType | null>(null);
  const [intervalZone, setIntervalZone] = useState<string | null>(null);
  const [intervalProperties, setIntervalProperties] = useState<Property[]>([]);
  const [intervalTotal, setIntervalTotal] = useState<number>(0);
  const [intervalOffset, setIntervalOffset] = useState<number>(0);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState<boolean>(false);

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

  // Load properties whenever filters or pagination change in explorer
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

  // Load Interval Drilldown Properties
  const fetchIntervalProperties = useCallback(async () => {
    setIsLoadingDrilldown(true);
    try {
      const response = await api.getProperties({
        movement_type: intervalMetric || undefined,
        zone: intervalZone || undefined,
        date_from: intervalStart,
        date_to: intervalEnd,
        limit: 24,
        offset: intervalOffset,
      });
      setIntervalProperties(response.items);
      setIntervalTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch interval drilldown properties:', err);
    } finally {
      setIsLoadingDrilldown(false);
    }
  }, [intervalMetric, intervalZone, intervalStart, intervalEnd, intervalOffset]);

  useEffect(() => {
    if (activeTab === 'intervals') {
      fetchIntervalProperties();
    }
  }, [activeTab, fetchIntervalProperties]);

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
    setIntervalOffset(0);
    fetchIntervalAudit(start, end);
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setIntervalPreset('custom');
    setIntervalStart(start);
    setIntervalEnd(end);
    setIntervalOffset(0);
    fetchIntervalAudit(start, end);
  };

  const handleSelectIntervalMetric = (metric: IntervalMetricType) => {
    setIntervalMetric((prev) => (prev === metric ? null : metric));
    setIntervalOffset(0);
  };

  const handleSelectIntervalZone = (zone: string) => {
    setIntervalZone((prev) => (prev === zone ? null : zone));
    setIntervalOffset(0);
  };

  const handleResetIntervalFilters = () => {
    setIntervalMetric(null);
    setIntervalZone(null);
    setIntervalOffset(0);
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
              selectedMetric={intervalMetric}
              onSelectMetric={handleSelectIntervalMetric}
            />

            {intervalData && (
              <IntervalZoneTable
                zoneBreakdown={intervalData.zone_breakdown}
                intervalLabel={intervalData.interval_label}
                selectedZone={intervalZone}
                onSelectZone={handleSelectIntervalZone}
              />
            )}

            {/* Drilldown Section Reusing PropertyGrid */}
            <div className="pt-4 space-y-4">
              {/* Active Filter Summary Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Filter className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Inmuebles Auditados:</span>
                  </div>

                  {intervalMetric && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                      <span>{METRIC_LABELS[intervalMetric] || intervalMetric}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIntervalMetric(null);
                          setIntervalOffset(0);
                        }}
                        className="hover:text-indigo-900 dark:hover:text-white p-0.5 rounded-full"
                        aria-label="Quitar filtro de métrica"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {intervalZone && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                      <span>Zona: {intervalZone}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIntervalZone(null);
                          setIntervalOffset(0);
                        }}
                        className="hover:text-amber-950 dark:hover:text-white p-0.5 rounded-full"
                        aria-label="Quitar filtro de zona"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {!intervalMetric && !intervalZone && (
                    <span className="text-xs text-slate-400 italic">
                      Todos los inmuebles del intervalo ({intervalData?.interval_label || `${intervalStart} a ${intervalEnd}`})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {intervalTotal} {intervalTotal === 1 ? 'inmueble' : 'inmuebles'}
                  </span>
                  {(intervalMetric || intervalZone) && (
                    <button
                      type="button"
                      onClick={handleResetIntervalFilters}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      Restablecer filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Reused PropertyGrid */}
              <PropertyGrid
                properties={intervalProperties}
                total={intervalTotal}
                limit={24}
                offset={intervalOffset}
                isLoading={isLoadingDrilldown}
                onPageChange={setIntervalOffset}
                onSelectProperty={setSelectedProperty}
                onResetFilters={handleResetIntervalFilters}
              />
            </div>
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
