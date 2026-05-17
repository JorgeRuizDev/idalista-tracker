/**
 * Pagination Component
 * Previous/Next buttons and page numbers
 */

import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  baseUrl?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  hasNext,
  hasPrevious,
  baseUrl = '/'
}: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const buildUrl = (page: number): string => {
    if (page === 1) return baseUrl;
    return `${baseUrl}?page=${page}`;
  };

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      {/* Previous Button */}
      <a
        href={hasPrevious ? buildUrl(currentPage - 1) : '#'}
        className={cn(
          'inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
          'min-w-[80px] sm:min-w-[100px]',
          hasPrevious
            ? 'text-foreground bg-white border border-border hover:bg-muted'
            : 'text-muted-foreground bg-muted cursor-not-allowed pointer-events-none'
        )}
        aria-disabled={!hasPrevious}
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span className="hidden sm:inline">Previous</span>
      </a>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          <span key={index}>
            {page === '...' ? (
              <span className="px-2 py-2 text-sm text-muted-foreground">...</span>
            ) : (
              <a
                href={buildUrl(page as number)}
                className={cn(
                  'inline-flex items-center justify-center min-w-[36px] sm:min-w-[40px] h-9 text-sm font-medium rounded-md transition-colors',
                  currentPage === page
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground bg-white border border-border hover:bg-muted'
                )}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </a>
            )}
          </span>
        ))}
      </div>

      {/* Next Button */}
      <a
        href={hasNext ? buildUrl(currentPage + 1) : '#'}
        className={cn(
          'inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
          'min-w-[80px] sm:min-w-[100px]',
          hasNext
            ? 'text-foreground bg-white border border-border hover:bg-muted'
            : 'text-muted-foreground bg-muted cursor-not-allowed pointer-events-none'
        )}
        aria-disabled={!hasNext}
      >
        <span className="hidden sm:inline">Next</span>
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </nav>
  );
}

export default Pagination;
