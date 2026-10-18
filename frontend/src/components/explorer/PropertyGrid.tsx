import { ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react';
import type { Property } from '../../types/property';
import { PropertyCard } from './PropertyCard';

interface PropertyGridProps {
  properties: Property[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  onPageChange: (newOffset: number) => void;
  onSelectProperty: (property: Property) => void;
  onResetFilters?: () => void;
}

export function PropertyGrid({
  properties,
  total,
  limit,
  offset,
  isLoading,
  onPageChange,
  onSelectProperty,
  onResetFilters,
}: PropertyGridProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Cargando inmuebles y analítica...</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500 mb-4">
          <Inbox className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          No se encontraron inmuebles
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
          No hay resultados para los filtros actuales de zona, precio, estado de venta o rango de fechas.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors"
          >
            Restablecer todos los filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 3 to 4 Column Full-Width Responsive Mapless Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {properties.map((prop) => (
          <PropertyCard
            key={prop.idealista_id}
            property={prop}
            onSelect={onSelectProperty}
          />
        ))}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mostrando <strong className="text-slate-900 dark:text-white">{offset + 1}</strong> a{' '}
            <strong className="text-slate-900 dark:text-white">{Math.min(offset + limit, total)}</strong> de{' '}
            <strong className="text-slate-900 dark:text-white">{total.toLocaleString()}</strong> inmuebles
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset <= 0}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <span className="text-xs font-medium px-3 text-slate-600 dark:text-slate-400">
              Página <strong className="text-slate-900 dark:text-white">{currentPage}</strong> de{' '}
              <strong className="text-slate-900 dark:text-white">{totalPages}</strong>
            </span>

            <button
              type="button"
              disabled={offset + limit >= total}
              onClick={() => onPageChange(offset + limit)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
