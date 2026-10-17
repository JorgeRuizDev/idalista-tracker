'use client';

import { useState, useRef, useEffect } from 'react';
import { SortOption } from '@/types/property';
import { SORT_OPTIONS, getSortLabel } from '@/lib/sorting';
import { cn } from '@/lib/utils';

interface SortDropdownProps {
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  className?: string;
}

/**
 * SortDropdown Component
 * Dropdown UI for selecting sort options
 */
export function SortDropdown({ sort, onSortChange, className }: SortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleSelect = (option: SortOption) => {
    onSortChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between gap-2 px-4 py-2 text-sm font-medium text-foreground bg-white border border-border rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-w-[180px]"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Sort properties"
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          {getSortLabel(sort)}
        </span>
        <svg
          className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-10 mt-1 w-full bg-white border border-border rounded-md shadow-lg"
          role="listbox"
          aria-label="Sort options"
        >
          <div className="py-1">
            {SORT_OPTIONS.map((option) => {
              const isSelected = sort.field === option.field && sort.direction === option.direction;
              return (
                <button
                  key={`${option.field}-${option.direction}`}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center justify-between',
                    isSelected && 'bg-primary/5 text-primary font-medium'
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{getSortLabel(option)}</span>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SortDropdown;
