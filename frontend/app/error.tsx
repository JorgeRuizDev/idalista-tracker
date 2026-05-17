"use client";

/**
 * Error Boundary Component
 * Catches database connection failures and other errors
 */

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('Page error:', error);
  }, [error]);

  const isDatabaseError = error.message?.includes('database') || 
                          error.message?.includes('SQLite') ||
                          error.name === 'DatabaseError';

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Something went wrong
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {isDatabaseError 
            ? "Unable to connect to the property database. Please ensure the database file exists and is accessible."
            : "An unexpected error occurred while loading the property data."
          }
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-muted rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-medium text-muted-foreground mb-1">Error details:</p>
            <code className="text-xs text-red-600 break-all">
              {error.message}
            </code>
          </div>
        )}
        
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try again
        </button>
      </div>
    </main>
  );
}
