'use client';

import React, { ReactNode, useState, useEffect } from 'react';

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error) => void;
}

/**
 * Error boundary specifically for handling async errors
 * Provides retry functionality for failed operations
 */
export function AsyncErrorBoundary({ 
  children, 
  fallback,
  onError 
}: AsyncErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Reset error when children change
    setError(null);
  }, [children]);

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  // Provide error handling context to children
  const errorHandler = (error: Error) => {
    setError(error);
    if (onError) {
      onError(error);
    }
  };

  if (error) {
    if (fallback) {
      return <>{fallback(error, handleRetry)}</>;
    }

    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Operation failed
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {error.message || 'An unexpected error occurred'}
            </p>
            {retryCount > 0 && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Retry attempt {retryCount} failed
              </p>
            )}
            <button
              onClick={handleRetry}
              className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
            >
              Try again →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Clone children and inject error handler
  return (
    <>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            onError: errorHandler
          });
        }
        return child;
      })}
    </>
  );
}