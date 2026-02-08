import { useEffect } from 'react';

/**
 * Hook to set the page title dynamically
 * @param {string} title - The page title (without the app name suffix)
 * @param {boolean} includeAppName - Whether to include "| GrindMate" suffix (default: true)
 */
export function usePageTitle(title, includeAppName = true) {
  useEffect(() => {
    const appName = 'GrindMate';
    const fullTitle = includeAppName && title ? `${title} | ${appName}` : title || appName;
    document.title = fullTitle;
    
    // Cleanup: reset to default on unmount
    return () => {
      document.title = appName;
    };
  }, [title, includeAppName]);
}
