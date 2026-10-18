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
      icon: Building2,
      badge: totalCount != null ? `${totalCount.toLocaleString()} total` : undefined,
    },
    {
      id: 'intervals' as ActiveTab,
      label: 'Auditoría por Intervalos',
      icon: Calendar,
      badge: soldCount != null ? `${soldCount.toLocaleString()} ventas` : undefined,
    },
    {
      id: 'trends' as ActiveTab,
      label: 'Evolución & Censo de Zonas',
      icon: TrendingUp,
      badge: '23 zonas',
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-xl">
              U
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                  Urbana Pulse
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40">
                  Burgos
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Monitor del Mercado Inmobiliario & Análisis Transaccional
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden">
                    {tab.id === 'explorer' ? 'Explorar' : tab.id === 'intervals' ? 'Intervalos' : 'Tendencias'}
                  </span>
                  {tab.badge && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-md hidden lg:inline ${
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
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
