'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getCrawlHistoryDetail } from '@/lib/db';
import {
  CrawlHistoryDetailResponse,
  CrawlHistoryPropertySummary,
  CrawlHistoryPriceDropDetail,
  CrawlHistoryPriceIncreaseDetail,
} from '@/types/property';

interface CrawlHistoryDetailModalProps {
  date: string;
  onClose: () => void;
}

function formatCurrency(val: number): string {
  return `${val.toLocaleString('es-ES')} €`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function PropertyLink({ property }: { property: CrawlHistoryPropertySummary }) {
  return (
    <a
      href={property.property_url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-foreground hover:text-primary underline underline-offset-2"
    >
      {property.title}
    </a>
  );
}

function SectionHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={cn('inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 rounded-full text-xs font-semibold', color)}>
        {count}
      </span>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
    </div>
  );
}

export function CrawlHistoryDetailModal({ date, onClose }: CrawlHistoryDetailModalProps) {
  const [data, setData] = useState<CrawlHistoryDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCrawlHistoryDetail(date);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load crawl details');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const hasData = data && (
    data.new_properties.length > 0 ||
    data.price_drops.length > 0 ||
    data.price_increases.length > 0 ||
    data.new_missing.length > 0 ||
    data.new_sold.length > 0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground">Crawl Details</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{formatDate(date)}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading && (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={fetchDetail}
                className="mt-3 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          )}

          {data && !loading && !error && !hasData && (
            <div className="p-12 text-center">
              <p className="text-muted-foreground text-sm">No crawl activity on this date.</p>
            </div>
          )}

          {data && !loading && !error && hasData && (
            <div className="p-4 sm:p-6 space-y-6">
              {/* New Properties */}
              {data.new_properties.length > 0 && (
                <div>
                  <SectionHeader title="New Properties" count={data.new_properties.length} color="bg-blue-50 text-blue-700" />
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Title</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Location</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.new_properties.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 max-w-[300px] truncate">
                              <PropertyLink property={p} />
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{p.location}</td>
                            <td className="px-4 py-2.5 text-right text-foreground font-medium">{formatCurrency(p.current_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Price Drops */}
              {data.price_drops.length > 0 && (
                <div>
                  <SectionHeader title="Price Drops" count={data.price_drops.length} color="bg-red-50 text-red-700" />
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Title</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Old Price</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">New Price</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Drop</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.price_drops.map((p, i) => (
                          <tr key={`${p.id}-${i}`} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 max-w-[250px] truncate">
                              <PropertyLink property={p} />
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                              {p.old_price != null ? formatCurrency(p.old_price) : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-right text-foreground font-medium">{formatCurrency(p.new_price ?? p.current_price)}</td>
                            <td className="px-4 py-2.5 text-right text-green-600 font-medium">
                              {p.drop_amount != null ? `-${formatCurrency(p.drop_amount)}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Price Increases */}
              {data.price_increases.length > 0 && (
                <div>
                  <SectionHeader title="Price Increases" count={data.price_increases.length} color="bg-green-50 text-green-700" />
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Title</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Old Price</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">New Price</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Increase</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.price_increases.map((p, i) => (
                          <tr key={`${p.id}-${i}`} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 max-w-[250px] truncate">
                              <PropertyLink property={p} />
                            </td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                              {p.old_price != null ? formatCurrency(p.old_price) : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-right text-foreground font-medium">{formatCurrency(p.new_price ?? p.current_price)}</td>
                            <td className="px-4 py-2.5 text-right text-red-600 font-medium">
                              {p.increase_amount != null ? `+${formatCurrency(p.increase_amount)}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* New Missing (inactive) */}
              {data.new_missing.length > 0 && (
                <div>
                  <SectionHeader title="Went Inactive (Missing)" count={data.new_missing.length} color="bg-gray-100 text-gray-600" />
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Title</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Location</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Last Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.new_missing.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 max-w-[300px] truncate">
                              <PropertyLink property={p} />
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{p.location}</td>
                            <td className="px-4 py-2.5 text-right text-foreground font-medium">{formatCurrency(p.current_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* New Sold */}
              {data.new_sold.length > 0 && (
                <div>
                  <SectionHeader title="Marked as Sold" count={data.new_sold.length} color="bg-amber-50 text-amber-700" />
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Title</th>
                          <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Location</th>
                          <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Last Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.new_sold.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 max-w-[300px] truncate">
                              <PropertyLink property={p} />
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{p.location}</td>
                            <td className="px-4 py-2.5 text-right text-foreground font-medium">{formatCurrency(p.current_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-white border border-border rounded-md hover:bg-muted transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrawlHistoryDetailModal;
