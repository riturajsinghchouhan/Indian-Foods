import { useEffect, useRef, useState } from 'react';
import { userAPI } from '@food/api';
import {
  acquireUserSocket,
  releaseUserSocket,
  joinOrderTrackingRooms,
  leaveOrderTrackingRooms,
  subscribeLocationUpdates,
} from '@food/utils/userSocketManager';

function useFoodUserId(enabled) {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const response = await userAPI.getProfile();
        const user = response.data?.data?.user;
        const id = user?._id?.toString() || user?.userId || user?.id;
        if (!cancelled && id) setUserId(String(id));
      } catch {
        // guest / logged out
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return userId;
}

/**
 * Subscribe to live rider location for order tracking (Food user map).
 * Uses the shared user socket — no extra connection or Firebase reads.
 */
export function useOrderLocationSubscription(orderIds = [], { enabled = true } = {}) {
  const userId = useFoodUserId(enabled);
  const idsKey = [...new Set(orderIds.map((id) => String(id || '').trim()).filter(Boolean))].join('|');

  useEffect(() => {
    if (!enabled || !userId || !idsKey) return undefined;

    const ids = idsKey.split('|').filter(Boolean);
    acquireUserSocket(userId);
    joinOrderTrackingRooms(ids);

    return () => {
      leaveOrderTrackingRooms(ids);
      releaseUserSocket();
    };
  }, [enabled, userId, idsKey]);

  return { subscribeLocationUpdates, userId, isReady: Boolean(userId) };
}

export default useOrderLocationSubscription;
