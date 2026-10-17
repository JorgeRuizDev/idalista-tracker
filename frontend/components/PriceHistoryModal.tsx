'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PropertyDetailResponse } from '@/types/property';
import { getPropertyPriceHistory } from '@/lib/db';
import { cn } from '@/lib/utils';

interface PriceHistoryModalProps {
  idealistaId: string | null;
  title: string;
  currentPrice: number;
  onClose: () => void;
}

function formatPrice(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toString();
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          {new Intl.NumberFormat('de-DE').format(payload[0].value)} €
        </p>
      </div>
    );
  }
  return null;
}

export function PriceHistoryModal({ idealistaId, title, currentPrice, onClose }: PriceHistoryModalProps) {
  const [data, setData] = useState<PropertyDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!idealistaId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getPropertyPriceHistory(idealistaId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load price history');
    } finally {
      setLoading(false);
    }
  }, [idealistaId]);

  useEffect(() => {
    if (idealistaId) {
      fetchHistory();
    }
  }, [idealistaId, fetchHistory]);

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

  const chartData = data?.price_history
    ? [...data.price_history]
        .sort((a, b) => new Date(a.change_date).getTime() - new Date(b.change_date).getTime())
        .map((entry) => ({
          date: new Date(entry.change_date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          }),
          price: entry.new_price,
          changeType: entry.change_type,
          oldPrice: entry.old_price,
        }))
    : [];

  const getChangeBadge = (changeType: string, oldPrice: number | null) => {
    if (changeType === 'initial') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          Initial
        </span>
      );
    }
    if (changeType === 'drop' && oldPrice !== null) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          Drop
        </span>
      );
    }
    if (changeType === 'update' && oldPrice !== null) {
      const diff = oldPrice - (data?.current_price || 0);
      if (diff > 0) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Drop
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Increase
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        Update
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">
              Price History
            </h2>
            <p className="text-sm text-muted-foreground truncate mt-0.5">{title}</p>
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
                onClick={fetchHistory}
                className="mt-3 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
              >
                Retry
              </button>
            </div>
          )}

          {data && !loading && !error && (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Price Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Current</p>
                  <p className="text-lg font-bold text-foreground">
                    {new Intl.NumberFormat('de-DE').format(data.current_price)} €
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Original</p>
                  <p className="text-lg font-bold text-foreground">
                    {new Intl.NumberFormat('de-DE').format(data.original_price)} €
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Changes</p>
                  <p className="text-lg font-bold text-foreground">
                    {data.price_history_count}
                  </p>
                </div>
              </div>

              {/* Mini Price Chart */}
              {chartData.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Price Trend</h3>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatPrice(v)}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* History Table */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Change Log</h3>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Old Price</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">New Price</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...data.price_history]
                        .sort((a, b) => new Date(b.change_date).getTime() - new Date(a.change_date).getTime())
                        .map((entry) => {
                          const diff = entry.old_price !== null ? entry.new_price - entry.old_price : 0;
                          return (
                            <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2.5 text-foreground whitespace-nowrap">
                                {new Date(entry.change_date).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="px-4 py-2.5">{getChangeBadge(entry.change_type, entry.old_price)}</td>
                              <td className="px-4 py-2.5 text-right text-muted-foreground">
                                {entry.old_price !== null
                                  ? `${new Intl.NumberFormat('de-DE').format(entry.old_price)} €`
                                  : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right text-foreground font-medium">
                                {new Intl.NumberFormat('de-DE').format(entry.new_price)} €
                              </td>
                              <td className={cn(
                                'px-4 py-2.5 text-right font-medium',
                                diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-600' : 'text-muted-foreground'
                              )}>
                                {entry.old_price !== null
                                  ? `${diff >= 0 ? '+' : ''}${new Intl.NumberFormat('de-DE').format(diff)} €`
                                  : '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
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

export default PriceHistoryModal;
