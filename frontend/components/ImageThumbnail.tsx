'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageThumbnailProps {
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

/**
 * ImageThumbnail Component
 * Lazy-loaded image component with blur placeholder and error handling
 */
export function ImageThumbnail({
  src,
  alt,
  width = 120,
  height = 90,
  className,
  priority = false,
}: ImageThumbnailProps) {
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Show placeholder if no image or error
  if (!src || isError) {
    return (
      <div
        className={cn(
          'bg-muted flex items-center justify-center rounded-md',
          className
        )}
        style={{ width, height }}
        aria-label={alt}
      >
        <svg
          className="w-8 h-8 text-muted-foreground/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        isLoading && 'animate-pulse',
        className
      )}
      style={{ width, height }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${width}px`}
        priority={priority}
        className={cn(
          'object-cover transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => setIsError(true)}
      />
      
      {/* Blur placeholder while loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <svg
            className="w-6 h-6 text-muted-foreground/30 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

export default ImageThumbnail;
