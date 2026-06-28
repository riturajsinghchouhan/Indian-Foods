/**
 * Geo utilities — haversine straight-line distance (free, always available).
 * Road distance / traffic ETA use Google Distance Matrix on the backend with Redis cache.
 */

const EARTH_RADIUS_M = 6371000;

export function toRadians(deg) {
    return (deg * Math.PI) / 180;
}

export function haversineMeters(lat1, lng1, lat2, lng2) {
    const a1 = Number(lat1);
    const b1 = Number(lng1);
    const a2 = Number(lat2);
    const b2 = Number(lng2);
    if (![a1, b1, a2, b2].every(Number.isFinite)) return null;

    const dLat = toRadians(a2 - a1);
    const dLng = toRadians(b2 - b1);
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(a1)) * Math.cos(toRadians(a2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return EARTH_RADIUS_M * c;
}

export function estimateEtaSeconds(distanceMeters, speedKmh = 25) {
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return 0;
    const speedMs = (speedKmh * 1000) / 3600;
    return Math.round(distanceMeters / speedMs);
}

export function roundCoord(value, digits = 5) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const p = 10 ** digits;
    return Math.round(n * p) / p;
}

export function coordCacheKey(lat, lng, digits = 5) {
    const rLat = roundCoord(lat, digits);
    const rLng = roundCoord(lng, digits);
    if (rLat === null || rLng === null) return null;
    return `${rLat},${rLng}`;
}

export function minMovementForSpeed(speedMs = 0) {
    const speed = Number(speedMs) || 0;
    if (speed > 8) return 15;
    if (speed > 3) return 10;
    return 5;
}

export function dynamicTrackingIntervalMs(speedMs = 0, distanceSinceLastM = 0) {
    const speed = Math.max(0, Number(speedMs) || 0);
    const dist = Math.max(0, Number(distanceSinceLastM) || 0);

    if (speed > 10) return 2000;
    if (speed > 5) return 3000;
    if (speed > 1) return 5000;
    if (dist < 5) return 15000;
    return 8000;
}

export function shouldBroadcastLocation({ speedMs = 0, distanceM = 0, elapsedMs = 0, lastBroadcastMs = 0 }) {
    const minDist = minMovementForSpeed(speedMs);
    const minInterval = dynamicTrackingIntervalMs(speedMs, distanceM);
    const sinceLast = Math.max(0, elapsedMs - lastBroadcastMs);
    if (distanceM >= minDist) return true;
    if (sinceLast >= minInterval && distanceM >= 3) return true;
    if (sinceLast >= minInterval * 2) return true;
    return false;
}
