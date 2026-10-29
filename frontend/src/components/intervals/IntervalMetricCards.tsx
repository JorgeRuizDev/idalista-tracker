import type React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building,
  CheckCircle2,
  Clock,
  Coins,
  Ruler,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { IntervalAudit, IntervalMetricType } from '../../types/property';

export interface IntervalMetricCardsProps {
  data: IntervalAudit | null;
  isLoading?: boolean;
  selectedMetric?: IntervalMetricType | null;
  onSelectMetric?: (metric: IntervalMetricType) => void;
}

export function IntervalMetricCards({
  data,
  isLoading,
  selectedMetric,
  onSelectMetric,
}: IntervalMetricCardsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 animate-pulse space-y-3"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="w-16 h-6 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="w-24 h-4 rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
        ))}
      </div>
    );
  }

  const handleKeyDown = (e: React.KeyboardEvent, metric: IntervalMetricType) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectMetric?.(metric);
    }
  };

  const getCardClasses = (metric: IntervalMetricType) => {
    const isSelected = selectedMetric === metric;
    return `p-4 rounded-2xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      isSelected
        ? 'ring-2 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/30 border-indigo-500 shadow-md'
        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-md'
    }`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* 1. Inclusiones */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selectedMetric === 'inclusions'}
        aria-label={`Filtrar por Inclusiones: ${data.inclusions} nuevos anuncios`}
        onClick={() => onSelectMetric?.('inclusions')}
        onKeyDown={(e) => handleKeyDown(e, 'inclusions')}
        className={getCardClasses('inclusions')}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Inclusiones
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Building className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {data.inclusions.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Nuevos anuncios captados
          </p>
        </div>
      </div>

      {/* 2. Ventas */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selectedMetric === 'sales'}
        aria-label={`Filtrar por Ventas Concluidas: ${data.sales} inmuebles vendidos`}
        onClick={() => onSelectMetric?.('sales')}
        onKeyDown={(e) => handleKeyDown(e, 'sales')}
        className={getCardClasses('sales')}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Ventas Concluidas
          </span>
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            {data.sales.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Inmuebles vendidos en el periodo
          </p>
        </div>
      </div>

      {/* 3. Rebajas */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selectedMetric === 'price_drops'}
        aria-label={`Filtrar por Rebajas de Precio: ${data.drops_count} inmuebles con rebajas`}
        onClick={() => onSelectMetric?.('price_drops')}
        onKeyDown={(e) => handleKeyDown(e, 'price_drops')}
        className={getCardClasses('price_drops')}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Rebajas de Precio
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {data.drops_count}
            </span>
            <span className="inline-flex items-center text-xs font-bold text-amber-600 dark:text-amber-400">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {data.avg_drop_pct}% media
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 tabular-nums">
            <Coins className="w-3 h-3 text-amber-500" />
            <span>-{data.total_drop_amount.toLocaleString('es-ES')} € reducidos</span>
          </p>
        </div>
      </div>

      {/* 4. Subidas */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selectedMetric === 'price_increases'}
        aria-label={`Filtrar por Aumentos de Precio: ${data.increases_count} revisiones al alza`}
        onClick={() => onSelectMetric?.('price_increases')}
        onKeyDown={(e) => handleKeyDown(e, 'price_increases')}
        className={getCardClasses('price_increases')}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Aumentos de Precio
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {data.increases_count}
            </span>
            {data.increases_count > 0 && (
              <span className="inline-flex items-center text-xs font-bold text-purple-600 dark:text-purple-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                +{data.avg_inc_pct}% media
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Revisiones al alza
          </p>
        </div>
      </div>

      {/* 5. Días Medios hasta Venta (Informativo, no interactivo como filtro) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Días Medios de Venta
          </span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {data.avg_days_to_sell}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              días
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Desde publicación a cierre
          </p>
        </div>
      </div>

      {/* 6. Precio Medio m² (Informativo de referencia de valor unitario) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Precio Medio m²
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Ruler className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {data.avg_m2 > 0 ? `${data.avg_m2.toLocaleString('es-ES')} €` : '—'}
            </span>
            {data.avg_m2 > 0 && (
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                /m²
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Media en transacciones cerradas
          </p>
        </div>
      </div>
    </div>
  );
}
