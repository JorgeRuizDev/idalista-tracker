/**
 * PropertyCard Component
 * Displays individual property details
 */

import { Property } from '@/types/property';
import { formatCurrency, formatSize, formatBedrooms, capitalize, truncate } from '@/lib/utils';

interface PropertyCardProps {
  property: Property;
}

/**
 * Get status badge color based on property status
 */
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

export function PropertyCard({ property }: PropertyCardProps) {
  const displayTitle = truncate(property.title, 100);
  const displayType = capitalize(property.property_type);
  
  return (
    <article className="group bg-white rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-4 sm:p-5">
        {/* Header: Title and Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
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
        </div>
        
        {/* Location */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
          {property.location}
        </p>
        
        {/* Price Section */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl sm:text-2xl font-bold text-primary">
            {formatCurrency(property.current_price)}
          </span>
          {property.price_drop_percentage && property.price_drop_percentage > 0 && (
            <span className="text-sm text-red-600 font-medium">
              ↓ {property.price_drop_percentage.toFixed(1)}%
            </span>
          )}
        </div>
        
        {/* Property Details */}
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
    </article>
  );
}

export default PropertyCard;
