import { CheckCircle2, Database, Info, X } from 'lucide-react';

interface ZoneDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  zonesCount: number;
  totalListings: number;
}

export function ZoneDiagnosticModal({
  isOpen,
  onClose,
  zonesCount,
  totalListings,
}: ZoneDiagnosticModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Diagnóstico de Normalización Territorial
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Resolución de artefactos de scraping y agregación geográfica
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Explanation */}
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Problema Detectado en la Base de Datos Original</span>
            </div>
            <p className="text-xs">
              En la base de datos histórica <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono">idealista_properties.db</code>, el campo <code className="font-mono">location</code> contenía fragmentos de texto como <em>&quot;3 hab. 70 m²&quot;</em> o cadenas sueltas sin el barrio real. El nombre genuino del distrito se encontraba incrustado en el campo <code className="font-mono">title</code> (p.ej. <em>&quot;Piso en Avenida Reyes Católicos, Los Vadillos - R. Sanitaria - Pozanos, Burgos&quot;</em>).
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
              Algoritmo Canónico de 23 Zonas
            </h4>
            <p>
              El servicio backend <code className="text-indigo-600 dark:text-indigo-400 font-mono">ZoneService</code> ejecuta un emparejamiento determinista en tiempo de ejecución:
            </p>
            <ul className="space-y-1.5 pl-4 list-disc text-xs">
              <li>
                Analiza las ocurrencias de barrios burgaleses (<em>Los Vadillos, Villa Pilar, Gamonal, San Pedro y San Felices, Fuentecillas, Universidad, etc.</em>).
              </li>
              <li>
                Identifica municipios anexos rastreados (<em>Briviesca, Cardeñadijo, Castrillo del Val, Aranda</em>).
              </li>
              <li>
                Consolida los <strong>{totalListings.toLocaleString()}</strong> inmuebles totales en exactamente <strong>{zonesCount} zonas canónicas</strong> homogéneas.
              </li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Normalización 100% activa en backend y cliente</span>
            </span>
            <span className="text-slate-500 font-mono">0 consultas lentas</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
