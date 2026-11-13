import { Building2, Calendar, TrendingUp } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export type ActiveTab = 'explorer' | 'intervals' | 'trends';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  totalCount?: number;
  soldCount?: number;
}

export function Header({ activeTab, onTabChange, totalCount, soldCount }: HeaderProps) {
  const tabs = [
    {
      id: 'explorer' as ActiveTab,
      label: 'Explorador de Inmuebles',
      shortLabel: 'Explorar',
      icon: Building2,
      badge: totalCount != null ? `${totalCount.toLocaleString()} total` : undefined,
    },
    {
      id: 'intervals' as ActiveTab,
      label: 'Auditoría por Intervalos',
      shortLabel: 'Intervalos',
      icon: Calendar,
      badge: soldCount != null ? `${soldCount.toLocaleString()} ventas` : undefined,
    },
    {
      id: 'trends' as ActiveTab,
      label: 'Evolución & Censo de Zonas',
      shortLabel: 'Tendencias',
      icon: TrendingUp,
      badge: '23 zonas',
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-14 md:h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-lg sm:text-xl shrink-0">
              U
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight truncate">
                  Urbana Pulse
                </span>
                <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40 shrink-0">
                  Burgos
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block truncate">
                Monitor del Mercado Inmobiliario & Análisis Transaccional
              </p>
            </div>
          </div>

          {/* Navigation Tabs - Desktop (md+) */}
          <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-1 sm:gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden xl:inline">{tab.label}</span>
                  <span className="xl:hidden">{tab.shortLabel}</span>
                  {tab.badge && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-md hidden 2xl:inline ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation Tabs - Mobile (< md) */}
        <nav aria-label="Navegación móvil" className="md:hidden pb-2.5 pt-0.5">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs font-semibold transition-all min-w-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
