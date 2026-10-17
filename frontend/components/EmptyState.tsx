'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onClearFilters?: () => void;
  className?: string;
}

/**
 * EmptyState Component
 * Displayed when no properties match the current filters
 */
export function EmptyState({
  title = 'No properties found',
  description = 'Try adjusting your filters to see more results.',
  onClearFilters,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-16 h-16 mb-4 text-muted-foreground/50">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4m0 0v4m0-4h4m-4 0H8"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {onClearFilters && (
        <button
          onClick={onClearFilters}
          className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

export default EmptyState;
