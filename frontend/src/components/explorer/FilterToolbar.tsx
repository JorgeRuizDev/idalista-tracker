import { Calendar, Filter, RotateCcw, Search, Sparkles } from 'lucide-react';
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
}

export function FilterToolbar({
  filter,
  onChange,
  onReset,
  zones,
  totalResults,
  soldCount,
  activeCount,
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
      {/* Top Row: Sold Status Control & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <SoldStatusSelector
          value={filter.soldStatus}
          onChange={(val) => updateField('soldStatus', val)}
          soldCount={soldCount}
          activeCount={activeCount}
        />

        {/* Text Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => updateField('searchQuery', e.target.value)}
            placeholder="Buscar por calle, zona o palabra clave..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Second Row: Detailed Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm">
        {/* Zone Selector */}
        <div className="space-y-1">
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
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Rango de Precio (€)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Mín"
              value={filter.priceMin ?? ''}
              onChange={(e) => updateField('priceMin', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs tabular-nums"
            />
            <span className="text-slate-400">-</span>
            <input
              type="number"
              placeholder="Máx"
              value={filter.priceMax ?? ''}
              onChange={(e) => updateField('priceMax', e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs tabular-nums"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Fecha (Venta / Registro)</span>
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={filter.dateStart ?? ''}
              onChange={(e) => updateField('dateStart', e.target.value || undefined)}
              className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={filter.dateEnd ?? ''}
              onChange={(e) => updateField('dateEnd', e.target.value || undefined)}
              className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
          </div>
        </div>

        {/* Sort Select */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Ordenar por
          </label>
          <select
            value={filter.sortBy}
            onChange={(e) => updateField('sortBy', e.target.value as PropertySortBy)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Toggles & Reset */}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => updateField('onlyDeals', !filter.onlyDeals)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-medium border text-xs sm:text-sm transition-all ${
              filter.onlyDeals
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Mostrar solo inmuebles con rebaja de precio registrada"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rebajas</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Restablecer todos los filtros"
            aria-label="Restablecer filtros"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-indigo-500" />
          <span>
            Mostrando <strong className="text-slate-900 dark:text-white tabular-nums">{totalResults}</strong> inmuebles coincidentes
          </span>
        </div>
      </div>
    </div>
  );
}
