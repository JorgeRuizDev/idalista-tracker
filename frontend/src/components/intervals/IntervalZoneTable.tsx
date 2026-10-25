import { useState } from 'react';
import { ArrowUpDown, Flame, MapPin } from 'lucide-react';
import type { IntervalZoneMetric } from '../../types/property';

export interface IntervalZoneTableProps {
  zoneBreakdown: IntervalZoneMetric[];
  intervalLabel: string;
  selectedZone?: string | null;
  onSelectZone?: (zone: string) => void;
}

type SortField = 'zone' | 'inclusions' | 'sales' | 'avg_days_to_sell' | 'avg_discount_pct' | 'avg_sale_price';

export function IntervalZoneTable({
  zoneBreakdown,
  intervalLabel,
  selectedZone,
  onSelectZone,
}: IntervalZoneTableProps) {
  const [sortField, setSortField] = useState<SortField>('sales');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedData = [...zoneBreakdown].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'zone') {
      comparison = a.zone.localeCompare(b.zone);
    } else {
      comparison = (a[sortField] ?? 0) - (b[sortField] ?? 0);
    }
    return sortAsc ? comparison : -comparison;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Table Title Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Dinámica Territorial por Zona
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Desglose de captaciones, ventas y precios de cierre en {intervalLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedZone && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
              Filtro activo: {selectedZone}
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            {zoneBreakdown.length} zonas activas
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
            <tr>
              <th
                onClick={() => handleSort('zone')}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>Zona / Barrio</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('sales')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Ventas Concluidas</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('inclusions')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Nuevas Captaciones</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avg_days_to_sell')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Días Medios Venta</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avg_discount_pct')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Rebaja Media %</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avg_sale_price')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Precio Medio Cierre</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedData.map((row) => {
              const isSelected = selectedZone === row.zone;
              return (
                <tr
                  key={row.zone}
                  role="row"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => onSelectZone?.(row.zone)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectZone?.(row.zone);
                    }
                  }}
                  className={`cursor-pointer transition-colors outline-none focus-visible:bg-indigo-50/50 dark:focus-visible:bg-indigo-950/30 ${
                    isSelected
                      ? 'border-l-4 border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 font-semibold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4 border-transparent'
                  }`}
                >
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{row.zone}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400">
                    <div className="flex items-center justify-end gap-1">
                      {row.sales > 0 && <Flame className="w-3.5 h-3.5" />}
                      <span>{row.sales}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-slate-700 dark:text-slate-300">
                    {row.inclusions}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                    {row.avg_days_to_sell > 0 ? `${row.avg_days_to_sell} días` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-amber-600 dark:text-amber-400 font-medium">
                    {row.avg_discount_pct > 0 ? `-${row.avg_discount_pct}%` : '0%'}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                    {row.avg_sale_price > 0 ? `${row.avg_sale_price.toLocaleString('es-ES')} €` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
