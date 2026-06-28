import { useEffect, useRef } from 'react';
import { shouldSendLocationUpdate } from '@delivery/utils/trackingInterval';
import { getOrderAcceptId, getOrderMongoId } from '@food/utils/orderDispatchId';

/**
 * @deprecated Prefer DeliveryNotificationContext.emitLocation from DeliveryHomeV2.
 * Dispatches deliveryLocationShare events for the shared delivery socket to consume.
 */
export const useLocationSharing = (orderId, enabled = false) => {
  const watchIdRef = useRef(null);
  const isSharingRef = useRef(false);
  const lastSentAtRef = useRef(0);
  const lastCoordRef = useRef(null);

  const startSharing = () => {
    if (!orderId || isSharingRef.current) return;
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

        window.dispatchEvent(
          new CustomEvent('deliveryLocationShare', {
            detail: {
              orderId: getOrderMongoId({ orderId, _id: orderId }) || getOrderAcceptId({ orderId }),
              lat: latitude,
              lng: longitude,
              heading: heading || 0,
              speed: speed || 0,
              accuracy: accuracy || null,
              timestamp: now,
              status: 'on_the_way',
            },
          }),
        );
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
