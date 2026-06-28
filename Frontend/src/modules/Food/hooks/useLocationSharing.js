import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { API_BASE_URL } from '@food/api/config';
import { shouldSendLocationUpdate } from '@delivery/utils/trackingInterval';

function getDeliveryAuthToken() {
  return (
    localStorage.getItem('delivery_accessToken') ||
    localStorage.getItem('accessToken') ||
    null
  );
}

/**
 * Food delivery rider live location sharing (socket-only).
 * Firebase / HTTP per-tick writes removed — backend persists from socket.
 */
export const useLocationSharing = (orderId, enabled = false) => {
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const isSharingRef = useRef(false);
  const lastSentAtRef = useRef(0);
  const lastCoordRef = useRef(null);
  const deliveryIdRef = useRef(
    localStorage.getItem('deliveryPartnerId') ||
      localStorage.getItem('deliveryPartnerMongoId') ||
      localStorage.getItem('deliveryBoyId') ||
      '',
  );

  const backendUrl = API_BASE_URL
    ? API_BASE_URL.replace('/api/v1', '').replace('/api', '')
    : '';

  const startSharing = () => {
    if (!orderId || isSharingRef.current) return;
    if (!API_BASE_URL || !backendUrl) return;

    const token = getDeliveryAuthToken();

    if (!socketRef.current) {
      socketRef.current = io(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        auth: token ? { token } : undefined,
      });

      socketRef.current.on('connect', () => {
        const deliveryId = deliveryIdRef.current;
        if (deliveryId) socketRef.current.emit('join-delivery', deliveryId);
        socketRef.current.emit('join-tracking', orderId);
      });
    }

    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading, speed, accuracy } = position.coords;
        const now = Date.now();

        if (
          !shouldSendLocationUpdate({
            speedMs: speed || 0,
            lastCoord: lastCoordRef.current,
            lat: latitude,
            lng: longitude,
            lastSentAt: lastSentAtRef.current,
            now,
          })
        ) {
          return;
        }

        lastCoordRef.current = { lat: latitude, lng: longitude };
        lastSentAtRef.current = now;

        if (socketRef.current?.connected) {
          socketRef.current.emit('update-location', {
            orderId,
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
            speed: speed || 0,
            accuracy: accuracy || null,
            timestamp: now,
            status: 'on_the_way',
          });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );

    isSharingRef.current = true;
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    isSharingRef.current = false;
  };

  useEffect(() => {
    if (enabled && orderId) startSharing();
    else stopSharing();
    return () => stopSharing();
  }, [enabled, orderId]);

  useEffect(() => () => stopSharing(), []);

  return { isSharing: Boolean(enabled && orderId), startSharing, stopSharing };
};

export default useLocationSharing;
