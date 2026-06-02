import { useSelector } from 'react-redux';

/**
 * A lightweight hook to read the global location state from Redux.
 * Replaces the heavy useLocation and useZone hooks in child components.
 * Guarantees that location and zoneId are always available synchronously,
 * assuming it's used underneath the <LocationGuard>.
 */
export function useAppLocation() {
  const { isLocationResolved, coords, zoneId, address } = useSelector((state) => state.location);

  return {
    isLocationResolved,
    location: coords,     // matches the { location } return from useLocation
    zoneId,               // matches { zoneId } from useZone
    address,
    // Add compatibility properties so we don't break existing code
    zoneStatus: zoneId ? 'IN_SERVICE' : 'OUT_OF_SERVICE',
    loading: !isLocationResolved,
    isOutOfService: !zoneId
  };
}
