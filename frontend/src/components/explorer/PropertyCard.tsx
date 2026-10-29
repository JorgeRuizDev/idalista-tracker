import { useEffect, useState } from 'react';
import { ArrowDownRight, Bed, Camera, Clock, Flame, Home, Layers, MapPin } from 'lucide-react';
import type { Property } from '../../types/property';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
}

export function PropertyCard({ property, onSelect }: PropertyCardProps) {
  const isSold = property.status === 'sold';
  const hasDiscount = property.discount_amount > 0;

  const initialThumb = property.photos && property.photos.length > 0 ? property.photos[0] : null;
  const proxyEndpoint = property.idealista_id ? `/api/v1/properties/${property.idealista_id}/image` : null;
  const [currentSrc, setCurrentSrc] = useState<string | null>(initialThumb || proxyEndpoint);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const thumb = property.photos && property.photos.length > 0 ? property.photos[0] : null;
    const proxy = property.idealista_id ? `/api/v1/properties/${property.idealista_id}/image` : null;
    setCurrentSrc(thumb || proxy);
    setHasError(false);
  }, [property.idealista_id, property.photos]);

  const handleImageError = () => {
    const proxy = property.idealista_id ? `/api/v1/properties/${property.idealista_id}/image` : null;
    if (proxy && currentSrc !== proxy) {
      setCurrentSrc(proxy);
    } else {
      setHasError(true);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoString.slice(0, 10);
    }
  };

  return (
    <article
      onClick={() => onSelect(property)}
      className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Image Container with Badges */}
      <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {currentSrc && !hasError ? (
          <img
            src={currentSrc}
            alt={property.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800/60">
            <Home className="w-10 h-10 mb-1 opacity-40" />
            <span className="text-xs font-medium">Sin imagen</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
          {isSold ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-rose-600 text-white shadow-md">
              <Flame className="w-3.5 h-3.5" />
              VENDIDO
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-600/90 text-white shadow-sm backdrop-blur-sm">
              Activo
            </span>
          )}

          {hasDiscount && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500 text-white shadow-md ml-auto">
              <ArrowDownRight className="w-3.5 h-3.5" />
              -{property.discount_pct}%
            </span>
          )}
        </div>

        {/* Bottom overlay: Days on market */}
        {property.days_on_market != null && (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-900/80 text-white backdrop-blur-sm flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-300" />
            <span>
              {isSold
                ? `Tardó ${property.days_on_market} días`
                : `${property.days_on_market} días en mercado`}
            </span>
          </div>
        )}

        {/* Bottom overlay: Completed Fiche / Photos count */}
        {property.detail_status === 'completed' && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm flex items-center gap-1">
            <Camera className="w-3 h-3 text-emerald-400" />
            <span>{property.photos && property.photos.length > 1 ? `${property.photos.length} fotos` : 'Ficha completa'}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        {/* Zone & Title */}
        <div className="mb-2">
          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{property.zone}</span>
          </div>
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {property.title}
          </h3>
        </div>

        {/* Pricing */}
        <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {property.current_price.toLocaleString('es-ES')} €
              </span>
              {hasDiscount && (
                <span className="block text-xs line-through text-slate-400 dark:text-slate-500 tabular-nums">
                  {property.original_price.toLocaleString('es-ES')} €
                </span>
              )}
            </div>

            {property.price_per_m2 && (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                {property.price_per_m2.toLocaleString('es-ES')} €/m²
              </span>
            )}
          </div>

          {/* Sold info subtext */}
          {isSold && property.sold_at && (
            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
              Vendido el {formatDate(property.sold_at)}
            </p>
          )}

          {/* Physical features row */}
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {property.size_m2 != null && (
              <div className="flex items-center gap-1" title="Superficie construida">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>{property.size_m2} m²</span>
              </div>
            )}
            {property.bedrooms != null && (
              <div className="flex items-center gap-1" title="Dormitorios">
                <Bed className="w-3.5 h-3.5 text-slate-400" />
                <span>{property.bedrooms} hab.</span>
              </div>
            )}
            {property.floor && (
              <span className="truncate max-w-[90px]" title={property.floor}>
                {property.floor}
              </span>
            )}
            {property.has_elevator != null && (
              <span
                className={`ml-auto text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  property.has_elevator
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    : 'text-slate-400'
                }`}
              >
                {property.has_elevator ? 'Ascensor' : 'Sin asc.'}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
