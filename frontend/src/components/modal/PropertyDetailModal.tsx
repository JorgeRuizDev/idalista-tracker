import { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Home,
  MapPin,
  X,
} from 'lucide-react';
import type { DetailStatus, PriceHistoryEntry, Property, PropertySnapshot } from '../../types/property';
import { api } from '../../services/api';

interface PropertyDetailModalProps {
  property: Property | null;
  onClose: () => void;
}

export function PropertyDetailModal({ property, onClose }: PropertyDetailModalProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [detailedHistory, setDetailedHistory] = useState<PriceHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [snapshot, setSnapshot] = useState<PropertySnapshot | null>(null);
  const [detailStatus, setDetailStatus] = useState<DetailStatus | undefined>(property?.detail_status);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  useEffect(() => {
    setActivePhotoIndex(0);
    setSnapshot(null);
    if (!property) return;

    setDetailStatus(property.detail_status);

    // 1. Load price history
    if (property.price_history && property.price_history.length > 0) {
      setDetailedHistory(property.price_history);
    } else {
      setLoadingHistory(true);
      api
        .getPropertyDetail(property.idealista_id)
        .then((detail) => {
          if (detail.price_history) {
            setDetailedHistory(detail.price_history);
          }
        })
        .catch(() => {
          // ignore or keep empty
        })
        .finally(() => setLoadingHistory(false));
    }

    // 2. Load property snapshot if available
    setLoadingSnapshot(true);
    const identifier = property.id || property.idealista_id;
    api
      .getPropertySnapshot(identifier)
      .then((res) => {
        if (res.detail_status) {
          setDetailStatus(res.detail_status);
        }
        if (res.snapshot) {
          setSnapshot(res.snapshot);
        }
      })
      .catch(() => {
        // Not yet crawled or 404
      })
      .finally(() => setLoadingSnapshot(false));
  }, [property]);

  // Determine photo list (prefer snapshot local photos if completed)
  const proxyEndpoint = property?.idealista_id
    ? `/api/v1/properties/${property.idealista_id}/image`
    : null;

  const [failedPhotoIndices, setFailedPhotoIndices] = useState<Set<number>>(new Set());
  const [modalImgFailed, setModalImgFailed] = useState<boolean>(false);

  // Derive photos list directly from snapshot or property
  const basePhotos: string[] =
    snapshot?.photos && snapshot.photos.length > 0
      ? snapshot.photos.map((p) => {
          if (p.local_url) return p.local_url;
          if (p.local_file_path) {
            return p.local_file_path.startsWith('/') || p.local_file_path.startsWith('http')
              ? p.local_file_path
              : `/media/${p.local_file_path}`;
          }
          return p.original_url;
        })
      : property?.photos && property.photos.length > 0
      ? property.photos
      : proxyEndpoint
      ? [proxyEndpoint]
      : [];

  const photos = basePhotos.map((url, idx) => {
    if (failedPhotoIndices.has(idx) && proxyEndpoint && url !== proxyEndpoint) {
      return proxyEndpoint;
    }
    return url;
  });

  // Reset indices when property changes
  useEffect(() => {
    setFailedPhotoIndices(new Set());
    setModalImgFailed(false);
    setActivePhotoIndex(0);
  }, [property?.idealista_id]);

  // Keyboard navigation for closing and photo browsing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) => (photos.length > 0 ? (prev === 0 ? photos.length - 1 : prev - 1) : 0));
      } else if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) => (photos.length > 0 ? (prev === photos.length - 1 ? 0 : prev + 1) : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, photos.length]);

  if (!property) return null;

  const currentPhoto = photos[activePhotoIndex] || null;
  const isSold = property.status === 'sold';
  const hasDiscount = property.discount_amount > 0;

  const handleModalPhotoError = () => {
    if (proxyEndpoint && currentPhoto !== proxyEndpoint) {
      setFailedPhotoIndices((prev) => new Set(prev).add(activePhotoIndex));
    } else {
      setModalImgFailed(true);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 truncate pr-4">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                isSold
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isSold && <Flame className="w-3.5 h-3.5" />}
              {isSold ? 'VENDIDO' : 'Activo'}
            </span>

            {/* Detail Snapshot Status Pill */}
            {detailStatus === 'completed' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ficha completa</span>
              </span>
            )}
            {detailStatus === 'pending' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Clock className="w-3.5 h-3.5" />
                <span>Pendiente de análisis</span>
              </span>
            )}
            {detailStatus === 'discarded' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                <span>Descartado</span>
              </span>
            )}
            {detailStatus === 'legacy' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <span>Histórico</span>
              </span>
            )}

            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Ref: {property.idealista_id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={property.property_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
              title="Abrir anuncio en Idealista"
            >
              <span>Idealista</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {/* Photo Gallery & Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Photo Carousel */}
            <div className="space-y-2">
              <div className="relative aspect-[4/3] rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-800">
                {currentPhoto && !modalImgFailed ? (
                  <img
                    src={currentPhoto}
                    alt={property.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={handleModalPhotoError}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Home className="w-12 h-12 mb-2 opacity-40" />
                    <span className="text-sm font-medium">Sin imagen disponible</span>
                  </div>
                )}

                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActivePhotoIndex((prev) =>
                          prev === 0 ? photos.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors backdrop-blur-sm"
                      aria-label="Foto anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActivePhotoIndex((prev) =>
                          prev === photos.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 text-white hover:bg-slate-900 transition-colors backdrop-blur-sm"
                      aria-label="Foto siguiente"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-900/80 text-white backdrop-blur-sm">
                      {activePhotoIndex + 1} / {photos.length}
                    </div>
                  </>
                )}
              </div>

              {/* Photo thumbnails row */}
              {photos.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {photos.map((ph, idx) => (
                    <button
                      key={ph + idx}
                      type="button"
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                        activePhotoIndex === idx
                          ? 'border-indigo-600 scale-105'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={ph}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Details & Pricing Card */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span>{snapshot?.neighborhood || property.zone}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {property.title}
                </h2>
                {property.address && property.address !== property.title && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {property.address}
                  </p>
                )}
              </div>

              {/* Price Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {property.current_price.toLocaleString('es-ES')} €
                  </span>
                  {property.price_per_m2 && (
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                      {property.price_per_m2.toLocaleString('es-ES')} €/m²
                    </span>
                  )}
                </div>

                {hasDiscount && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-sm line-through text-slate-400 dark:text-slate-500 tabular-nums">
                      Precio original: {property.original_price.toLocaleString('es-ES')} €
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-500 text-white">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      -{property.discount_pct}% (-{property.discount_amount.toLocaleString('es-ES')} €)
                    </span>
                  </div>
                )}
              </div>

              {/* Sales Key Indicators */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="block text-slate-500 dark:text-slate-400 font-medium mb-1">
                    {isSold ? 'Tiempo hasta Venta' : 'Días en Mercado'}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-sm">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>{property.days_on_market != null ? `${property.days_on_market} días` : '—'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="block text-slate-500 dark:text-slate-400 font-medium mb-1">
                    {isSold ? 'Fecha de Venta' : 'Primera Detección'}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-sm">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>{formatDate(isSold ? property.sold_at : property.first_seen_at)}</span>
                  </div>
                </div>
              </div>

              {/* Physical Attributes Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded-xl bg-slate-100/60 dark:bg-slate-800/60">
                  <span className="block text-slate-400 text-[11px]">Superficie</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {property.size_m2 ? `${property.size_m2} m²` : '—'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-100/60 dark:bg-slate-800/60">
                  <span className="block text-slate-400 text-[11px]">Habitaciones</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {property.bedrooms ? `${property.bedrooms} hab.` : '—'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-100/60 dark:bg-slate-800/60">
                  <span className="block text-slate-400 text-[11px]">Planta</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate block">
                    {property.floor || (property.has_elevator ? 'Con ascensor' : '—')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Description Section */}
          {loadingSnapshot ? (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-400 italic">Cargando detalles de la ficha...</p>
            </div>
          ) : snapshot?.full_description ? (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <span>Descripción Completa</span>
              </h3>
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                {snapshot.full_description}
              </div>
            </div>
          ) : null}

          {/* Structured Features & Equipment Tags */}
          {snapshot?.features && Object.keys(snapshot.features).length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                Características y Equipamiento
              </h3>
              <div className="space-y-3">
                {Object.entries(snapshot.features).map(([groupTitle, items]) => {
                  const list: string[] = Array.isArray(items)
                    ? items.map(String)
                    : typeof items === 'object' && items !== null
                    ? Object.entries(items).map(([k, v]) => `${k}: ${v}`)
                    : [String(items)];

                  if (list.length === 0) return null;

                  return (
                    <div key={groupTitle}>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        {groupTitle}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {list.map((feat, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chronological Price History Timeline */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span>Historial Cronológico de Precios</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                {detailedHistory.length} cambios
              </span>
            </h3>

            {loadingHistory ? (
              <p className="text-xs text-slate-400">Cargando historial detallado...</p>
            ) : detailedHistory.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                No se registraron cambios de precio en este inmueble.
              </p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {detailedHistory.map((item, idx) => {
                  const isDrop = item.old_price != null && item.new_price < item.old_price;
                  const isIncrease = item.old_price != null && item.new_price > item.old_price;
                  const isInitial = item.change_type === 'initial' || idx === detailedHistory.length - 1;
                  const diff = item.old_price ? item.old_price - item.new_price : 0;
                  const diffPct = item.old_price ? Math.abs(roundVal(((item.new_price - item.old_price) / item.old_price) * 100)) : 0;

                  return (
                    <div key={item.id ?? idx} className="relative flex items-start justify-between gap-4">
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                          isDrop
                            ? 'bg-amber-500'
                            : isIncrease
                            ? 'bg-rose-500'
                            : 'bg-indigo-500'
                        }`}
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                            {item.new_price.toLocaleString('es-ES')} €
                          </span>
                          {isDrop && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              -{diffPct}% (-{Math.abs(diff).toLocaleString('es-ES')} €)
                            </span>
                          )}
                          {isIncrease && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              +{diffPct}% (+{Math.abs(diff).toLocaleString('es-ES')} €)
                            </span>
                          )}
                          {isInitial && (
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              (Precio de salida)
                            </span>
                          )}
                        </div>
                        {item.old_price != null && (
                          <span className="text-xs text-slate-400 line-through tabular-nums">
                            {item.old_price.toLocaleString('es-ES')} €
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                        {formatDate(item.change_date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function roundVal(n: number) {
  return Math.round(n * 10) / 10;
}
