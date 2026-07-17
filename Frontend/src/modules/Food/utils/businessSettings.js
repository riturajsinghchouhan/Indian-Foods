/**
 * Business Settings Utility
 * Handles loading and updating business settings (favicon, title, logo)
 */

import apiClient from "@food/api/axios";
import { API_ENDPOINTS, API_BASE_URL } from "@food/api/config";
import { publicGetOnce } from "@food/api";
import { normalizeImageUrl } from "@food/utils/common";

const SETTINGS_KEY = 'food_business_settings';
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api(?:\/v\d+)?\/?$/, "");

const resolveMediaUrl = (media) => {
  if (!media) return "";
  if (typeof media === "string") return normalizeImageUrl(media, BACKEND_ORIGIN) || "";
  const raw = media?.url || media?.secure_url || media?.imageUrl || media?.image || media?.src || "";
  return normalizeImageUrl(raw, BACKEND_ORIGIN) || "";
};

// Initialize from localStorage immediately so it's available for components on mount
let cachedSettings = (() => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
})();

// Apply cached settings immediately on module load if they exist
if (cachedSettings) {
  setTimeout(() => {
    updateFavicon(cachedSettings.favicon);
    updateTitle(cachedSettings.companyName);
  }, 0);
}

let inFlightSettingsPromise = null;

/**
 * Load business settings from backend (public endpoint - no auth required)
 */
export const loadBusinessSettings = async () => {
  try {
    // If we have no cached settings, we MUST fetch
    // If we have cached settings, we still try to fetch in background to ensure they are fresh
    const endpoint = API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS_PUBLIC;
    if (!endpoint || (typeof endpoint === "string" && !endpoint.trim())) {
      return cachedSettings;
    }

    if (inFlightSettingsPromise) {
      return await inFlightSettingsPromise;
    }

    inFlightSettingsPromise = (async () => {
      // Use public endpoint that doesn't require authentication
      // Use noCache to ensure we get fresh data from server this time
      const response = await publicGetOnce(endpoint, { noCache: true });
      const settings = response?.data?.data || response?.data;

      if (settings) {
        cachedSettings = settings;
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {}
        
        updateFavicon(settings.favicon);
        updateTitle(settings.companyName);
        return settings;
      }
      return cachedSettings;
    })();

    return await inFlightSettingsPromise;
  } catch (error) {
    // Return cached if failed
    return cachedSettings;
  } finally {
    inFlightSettingsPromise = null;
  }
};

/**
 * Update favicon in document
 */
export const updateFavicon = (favicon) => {
  if (typeof document === 'undefined') return;
  const url = resolveMediaUrl(favicon);
  if (!url) return;

  const iconType = url.endsWith(".svg")
    ? "image/svg+xml"
    : url.endsWith(".ico")
      ? "image/x-icon"
      : "image/png";

  // Remove existing favicons
  const existingFavicons = document.querySelectorAll("link[rel*='icon']");
  existingFavicons.forEach(el => el.remove());

  [
    { rel: "icon", sizes: "32x32" },
    { rel: "shortcut icon" },
    { rel: "apple-touch-icon", sizes: "180x180" },
  ].forEach(({ rel, sizes }) => {
    const link = document.createElement("link");
    link.rel = rel;
    link.type = iconType;
    link.href = url;
    if (sizes) link.sizes = sizes;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  });
};

/**
 * Update page title
 */
export const updateTitle = (companyName) => {
  if (companyName && typeof document !== 'undefined') {
    document.title = companyName;
  }
};

/**
 * Set cached settings manually (useful after update)
 */
export const setCachedSettings = (settings) => {
  if (settings) {
    cachedSettings = settings;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
    
    updateFavicon(settings.favicon);
    updateTitle(settings.companyName);
  }
};

/**
 * Clear cached settings (call after updating settings)
 */
export const clearCache = () => {
  cachedSettings = null;
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (e) {}
};

/**
 * Get cached settings
 */
export const getCachedSettings = () => {
  return cachedSettings;
};

/**
 * Get company name from business settings with fallback
 * @returns {string} Company name or default "Indian Bites Food"
 */
export const getCompanyName = () => {
  const settings = getCachedSettings();
  return settings?.companyName || "Indian Bites";
};

/**
 * Get company name asynchronously (loads if not cached)
 * @returns {Promise<string>} Company name or default "Indian Bites Food"
 */
export const getCompanyNameAsync = async () => {
  try {
    const settings = await loadBusinessSettings();
    return settings?.companyName || "Indian Bites";
  } catch (error) {
    return "Indian Bites";
  }
};
