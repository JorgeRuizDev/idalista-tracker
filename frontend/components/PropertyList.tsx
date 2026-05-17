/**
 * PropertyList Component
 * Composes PropertyCard and Pagination
 */

import { Property, PaginationInfo } from '@/types/property';
import { PropertyCard } from './PropertyCard';
import { Pagination } from './Pagination';

interface PropertyListProps {
  properties: Property[];
  pagination: PaginationInfo;
}

export function PropertyList({ properties, pagination }: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No properties found</h3>
        <p className="text-sm text-muted-foreground">
          There are no properties available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {((pagination.current_page - 1) * pagination.page_size) + 1} - {Math.min(pagination.current_page * pagination.page_size, pagination.total_properties)} of {pagination.total_properties} properties
        </p>
      </div>

      {/* Property list */}
      <div className="space-y-4">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="pt-6 border-t border-border">
          <Pagination
            currentPage={pagination.current_page}
            totalPages={pagination.total_pages}
            hasNext={pagination.has_next}
            hasPrevious={pagination.has_previous}
          />
        </div>
      )}
    </div>
  );
}

export default PropertyList;
