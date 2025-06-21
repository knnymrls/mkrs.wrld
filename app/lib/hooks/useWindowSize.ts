import { useState, useEffect, useCallback } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

/**
 * Hook to get current window dimensions with debounced resize handling
 * @returns {WindowSize} Current window width and height
 */
export function useWindowSize(): WindowSize {
  // Initialize with undefined width/height so we can detect SSR
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: 0,
    height: 0,
  });

  // Debounce function to limit resize event calls
  const debounce = <T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const handleResize = useCallback(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window === 'undefined') {
      return;
    }

    // Set initial size
    handleResize();

    // Create debounced resize handler
    const debouncedHandleResize = debounce(handleResize, 150);

    // Add event listener
    window.addEventListener('resize', debouncedHandleResize);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
    };
  }, [handleResize]);

  return windowSize;
}