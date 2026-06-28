import { createContext, useContext } from 'react';

export const LocationContext = createContext(null);

export function useLocationContext() {
  return useContext(LocationContext);
}

/** @deprecated Prefer useAppLocation — same context, clearer name for reads */
export function useLocationFromContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return ctx;
}
