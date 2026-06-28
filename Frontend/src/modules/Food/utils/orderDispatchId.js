const MONGO_ID_RE = /^[a-f0-9]{24}$/i;

/**
 * Canonical MongoDB id for accept API + lock comparisons.
 * Prefers orderMongoId / _id over display order_id.
 */
export function getOrderMongoId(order) {
  if (!order) return '';
  const candidates = [
    order.orderMongoId,
    order.order_mongo_id,
    order._id,
    order.id,
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value && MONGO_ID_RE.test(value)) return value;
  }
  return '';
}

/** Human-readable order id (ORD-xxx) when present. */
export function getOrderDisplayId(order) {
  if (!order) return '';
  return String(
    order.orderId ||
      order.order_id ||
      order.orderMongoId ||
      order._id ||
      order.id ||
      '',
  ).trim();
}

/** Id used for accept/reject API — mongo id when available. */
export function getOrderAcceptId(order) {
  return getOrderMongoId(order) || getOrderDisplayId(order);
}

export function isSameOrder(a, b) {
  if (!a || !b) return false;
  const aMongo = getOrderMongoId(a);
  const bMongo = getOrderMongoId(b);
  if (aMongo && bMongo) return aMongo === bMongo;

  const aDisplay = getOrderDisplayId(a);
  const bDisplay = getOrderDisplayId(b);
  return Boolean(aDisplay && bDisplay && aDisplay === bDisplay);
}

/** Normalize socket/poll payloads so _id and orderMongoId always match. */
export function normalizeIncomingOrder(order) {
  if (!order) return null;
  const mongoId = getOrderMongoId(order);
  const displayId = getOrderDisplayId(order);
  return {
    ...order,
    orderMongoId: mongoId || order.orderMongoId || order.order_mongo_id || undefined,
    _id: mongoId || order._id || order.id || undefined,
    orderId: displayId || order.orderId || order.order_id,
  };
}

export function getOrderAlertKey(order = {}) {
  return getOrderMongoId(order) || getOrderDisplayId(order);
}

export function upsertIncomingOrderInQueue(queue, order) {
  const normalized = normalizeIncomingOrder(order);
  if (!normalized) return Array.isArray(queue) ? queue : [];

  const list = Array.isArray(queue) ? queue : [];
  const exists = list.some((item) => isSameOrder(item, normalized));
  if (exists) {
    return list.map((item) =>
      isSameOrder(item, normalized) ? { ...item, ...normalized } : item,
    );
  }
  return [...list, normalized];
}

export function removeIncomingOrderFromQueue(queue, orderRef) {
  if (!orderRef) return Array.isArray(queue) ? queue : [];
  const list = Array.isArray(queue) ? queue : [];
  return list.filter((item) => !isSameOrder(item, orderRef));
}

export function getPrimaryIncomingOrder(queue, selectedId = '') {
  const list = Array.isArray(queue) ? queue : [];
  if (!list.length) return null;

  const selected = String(selectedId || '').trim();
  if (selected) {
    const found = list.find(
      (item) =>
        getOrderMongoId(item) === selected ||
        isSameOrder(item, { orderMongoId: selected, _id: selected }),
    );
    if (found) return found;
  }
  return list[0];
}
