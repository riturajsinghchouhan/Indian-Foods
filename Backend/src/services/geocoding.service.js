import { config } from '../config/env.js';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { coordCacheKey } from '../utils/geo.js';

const GEOCODE_CACHE_TTL_SEC = 7 * 24 * 3600;

function parseGoogleComponents(components = []) {
    const find = (...types) =>
        components.find((c) => types.some((t) => (c.types || []).includes(t)))?.long_name || '';

    const subLocality1 = find('sublocality_level_1');
    const subLocality = find('sublocality');
    const neighborhood = find('neighborhood');

    return {
        area: subLocality1 || subLocality || neighborhood || '',
        city: find('locality', 'administrative_area_level_2'),
        state: find('administrative_area_level_1'),
        country: find('country') || 'India',
        postalCode: find('postal_code'),
    };
}

export async function reverseGeocode(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Valid latitude and longitude are required');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Coordinates out of range');
    }

    const key = coordCacheKey(lat, lng);
    const cacheKey = key ? `geocode:rev:${key}` : null;

    try {
        const redis = getRedisClient();
        if (redis && cacheKey) {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }
    } catch (err) {
        logger.warn(`Geocode cache read failed: ${err.message}`);
    }

    const apiKey = config.googleMapsApiKey;
    if (!apiKey) {
        return {
            latitude: lat,
            longitude: lng,
            area: '',
            city: '',
            state: '',
            country: 'India',
            postalCode: '',
            formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            source: 'coords_only',
        };
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=en`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    let data;
    try {
        const res = await fetch(url, { signal: controller.signal });
        data = await res.json();
    } finally {
        clearTimeout(timeout);
    }

    if (data.status !== 'OK' || !data.results?.length) {
        throw new Error(data.error_message || data.status || 'Reverse geocoding failed');
    }

    const top = data.results[0];
    const parts = parseGoogleComponents(top.address_components || []);
    const formattedAddress = top.formatted_address || '';
    const displayAddress = parts.area || parts.city || formattedAddress.split(',')[0]?.trim() || '';

    const result = {
        latitude: lat,
        longitude: lng,
        ...parts,
        formattedAddress,
        address: displayAddress,
        source: 'google',
    };

    try {
        const redis = getRedisClient();
        if (redis && cacheKey) {
            await redis.set(cacheKey, JSON.stringify(result), { EX: GEOCODE_CACHE_TTL_SEC });
        }
    } catch (err) {
        logger.warn(`Geocode cache write failed: ${err.message}`);
    }

    return result;
}
