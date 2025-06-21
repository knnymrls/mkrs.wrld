import { useMediaQuery } from './useMediaQuery';

interface MobileDetect {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Hook to detect device type based on Tailwind CSS breakpoints
 * @returns {MobileDetect} Object with device type booleans
 */
export function useMobileDetect(): MobileDetect {
  // Using Tailwind CSS default breakpoints
  // sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
  
  const isMobileQuery = useMediaQuery('(max-width: 639px)'); // < 640px
  const isTabletQuery = useMediaQuery('(min-width: 640px) and (max-width: 1023px)'); // 640px - 1023px
  const isDesktopQuery = useMediaQuery('(min-width: 1024px)'); // >= 1024px

  return {
    isMobile: isMobileQuery,
    isTablet: isTabletQuery,
    isDesktop: isDesktopQuery,
  };
}