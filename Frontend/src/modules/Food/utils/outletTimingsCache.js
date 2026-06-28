import { restaurantAPI } from "@food/api";

const cache = new Map();
const inFlight = new Map();

/** Session cache + in-flight dedupe for outlet timings (viewport-deferred fetch). */
export async function fetchOutletTimingsOnce(restaurantId) {
  const id = String(restaurantId || "").trim();
  if (!id) return null;
  if (cache.has(id)) return cache.get(id);
  if (inFlight.has(id)) return inFlight.get(id);

  const promise = (async () => {
    try {
      const response = await restaurantAPI.getOutletTimingsByRestaurantId(id);
      const timings =
        response?.data?.data?.outletTimings ||
        response?.data?.outletTimings ||
        null;
      cache.set(id, timings);
      return timings;
    } catch {
      cache.set(id, null);
      return null;
    } finally {
      inFlight.delete(id);
    }
  })();

  inFlight.set(id, promise);
  return promise;
}

export function primeOutletTimingsCache(restaurantId, timings) {
  const id = String(restaurantId || "").trim();
  if (!id || timings == null) return;
  cache.set(id, timings);
}
