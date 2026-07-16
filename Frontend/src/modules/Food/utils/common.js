/**
 * Common utility functions for the Food module
 */

const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1)$/i;
const ABSOLUTE_URL_RE = /^(https?:)?\/\//i;
const DEFAULT_PUBLIC_MEDIA_ORIGIN =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_PUBLIC_MEDIA_ORIGIN
    ? String(import.meta.env.VITE_PUBLIC_MEDIA_ORIGIN).trim().replace(/\/+$/, "")
    : "https://theindianbite.com";

const trimSlashes = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const isUploadPath = (value = "") => {
  const normalized = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
  return normalized.startsWith("uploads/") || normalized.startsWith("api/v1/uploads/");
};

const toApiUploadPath = (value = "") => {
  const normalized = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return "";
  if (normalized.toLowerCase().startsWith("api/v1/uploads/")) return `/${normalized}`;
  if (normalized.toLowerCase().startsWith("uploads/")) return `/api/v1/${normalized}`;
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const getSafeOrigin = (value = "") => {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
};

const getPreferredMediaOrigin = (backendOrigin = "") => {
  const appHost = typeof window !== "undefined" ? window.location?.hostname || "" : "";
  const backendHost = (() => {
    try {
      return backendOrigin ? new URL(backendOrigin).hostname || "" : "";
    } catch {
      return "";
    }
  })();

  if (LOCAL_HOST_RE.test(appHost) && LOCAL_HOST_RE.test(backendHost || appHost)) {
    return getSafeOrigin(DEFAULT_PUBLIC_MEDIA_ORIGIN) || DEFAULT_PUBLIC_MEDIA_ORIGIN;
  }

  return getSafeOrigin(backendOrigin) || trimSlashes(backendOrigin);
};

/**
 * Normalizes an image URL to handle relative paths and backend origins
 */
export const normalizeImageUrl = (imageUrl, backendOrigin = "") => {
  if (typeof imageUrl !== "string") return "";
  const trimmed = imageUrl.trim();
  if (!trimmed || /^data:/i.test(trimmed) || /^blob:/i.test(trimmed)) return trimmed;

  const appProtocol = typeof window !== "undefined" ? window.location?.protocol : "";
  const appHost = typeof window !== "undefined" ? window.location?.hostname : "";

  let normalized = trimmed
    .replace(/\\/g, "/")
    .replace(/^(https?):\/(?!\/)/i, "$1://")
    .replace(/^(https?:\/\/)(https?:\/\/)/i, "$1");

  if (/^\/\//.test(normalized)) normalized = `${appProtocol || "https:"}${normalized}`;

  if (ABSOLUTE_URL_RE.test(normalized)) {
    try {
      const parsed = new URL(normalized, window.location.origin);
      const isLocalParsedHost = LOCAL_HOST_RE.test(parsed.hostname || "");
      const isUploadRequest = isUploadPath(parsed.pathname || "");

      if (isLocalParsedHost && isUploadRequest) {
        const mediaOrigin = getPreferredMediaOrigin(backendOrigin);
        if (mediaOrigin) {
          return `${mediaOrigin}${toApiUploadPath(parsed.pathname || "")}`.replace(/ /g, "%20");
        }
      }

      if (appHost && !LOCAL_HOST_RE.test(appHost) && isLocalParsedHost) {
        const backendUrl = new URL(backendOrigin || window.location.origin);
        parsed.protocol = backendUrl.protocol;
        parsed.hostname = backendUrl.hostname;
        parsed.port = backendUrl.port;
      }
      if (appProtocol === "https:" && parsed.protocol === "http:") parsed.protocol = "https:";
      const finalUrl = parsed.toString();
      if (finalUrl.includes("firebasestorage.googleapis.com")) return finalUrl;
      const hasSigned = /[?&](X-Amz-|Signature=|Expires=|AWSAccessKeyId=|GoogleAccessId=|token=|sig=|se=|sp=|sv=|alt=)/i.test(finalUrl);
      return hasSigned ? finalUrl : finalUrl.replace(/ /g, "%20");
    } catch {
      return normalized;
    }
  }

  if (isUploadPath(normalized)) {
    const uploadPath = toApiUploadPath(normalized);
    const mediaOrigin = getPreferredMediaOrigin(backendOrigin);
    if (mediaOrigin) {
      return `${mediaOrigin}${uploadPath}`.replace(/ /g, "%20");
    }
    return uploadPath.replace(/ /g, "%20");
  }

  const baseOrigin = trimSlashes(backendOrigin);
  const absolutePath = normalized.startsWith("/")
    ? `${baseOrigin}${normalized}`
    : `${baseOrigin}/${normalized.replace(/^\.?\/*/, "")}`;
  return absolutePath;
};

/**
 * Extracts a list of image URLs from a source (string, array of strings, or object with image properties)
 */
export const extractImages = (source, backendOrigin = "") => {
  if (!source) return [];
  const normalize = (val) => {
    if (!val) return "";
    if (typeof val === "string") return normalizeImageUrl(val, backendOrigin);
    if (Array.isArray(val)) {
      if (val.length === 0) return "";
      return normalize(val[0]);
    }
    if (typeof val === "object") {
      const src = val.url || val.secure_url || val.imageUrl || val.image || val.src || "";
      return typeof src === "string" ? normalizeImageUrl(src, backendOrigin) : "";
    }
    return "";
  };

  const candidates = Array.isArray(source) ? source.map(normalize) : [normalize(source)];
  return candidates.filter(Boolean);
};

/**
 * Calculates distance between two coordinates in kilometers using Haversine formula
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Apply a routing multiplier (tortuosity factor) to approximate actual driving distance
  // from the straight-line Haversine distance. 1.35 is standard for urban grids.
  const ROUTING_MULTIPLIER = 1.35;
  return (R * c) * ROUTING_MULTIPLIER;
};

/**
 * Formats distance for display
 */
export const formatDistance = (distanceInKm) => {
  if (distanceInKm === null || distanceInKm === undefined) return "1.2 km";
  if (distanceInKm >= 1) {
    return `${distanceInKm.toFixed(1)} km`;
  } else {
    return `${Math.round(distanceInKm * 1000)} m`;
  }
};

/**
 * Slugifies a string for use in URLs or as identifiers
 */
export const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
