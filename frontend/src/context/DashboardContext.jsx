import React, { createContext, useContext, useRef, useCallback } from 'react';

/**
 * DashboardContext
 *
 * Caches dashboard data (sections, subjects, analytics) so that navigating
 * away from the teacher dashboard and returning does NOT trigger a full
 * data reload unless a mutating page (e.g. Attendance) explicitly invalidates
 * the cache via `invalidateDashboardCache()`.
 *
 * The cache is stored in a ref (not state), so updating it never causes
 * an unnecessary re-render of the provider itself.
 */

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  // Cache lives in a ref so it persists across mounts/unmounts of child routes
  // without ever causing the provider to re-render.
  const cacheRef = useRef({
    isStale: true,          // Start stale so first load always fetches
    sections: [],
    selectedSectionId: '',
    subjects: [],
    analytics: null,
  });

  /** Read the entire cache snapshot. */
  const getCache = useCallback(() => cacheRef.current, []);

  /** Write a partial update into the cache and mark it as fresh. */
  const setCache = useCallback((updates) => {
    cacheRef.current = { ...cacheRef.current, ...updates, isStale: false };
  }, []);

  /** Mark the cache as stale so the next dashboard mount will re-fetch. */
  const invalidateDashboardCache = useCallback(() => {
    cacheRef.current = { ...cacheRef.current, isStale: true };
  }, []);

  return (
    <DashboardContext.Provider value={{ getCache, setCache, invalidateDashboardCache }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used within a DashboardProvider');
  return ctx;
}
