import { Calendar, CheckCircle2, Filter, RotateCcw, Search, Sparkles } from 'lucide-react';
import type { FilterState, NormalizedZone, PropertySortBy } from '../../types/property';
import { SoldStatusSelector } from './SoldStatusSelector';

interface FilterToolbarProps {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
  onReset: () => void;
  zones: NormalizedZone[];
  totalResults: number;
  soldCount?: number;
  activeCount?: number;
  completedCount?: number;
}

export function FilterToolbar({
  filter,
  onChange,
  onReset,
  zones,
  totalResults,
  soldCount,
  activeCount,
  completedCount,
}: FilterToolbarProps) {
  const updateField = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({
      ...filter,
      [key]: value,
    });
  };

  const sortOptions: { value: PropertySortBy; label: string }[] = [
    { value: 'discount_desc', label: 'Mayor rebaja (€ y %)' },
    { value: 'days_desc', label: 'Más tiempo en mercado' },
    { value: 'price_asc', label: 'Precio: menor a mayor' },
    { value: 'price_desc', label: 'Precio: mayor a menor' },
    { value: 'm2_asc', label: '€/m²: más accesible' },
    { value: 'date_desc', label: 'Fecha más reciente' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-4">
      {/* Top Row: Sold Status Control, Quick Toggles & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SoldStatusSelector
            value={filter.soldStatus}
            onChange={(val) => updateField('soldStatus', val)}
            soldCount={soldCount}
            activeCount={activeCount}
          />

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700/80 hidden sm:block mx-1" />

          {/* Ficha Completa Filter Toggle */}
          <button
            type="button"
            onClick={() => updateField('onlyCompletedDetails', !filter.onlyCompletedDetails)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs sm:text-sm border transition-all ${
              filter.onlyCompletedDetails
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
            title="Mostrar solo viviendas con ficha completa (descripción detallada, fotos y características)"
          >
            <CheckCircle2 className={`w-4 h-4 ${filter.onlyCompletedDetails ? 'text-white' : 'text-emerald-500'}`} />
            <span>Ficha completa</span>
            {completedCount != null && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono ${
                  filter.onlyCompletedDetails
                    ? 'bg-emerald-700 text-emerald-100'
                    : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400'
                }`}
              >
                {completedCount.toLocaleString()}
              </span>
            )}
          </button>

          {/* Rebajas Filter Toggle */}
          <button
            type="button"
            onClick={() => updateField('onlyDeals', !filter.onlyDeals)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs sm:text-sm border transition-all ${
              filter.onlyDeals
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
            title="Mostrar solo inmuebles con rebaja de precio registrada"
          >
            <Sparkles className={`w-3.5 h-3.5 ${filter.onlyDeals ? 'text-white' : 'text-amber-500'}`} />
            <span>Rebajas</span>
          </button>
        </div>

        {/* Search Bar & Reset Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={(e) => updateField('searchQuery', e.target.value)}
              placeholder="Buscar por calle, zona o palabra clave..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={onReset}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title="Restablecer todos los filtros"
            aria-label="Restablecer filtros"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Second Row: Detailed Filters (4 evenly spaced columns preventing date overflow) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm">
        {/* Zone Selector */}
        <div className="space-y-1 min-w-0">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Zona de Burgos
          </label>
          <select
            value={filter.zone}
            onChange={(e) => updateField('zone', e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
          >
            <option value="all">Todas las zonas ({zones.reduce((acc, z) => acc + z.total, 0)})</option>
            {zones.map((z) => (
              <option key={z.zone} value={z.zone}>
                {z.zone} ({z.total})
              </option>
            ))}
          </select>
        </div>

        {/* Price Range */}
        <div className="space-y-1 min-w-0">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Rango de Precio (€)
          </label>
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="number"
              placeholder="Mín"
              value={filter.priceMin ?? ''}
              onChange={(e) => updateField('priceMin', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full min-w-0 flex-1 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs tabular-nums"
            />
            <span className="text-slate-400 shrink-0">-</span>
            <input
              type="number"
              placeholder="Máx"
              value={filter.priceMax ?? ''}
              onChange={(e) => updateField('priceMax', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full min-w-0 flex-1 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs tabular-nums"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-1 min-w-0">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Fecha (Venta / Registro)</span>
          </label>
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="date"
              value={filter.dateStart ?? ''}
              onChange={(e) => updateField('dateStart', e.target.value || undefined)}
              className="w-full min-w-0 flex-1 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
            <span className="text-slate-400 shrink-0">-</span>
            <input
              type="date"
              value={filter.dateEnd ?? ''}
              onChange={(e) => updateField('dateEnd', e.target.value || undefined)}
              className="w-full min-w-0 flex-1 px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
          </div>
        </div>

        {/* Sort Select */}
        <div className="space-y-1 min-w-0">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Ordenar por
          </label>
          <select
            value={filter.sortBy}
            onChange={(e) => updateField('sortBy', e.target.value as PropertySortBy)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 truncate"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            Mostrando <strong className="text-slate-900 dark:text-white tabular-nums">{totalResults}</strong> inmuebles coincidentes
          </span>
          {filter.onlyCompletedDetails && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              <CheckCircle2 className="w-3 h-3" />
              Solo con ficha completa
            </span>
          )}
          {filter.onlyDeals && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
              <Sparkles className="w-3 h-3" />
              Con rebaja de precio
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
