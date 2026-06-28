import { API_BASE_URL } from '@food/api/config';

/**
 * Socket.IO server runs on the HTTP origin (not /api/v1).
 * e.g. VITE_API_BASE_URL=http://localhost:5000/api/v1 → http://localhost:5000
 */
export function resolveSocketOrigin() {
  let backendUrl = API_BASE_URL || '';
  if (!String(backendUrl).trim()) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }

  try {
    const base = String(backendUrl).startsWith('http')
      ? undefined
      : typeof window !== 'undefined'
        ? window.location.origin
        : undefined;
    return new URL(backendUrl, base).origin;
  } catch {
    const stripped = String(backendUrl)
      .replace(/\/api\/v\d+\/?$/i, '')
      .replace(/\/api\/?$/i, '')
      .replace(/\/+$/, '');

    if (stripped.startsWith('http')) return stripped;
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
}

export function isValidSocketOrigin(origin) {
  return Boolean(origin && String(origin).startsWith('http'));
}
