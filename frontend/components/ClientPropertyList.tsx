"use client";

/**
 * Client-side Property List with Pagination
 * Handles pagination state client-side for static export compatibility
 */

import { useState, useMemo } from 'react';
import { Property, PaginatedProperties, PaginationInfo } from '@/types/property';
import { PropertyCard } from './PropertyCard';
import { Pagination } from './Pagination';

interface ClientPropertyListProps {
  properties: Property[];
  pageSize?: number;
}

export function ClientPropertyList({ properties, pageSize = 20 }: ClientPropertyListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Calculate pagination
  const totalProperties = properties.length;
  const totalPages = Math.ceil(totalProperties / pageSize);
  
  // Get current page properties
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return properties.slice(start, end);
  }, [properties, currentPage, pageSize]);
  
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
          Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalProperties)} of {totalProperties} properties
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
        <div className="pt-6 border-t border-border">
          <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.has_previous}
              className={`
                inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                min-w-[80px] sm:min-w-[100px]
                ${pagination.has_previous
                  ? 'text-foreground bg-white border border-border hover:bg-muted'
                  : 'text-muted-foreground bg-muted cursor-not-allowed'
                }
              `}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Previous</span>
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`
                    inline-flex items-center justify-center min-w-[36px] sm:min-w-[40px] h-9 text-sm font-medium rounded-md transition-colors
                    ${currentPage === page
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground bg-white border border-border hover:bg-muted'
                    }
                  `}
                >
                  {page}
                </button>
              ))}
            </div>
            
            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.has_next}
              className={`
                inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                min-w-[80px] sm:min-w-[100px]
                ${pagination.has_next
                  ? 'text-foreground bg-white border border-border hover:bg-muted'
                  : 'text-muted-foreground bg-muted cursor-not-allowed'
                }
              `}
            >
              <span className="hidden sm:inline">Next</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
