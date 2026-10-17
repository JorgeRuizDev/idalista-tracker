'use client';

import { cn } from '@/lib/utils';

interface PriceChangeProps {
  percentage: number | null;
  className?: string;
  showTooltip?: boolean;
  changedAt?: string;
}

/**
 * PriceChange Component
 * Displays price change indicator with color-coded arrows
 * - Green ↓ for price drops
 * - Red ↑ for price increases
 */
export function PriceChange({
  percentage,
  className,
  showTooltip = true,
  changedAt,
}: PriceChangeProps) {
  // Don't show if no price change
  if (percentage === null || percentage === undefined) {
    return null;
  }

  const isDrop = percentage > 0;
  const isIncrease = percentage < 0;
  const absPercentage = Math.abs(percentage);

  // Format tooltip text
  const tooltipText = changedAt
    ? `${isDrop ? 'Dropped' : 'Increased'} by ${absPercentage.toFixed(1)}% on ${new Date(changedAt).toLocaleDateString()}`
    : `${isDrop ? 'Dropped' : 'Increased'} by ${absPercentage.toFixed(1)}%`;

  return (
    <span
      className={cn(
        'inline-flex items-center text-sm font-medium',
        isDrop && 'text-green-600',
        isIncrease && 'text-red-600',
        className
      )}
      title={showTooltip ? tooltipText : undefined}
      aria-label={tooltipText}
    >
      {isDrop && (
        <>
          <svg
            className="w-4 h-4 mr-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          {absPercentage.toFixed(1)}%
        </>
      )}
      {isIncrease && (
        <>
          <svg
            className="w-4 h-4 mr-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
          {absPercentage.toFixed(1)}%
        </>
      )}
    </span>
  );
}

export default PriceChange;
