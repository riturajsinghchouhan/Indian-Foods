import { getHaversineDistance } from './geo';

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

export function shouldSendLocationUpdate({ speedMs = 0, lastCoord, lat, lng, lastSentAt = 0, now = Date.now() }) {
  const distanceM = lastCoord
    ? (getHaversineDistance(lastCoord.lat, lastCoord.lng, lat, lng) || 0)
    : 9999;
  const minDist = minMovementForSpeed(speedMs);
  const minInterval = dynamicTrackingIntervalMs(speedMs, distanceM);
  const elapsed = now - lastSentAt;
  if (distanceM >= minDist) return true;
  if (elapsed >= minInterval && distanceM >= 3) return true;
  if (elapsed >= minInterval * 2) return true;
  return false;
}
