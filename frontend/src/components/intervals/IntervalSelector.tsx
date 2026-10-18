import { useState } from 'react';
import { Calendar, Check, Search } from 'lucide-react';

export interface IntervalPreset {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

export const MONTHLY_PRESETS: IntervalPreset[] = [
  { id: '2026-05', label: 'Mayo 2026', startDate: '2026-05-01', endDate: '2026-05-31' },
  { id: '2026-06', label: 'Junio 2026', startDate: '2026-06-01', endDate: '2026-06-30' },
  { id: '2026-07', label: 'Julio 2026', startDate: '2026-07-01', endDate: '2026-07-31' },
  { id: '2026-08', label: 'Agosto 2026', startDate: '2026-08-01', endDate: '2026-08-31' },
  { id: '2026-09', label: 'Septiembre 2026', startDate: '2026-09-01', endDate: '2026-09-30' },
  { id: '2026-10', label: 'Octubre 2026', startDate: '2026-10-01', endDate: '2026-10-31' },
];

interface IntervalSelectorProps {
  selectedPreset: string;
  startDate: string;
  endDate: string;
  onSelectPreset: (presetId: string, start: string, end: string) => void;
  onCustomDateChange: (start: string, end: string) => void;
  isLoading?: boolean;
}

export function IntervalSelector({
  selectedPreset,
  startDate,
  endDate,
  onSelectPreset,
  onCustomDateChange,
  isLoading,
}: IntervalSelectorProps) {
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      onCustomDateChange(customStart, customEnd);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Monthly Presets Buttons */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
          Intervalos Mensuales Preconfigurados
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {MONTHLY_PRESETS.map((preset) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id, preset.startDate, preset.endDate)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500'
                    : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isSelected && <Check className="w-4 h-4 shrink-0" />}
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Range Picker */}
      <form
        onSubmit={handleApplyCustom}
        className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
          <span>O selecciona un rango de fechas personalizado:</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-slate-400 text-xs">a</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={isLoading || !customStart || !customEnd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Analizar</span>
          </button>
        </div>
      </form>
    </div>
  );
}
