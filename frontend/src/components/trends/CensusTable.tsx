import { useState } from 'react';
import { ArrowUpDown, HelpCircle, MapPin } from 'lucide-react';
import type { NormalizedZone } from '../../types/property';

interface CensusTableProps {
  zones: NormalizedZone[];
  onOpenDiagnostic: () => void;
}

type CensusSortField =
  | 'zone'
  | 'total'
  | 'active'
  | 'sold'
  | 'missing'
  | 'avg_price'
  | 'avg_m2'
  | 'avg_days_to_sell'
  | 'avg_discount_pct';

export function CensusTable({ zones, onOpenDiagnostic }: CensusTableProps) {
  const [sortField, setSortField] = useState<CensusSortField>('total');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: CensusSortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedZones = [...zones].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'zone') {
      comparison = a.zone.localeCompare(b.zone);
    } else {
      comparison = (a[sortField] ?? 0) - (b[sortField] ?? 0);
    }
    return sortAsc ? comparison : -comparison;
  });

  const grandTotal = zones.reduce((acc, z) => acc + z.total, 0);
  const activeTotal = zones.reduce((acc, z) => acc + z.active, 0);
  const soldTotal = zones.reduce((acc, z) => acc + z.sold, 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Table Title and Actions */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Censo Oficial de las 23 Zonas Canónicas de Burgos
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              {zones.length} zonas
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Agregaciones calculadas directamente sobre los {grandTotal.toLocaleString()} registros de la base de datos (sin estimaciones especulativas)
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenDiagnostic}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-indigo-500" />
          <span>Diagnóstico de Normalización</span>
        </button>
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
                  <span>Zona Canónica</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('total')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Total Registros</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('active')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Activos</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('sold')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Vendidos</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('missing')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Desaparecidos</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avg_price')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Precio Medio</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avg_m2')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>€/m² Medio</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avg_days_to_sell')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Días Venta</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => handleSort('avg_discount_pct')}
                className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Rebaja %</span>
                  <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedZones.map((z) => (
              <tr
                key={z.zone}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{z.zone}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                  {z.total.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                  {z.active.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-rose-600 dark:text-rose-400 font-bold">
                  {z.sold.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-slate-400">
                  {z.missing.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-900 dark:text-white">
                  {z.avg_price > 0 ? `${z.avg_price.toLocaleString('es-ES')} €` : '—'}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-indigo-600 dark:text-indigo-400 font-medium">
                  {z.avg_m2 > 0 ? `${z.avg_m2.toLocaleString('es-ES')} €/m²` : '—'}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-slate-600 dark:text-slate-400">
                  {z.avg_days_to_sell > 0 ? `${z.avg_days_to_sell} días` : '—'}
                </td>
                <td className="py-3 px-4 text-right tabular-nums text-amber-600 dark:text-amber-400 font-medium">
                  {z.avg_discount_pct > 0 ? `-${z.avg_discount_pct}%` : '0%'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100/75 dark:bg-slate-800/60 font-bold text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700">
            <tr>
              <td className="py-3 px-4">TOTAL BURGOS</td>
              <td className="py-3 px-4 text-right tabular-nums">{grandTotal.toLocaleString()}</td>
              <td className="py-3 px-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                {activeTotal.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right tabular-nums text-rose-600 dark:text-rose-400">
                {soldTotal.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right tabular-nums text-slate-400">
                {(grandTotal - activeTotal - soldTotal).toLocaleString()}
              </td>
              <td colSpan={4} className="py-3 px-4 text-right text-xs font-normal text-slate-500">
                23 zonas normalizadas
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
