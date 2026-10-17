"use client";

/**
 * Client-side Property List with Pagination and Filtering
 * Handles pagination state client-side for static export compatibility
 */

import { useState, useMemo } from 'react';
import { Property, PaginatedProperties, PaginationInfo, FilterState, SortOption } from '@/types/property';
import { PropertyCard } from './PropertyCard';
import { filterProperties } from '@/lib/filters';
import { sortProperties } from '@/lib/sorting';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

interface ClientPropertyListProps {
  properties: Property[];
  pageSize?: number;
  filters?: FilterState;
  sort?: SortOption;
  onClearFilters?: () => void;
}

export function ClientPropertyList({ 
  properties, 
  pageSize = 20, 
  filters,
  sort,
  onClearFilters 
}: ClientPropertyListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Apply filters
  const filteredProperties = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return properties;
    }
    return filterProperties(properties, filters);
  }, [properties, filters]);
  
  // Apply sorting
  const sortedProperties = useMemo(() => {
    if (!sort) {
      return filteredProperties;
    }
    return sortProperties(filteredProperties, sort);
  }, [filteredProperties, sort]);
  
  // Calculate pagination
  const totalProperties = sortedProperties.length;
  const totalPages = Math.ceil(totalProperties / pageSize);
  
  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filters, sort]);
  
  // Get current page properties
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedProperties.slice(start, end);
  }, [sortedProperties, currentPage, pageSize]);
  
  const pagination: PaginationInfo = {
    current_page: currentPage,
    total_pages: totalPages,
    total_properties: totalProperties,
    page_size: pageSize,
    has_next: currentPage < totalPages,
    has_previous: currentPage > 1
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  if (properties.length === 0) {
    return (
      <EmptyState
        title="No properties found"
        description="There are no properties available at the moment."
      />
    );
  }
  
  if (filteredProperties.length === 0) {
    return (
      <EmptyState
        title="No properties match your filters"
        description="Try adjusting your filters to see more results."
        onClearFilters={onClearFilters}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalProperties)} of {totalProperties} properties
          {filters && Object.keys(filters).length > 0 && properties.length !== filteredProperties.length && (
            <span className="ml-2 text-xs">
              (filtered from {properties.length})
            </span>
          )}
        </p>
      </div>
      
      {/* Property list */}
      <div className="space-y-4">
        {paginatedProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-4 border-t border-border">
          <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.has_previous}
              className={cn(
                'inline-flex items-center justify-center px-2 py-1.5 text-xs font-medium rounded-md transition-colors min-w-[32px] h-8',
                pagination.has_previous
                  ? 'text-foreground bg-white border border-border hover:bg-muted'
                  : 'text-muted-foreground bg-muted cursor-not-allowed'
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Page Numbers */}
            {(() => {
              const pages: (number | string)[] = [];
              const maxVisible = 5;
              
              if (totalPages <= maxVisible + 2) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                if (currentPage > 3) pages.push('...');
                const start = Math.max(2, currentPage - 1);
                const end = Math.min(totalPages - 1, currentPage + 1);
                for (let i = start; i <= end; i++) pages.push(i);
                if (currentPage < totalPages - 2) pages.push('...');
                pages.push(totalPages);
              }
              
              return pages.map((page, i) =>
                page === '...' ? (
                  <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page as number)}
                    className={cn(
                      'inline-flex items-center justify-center w-8 h-8 text-xs font-medium rounded-md transition-colors',
                      currentPage === page
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground bg-white border border-border hover:bg-muted'
                    )}
                  >
                    {page}
                  </button>
                )
              );
            })()}
            
            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.has_next}
              className={cn(
                'inline-flex items-center justify-center px-2 py-1.5 text-xs font-medium rounded-md transition-colors min-w-[32px] h-8',
                pagination.has_next
                  ? 'text-foreground bg-white border border-border hover:bg-muted'
                  : 'text-muted-foreground bg-muted cursor-not-allowed'
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

export default ClientPropertyList;
