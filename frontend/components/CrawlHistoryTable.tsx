'use client';

import { cn } from '@/lib/utils';
import { CrawlHistoryEntry } from '@/types/property';

interface CrawlHistoryTableProps {
  entries: CrawlHistoryEntry[];
  className?: string;
  onDateClick?: (date: string) => void;
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-';
  return `${Math.round(amount).toLocaleString('es-ES')} €`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function CrawlHistoryTable({ entries, className, onDateClick }: CrawlHistoryTableProps) {
  if (entries.length === 0) {
    return (
      <div className={cn('bg-white rounded-lg border border-border shadow-sm p-6', className)}>
        <p className="text-muted-foreground text-sm text-center">
          No crawl history data available yet.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg border border-border shadow-sm', className)}>
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Crawl History</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Daily price change activity across all crawls
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">New</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Inactive</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground text-red-600">Drops</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground text-green-600">Increases</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Drop</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Increase</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.date}
                className={cn(
                  'border-b border-border hover:bg-muted/30 transition-colors',
                  onDateClick && 'cursor-pointer'
                )}
                onClick={() => onDateClick?.(entry.date)}
                title={onDateClick ? 'Click to see details' : undefined}
              >
                <td className="py-2.5 px-4 font-medium text-foreground whitespace-nowrap">
                  {formatDate(entry.date)}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {entry.new_properties > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium text-xs">
                      {entry.new_properties}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">0</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {entry.new_inactives > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium text-xs">
                      {entry.new_inactives}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">0</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {entry.price_drops > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-medium text-xs">
                      {entry.price_drops}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">0</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-right">
                  {entry.price_increases > 0 ? (
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-medium text-xs">
                      {entry.price_increases}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">0</span>
                  )}
                </td>
                <td className="py-2.5 px-4 text-right text-red-600 font-medium">
                  {formatCurrency(entry.avg_drop_amount)}
                </td>
                <td className="py-2.5 px-4 text-right text-green-600 font-medium">
                  {formatCurrency(entry.avg_increase_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CrawlHistoryTable;
