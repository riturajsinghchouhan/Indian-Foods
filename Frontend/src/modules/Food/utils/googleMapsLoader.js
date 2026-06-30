import { Loader } from "@googlemaps/js-api-loader";
import { getGoogleMapsApiKey } from "./googleMapsApiKey.js";

const DEFAULT_LIBRARIES = ["places", "geometry"];

let loadPromise = null;

/**
 * Load Google Maps JS API once (web + mobile WebView).
 * @param {{ libraries?: string[] }} [options]
 * @returns {Promise<typeof google>}
 */
export async function loadGoogleMaps(options = {}) {
  if (typeof window !== "undefined" && window.google?.maps) {
    return window.google;
  }

  if (!loadPromise) {
    const libraries = options.libraries?.length
      ? options.libraries
      : DEFAULT_LIBRARIES;

    loadPromise = (async () => {
      const apiKey = await getGoogleMapsApiKey();
      if (!apiKey) {
        throw new Error("Google Maps API key is not configured");
      }

      const loader = new Loader({
        apiKey,
        version: "weekly",
        libraries,
      });

      return loader.load();
    })().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }

  return loadPromise;
}

export function isGoogleMapsLoaded() {
  return typeof window !== "undefined" && Boolean(window.google?.maps);
}
