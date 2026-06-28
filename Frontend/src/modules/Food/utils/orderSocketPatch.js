/**
 * Merge socket order_status_update payload into existing order state
 * without a full REST refetch.
 */
export function patchOrderFromSocketPayload(prev, payload = {}) {
  if (!payload || typeof payload !== 'object') return prev;

  const orderStatus =
    payload.orderStatus || payload.status || prev?.orderStatus || prev?.status;

  const next = {
    ...(prev || {}),
    ...(orderStatus ? { status: orderStatus, orderStatus } : {}),
  };

  if (payload.deliveryState && typeof payload.deliveryState === 'object') {
    next.deliveryState = {
      ...(prev?.deliveryState || {}),
      ...payload.deliveryState,
    };
  }

  if (payload.deliveryVerification && typeof payload.deliveryVerification === 'object') {
    next.deliveryVerification = {
      ...(prev?.deliveryVerification || {}),
      ...payload.deliveryVerification,
    };
  }

  if (payload.dispatch && typeof payload.dispatch === 'object') {
    next.dispatch = {
      ...(prev?.dispatch || {}),
      ...payload.dispatch,
    };
  }

  if (payload.deliveryPartner) {
    next.deliveryPartner = {
      ...(prev?.deliveryPartner || {}),
      ...payload.deliveryPartner,
    };
  }

  if (payload.deliveryPartnerId) {
    next.deliveryPartnerId = payload.deliveryPartnerId;
  }

  if (payload.orderMongoId) next.mongoId = String(payload.orderMongoId);
  if (payload.orderId) next.orderId = String(payload.orderId);

  return next;
}

/** True when socket payload is too sparse for live tracking UI. */
export function socketPayloadNeedsRefetch(payload = {}, orderStatus) {
  const status = String(orderStatus || payload.orderStatus || '').toLowerCase();
  const liveRide = [
    'picked_up',
    'out_for_delivery',
    'reached_drop',
    'reached_pickup',
    'on_the_way',
  ].includes(status);

  if (!liveRide) return false;
  return !payload.deliveryState;
}
