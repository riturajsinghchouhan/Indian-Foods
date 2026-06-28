/** Single writer for location-related localStorage keys. */

export function readStoredUserLocation() {
  try {
    const raw = localStorage.getItem('userLocation');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
      return parsed;
    }
  } catch (_) {}
  return null;
}

export function persistUserLocation(location, { mode } = {}) {
  if (!location?.latitude || !location?.longitude) return;
  try {
    localStorage.setItem('userLocation', JSON.stringify(location));
    localStorage.setItem('userLat', String(location.latitude));
    localStorage.setItem('userLng', String(location.longitude));
    if (mode === 'saved' || mode === 'current') {
      localStorage.setItem('deliveryAddressMode', mode);
    }
  } catch (_) {}
}

export function clearStoredUserLocation() {
  try {
    localStorage.removeItem('userLocation');
    localStorage.removeItem('userLat');
    localStorage.removeItem('userLng');
  } catch (_) {}
}

export function readDeliveryAddressMode() {
  try {
    return localStorage.getItem('deliveryAddressMode') || 'saved';
  } catch (_) {
    return 'saved';
  }
}

export function notifyLocationUpdated(location) {
  if (!location) return;
  window.dispatchEvent(new CustomEvent('userLocationUpdated', { detail: { location } }));
}

export function notifyDeliveryModeUpdated(mode) {
  window.dispatchEvent(new CustomEvent('deliveryAddressModeUpdated', { detail: { mode } }));
}
