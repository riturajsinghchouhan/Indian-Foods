import { useEffect, useRef, useState } from "react";
import {
  fetchOutletTimingsOnce,
  primeOutletTimingsCache,
} from "@food/utils/outletTimingsCache";

/**
 * Loads outlet timings when the card enters (or nears) the viewport.
 * Skips fetch when timings were already included in the restaurants list API.
 */
export function useDeferredOutletTimings(restaurantId, initialTimings = null) {
  const ref = useRef(null);
  const [outletTimings, setOutletTimings] = useState(initialTimings);
  const needsFetch = initialTimings == null && Boolean(restaurantId);

  useEffect(() => {
    setOutletTimings(initialTimings);
    if (initialTimings != null && restaurantId) {
      primeOutletTimingsCache(restaurantId, initialTimings);
    }
  }, [initialTimings, restaurantId]);

  useEffect(() => {
    if (!needsFetch) return;
    const element = ref.current;
    if (!element) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || cancelled) return;
        observer.disconnect();
        void fetchOutletTimingsOnce(restaurantId).then((timings) => {
          if (!cancelled && timings) setOutletTimings(timings);
        });
      },
      { root: null, rootMargin: "240px 0px", threshold: 0.01 },
    );

    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [needsFetch, restaurantId]);

  return { ref, outletTimings };
}
