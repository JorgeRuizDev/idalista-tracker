'use client';

import { useState } from 'react';
import { Property } from '@/types/property';
import { formatCurrency, formatSize, formatBedrooms, capitalize, truncate, formatPricePerSqM } from '@/lib/utils';
import { ImageThumbnail } from './ImageThumbnail';
import { PriceChange } from './PriceChange';
import { PriceHistoryModal } from './PriceHistoryModal';

interface PropertyCardProps {
  property: Property;
}

function getStatusColor(status: Property['status']): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'missing':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'sold':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getDaysOnMarket(property: Property): number | null {
  if (!property.first_seen_at || !property.last_seen_at) return null;
  const first = new Date(property.first_seen_at);
  const last = new Date(property.last_seen_at);
  return Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
}

export function PropertyCard({ property }: PropertyCardProps) {
  const [showPriceHistory, setShowPriceHistory] = useState(false);
  const displayTitle = truncate(property.title, 100);
  const displayType = capitalize(property.property_type);
  const pricePerSqM = formatPricePerSqM(property.current_price, property.size_m2);
  const hasDrop = property.original_price > property.current_price;
  const historyCount = property.price_history_count ?? 0;
  const isInactive = property.status === 'missing' || property.status === 'sold';
  const daysOnMarket = isInactive ? getDaysOnMarket(property) : null;

  const imageSrc = property.idealista_id
    ? `/api/v1/properties/${property.idealista_id}/image`
    : property.image_url;

  return (
    <article className="group bg-white rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-32 md:w-40 flex-shrink-0">
          <ImageThumbnail
            src={imageSrc}
            alt={property.title}
            width={160}
            height={120}
            className="w-full h-32 sm:h-full object-cover rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none"
            priority={false}
          />
        </div>

        <div className="flex-1 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="text-base sm:text-lg font-semibold text-foreground leading-tight flex-1">
              <a
                href={property.property_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline"
              >
                {displayTitle}
              </a>
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusColor(property.status)}`}>
              {capitalize(property.status)}
            </span>
            {isInactive && daysOnMarket !== null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-muted-foreground bg-gray-50 border border-gray-200 whitespace-nowrap">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {daysOnMarket}d listed
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
            {property.location}
          </p>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xl sm:text-2xl font-bold text-primary">
              {formatCurrency(property.current_price)}
            </span>
            <PriceChange
              percentage={property.price_drop_percentage}
              className="text-xs sm:text-sm"
            />
          </div>

          {/* Price drop info and price per m² */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mb-3 text-xs text-muted-foreground">
            {hasDrop && (
              <span className="inline-flex items-center gap-1">
                <span className="line-through">{formatCurrency(property.original_price)}</span>
                <span className="text-green-600 font-medium">
                  -{formatCurrency(property.original_price - property.current_price)}
                </span>
              </span>
            )}
            {pricePerSqM && (
              <span className="inline-flex items-center gap-1">
                <span>{pricePerSqM}</span>
              </span>
            )}
            {historyCount > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowPriceHistory(true);
                }}
                className="inline-flex items-center gap-1 text-muted-foreground/70 hover:text-primary transition-colors"
                title="View price history"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {historyCount} price {historyCount === 1 ? 'entry' : 'entries'}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {property.property_type && (
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {displayType}
              </span>
            )}

            {property.size_m2 && (
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                {formatSize(property.size_m2)}
              </span>
            )}

            {property.bedrooms !== null && property.bedrooms !== undefined && (
              <span className="inline-flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                {formatBedrooms(property.bedrooms)}
              </span>
            )}
          </div>
        </div>
      </div>

      {showPriceHistory && (
        <PriceHistoryModal
          idealistaId={property.idealista_id}
          title={property.title}
          currentPrice={property.current_price}
          onClose={() => setShowPriceHistory(false)}
        />
      )}
    </article>
  );
}

export default PropertyCard;
