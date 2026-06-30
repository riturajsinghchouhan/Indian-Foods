/**
 * Google Maps API Key — build-time env + runtime public API (admin DB / backend .env).
 * Works in Vite web dev, production web, and mobile WebView shells.
 */

import { useEffect, useState } from "react";
import apiClient from "@/services/api/axios.js";

let cachedApiKey = null;
let fetchPromise = null;

function sanitizeApiKey(value) {
  if (!value) return "";
  return String(value).trim().replace(/^['"]|['"]$/g, "");
}

function getBuildTimeKey() {
  return sanitizeApiKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
}

async function fetchRuntimeKey() {
  try {
    const response = await apiClient.get("/food/public/env", {
      timeout: 15000,
    });
    const payload = response?.data?.data || response?.data || {};
    return (
      sanitizeApiKey(payload.VITE_GOOGLE_MAPS_API_KEY) ||
      sanitizeApiKey(payload.GOOGLE_MAPS_API_KEY)
    );
  } catch {
    return "";
  }
}

/**
 * Resolve Google Maps API key (cached).
 * Priority: in-memory cache → build-time Vite env → public backend endpoint.
 */
export async function getGoogleMapsApiKey() {
  if (cachedApiKey) return cachedApiKey;

  const buildKey = getBuildTimeKey();
  if (buildKey) {
    cachedApiKey = buildKey;
    return cachedApiKey;
  }

  if (!fetchPromise) {
    fetchPromise = fetchRuntimeKey()
      .then((key) => {
        cachedApiKey = key || "";
        return cachedApiKey;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }

  return fetchPromise;
}

/** Sync peek — only returns build-time key; prefer async getGoogleMapsApiKey(). */
export function getGoogleMapsApiKeySync() {
  return cachedApiKey || getBuildTimeKey();
}

export function clearGoogleMapsApiKeyCache() {
  cachedApiKey = null;
  fetchPromise = null;
}

/** Whether maps can be enabled (build-time or after async fetch). */
export function isGoogleMapsConfigured() {
  return Boolean(getGoogleMapsApiKeySync());
}

/** React hook for @react-google-maps/api — resolves API key in web & mobile WebView. */
export function useGoogleMapsApiKey() {
  const [apiKey, setApiKey] = useState(() => getGoogleMapsApiKeySync());

  useEffect(() => {
    let cancelled = false;
    getGoogleMapsApiKey().then((key) => {
      if (!cancelled && key) setApiKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return apiKey;
}
