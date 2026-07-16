import { config } from "../config/env.js";

const ABSOLUTE_URL_RE = /^(?:https?:)?\/\//i;

const trimTrailingSlash = (value = "") => String(value || "").trim().replace(/\/+$/, "");
const trimLeadingSlash = (value = "") => String(value || "").trim().replace(/^\/+/, "");

const isUploadPath = (value = "") => {
  const normalized = trimLeadingSlash(value).toLowerCase();
  return normalized.startsWith("uploads/") || normalized.startsWith("api/v1/uploads/");
};

const normalizeUploadPath = (value = "") => {
  const normalized = trimLeadingSlash(value);
  if (normalized.toLowerCase().startsWith("api/v1/uploads/")) {
    return `/${normalized}`;
  }
  if (normalized.toLowerCase().startsWith("uploads/")) {
    return `/${normalized}`;
  }
  return value;
};

export const getMediaBaseUrl = () => {
  const explicit = trimTrailingSlash(
    config.publicBaseUrl || config.appUrl || config.backendBaseUrl || "",
  );
  if (explicit) return explicit;
  if (config.nodeEnv !== "production") {
    return `http://localhost:${config.port || 5000}`;
  }
  return "";
};

export const normalizeMediaUrl = (value) => {
  if (!value) return "";
  const raw = typeof value === "string"
    ? value.trim()
    : typeof value === "object"
      ? String(value.url || value.secure_url || "").trim()
      : "";
  if (!raw) return "";
  if (/^(data:|blob:)/i.test(raw)) return raw;
  if (ABSOLUTE_URL_RE.test(raw)) return raw;
  if (!isUploadPath(raw)) return raw;

  const normalizedPath = normalizeUploadPath(raw);
  const baseUrl = getMediaBaseUrl();
  if (!baseUrl) return normalizedPath;
  return `${baseUrl}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
};

export const toMediaObject = (value) => {
  const url = normalizeMediaUrl(value);
  return url ? { url } : null;
};

export const toMediaArray = (values = []) => {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      const url = normalizeMediaUrl(value);
      return url ? { url, publicId: null } : null;
    })
    .filter(Boolean);
};
