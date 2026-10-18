import type { SoldStatusFilter } from '../../types/property';

interface SoldStatusSelectorProps {
  value: SoldStatusFilter;
  onChange: (value: SoldStatusFilter) => void;
  soldCount?: number;
  activeCount?: number;
}

export function SoldStatusSelector({
  value,
  onChange,
  soldCount,
  activeCount,
}: SoldStatusSelectorProps) {
  const options: { id: SoldStatusFilter; label: string; badge?: number; color: string }[] = [
    {
      id: 'only_sold',
      label: 'Solo Vendidos',
      badge: soldCount,
      color: 'text-rose-600 dark:text-rose-400',
    },
    {
      id: 'only_active',
      label: 'Activos',
      badge: activeCount,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'all',
      label: 'Incluir Todos',
      color: 'text-slate-600 dark:text-slate-400',
    },
  ];

  return (
    <div
      role="group"
      aria-label="Filtro de estado de venta"
      className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-inner"
    >
      {options.map((option) => {
        const isSelected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              isSelected
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                option.id === 'only_sold'
                  ? 'bg-rose-500'
                  : option.id === 'only_active'
                  ? 'bg-emerald-500'
                  : 'bg-slate-400'
              }`}
            />
            <span>{option.label}</span>
            {option.badge != null && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                }`}
              >
                {option.badge.toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
