import { config } from '../config/env.js';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let redisClient = null;
if (config.redisEnabled && config.redisUrl) {
    redisClient = new Redis(config.redisUrl);
}

/**
 * Calculates the driving distance between a single origin and multiple destinations
 * using the Google Maps Distance Matrix API.
 * Uses Redis caching to minimize API calls (caches for 24 hours).
 *
 * @param {Object} origin { lat, lng }
 * @param {Array<Object>} destinations [{ id, lat, lng }]
 * @returns {Promise<Map<string, Object>>} Map of destination ID to distance info
 */
export async function getDrivingDistances(origin, destinations) {
    const resultMap = new Map();
    if (!origin || !origin.lat || !origin.lng || !destinations || destinations.length === 0) {
        return resultMap;
    }

    const apiKey = config.googleMapsApiKey;
    if (!apiKey) {
        logger.warn('Google Maps API key missing. Returning empty distances.');
        return resultMap;
    }

    const originKey = `${origin.lat},${origin.lng}`;
    const destinationsToFetch = [];

    // Check Cache First
    for (const dest of destinations) {
        if (!dest.lat || !dest.lng) continue;
        const destKey = `${dest.lat},${dest.lng}`;
        const cacheKey = `distance:${originKey}:${destKey}`;

        try {
            const cached = redisClient ? await redisClient.get(cacheKey) : null;
            if (cached) {
                resultMap.set(String(dest.id), JSON.parse(cached));
                continue;
            }
        } catch (err) {
            logger.warn(`Redis get error: ${err.message}`);
        }

        destinationsToFetch.push(dest);
    }

    if (destinationsToFetch.length === 0) {
        return resultMap;
    }

    // Google API limits to 25 destinations per request usually. Let's chunk it.
    const CHUNK_SIZE = 25;
    for (let i = 0; i < destinationsToFetch.length; i += CHUNK_SIZE) {
        const chunk = destinationsToFetch.slice(i, i + CHUNK_SIZE);
        const destStrings = chunk.map(d => `${d.lat},${d.lng}`).join('|');
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originKey}&destinations=${destStrings}&key=${apiKey}&mode=driving`;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            const data = await res.json();

            if (data.status === 'OK' && data.rows && data.rows.length > 0) {
                const elements = data.rows[0].elements;
                for (let j = 0; j < chunk.length; j++) {
                    const el = elements[j];
                    if (el && el.status === 'OK') {
                        const distanceInfo = {
                            distanceText: el.distance.text, // e.g. "2.6 km"
                            distanceValue: el.distance.value, // e.g. 2600 (meters)
                            durationText: el.duration.text,
                            durationValue: el.duration.value
                        };
                        
                        resultMap.set(String(chunk[j].id), distanceInfo);
                        
                        // Cache result for 24 hours
                        if (redisClient) {
                            const destKey = `${chunk[j].lat},${chunk[j].lng}`;
                            const cacheKey = `distance:${originKey}:${destKey}`;
                            await redisClient.set(cacheKey, JSON.stringify(distanceInfo), 'EX', 86400).catch(() => {});
                        }
                    }
                }
            } else {
                logger.warn(`Google Distance Matrix API returned status: ${data.status}. Error: ${data.error_message}`);
            }
        } catch (err) {
            logger.error(`Error fetching distance matrix: ${err.message}`);
        }
    }

    return resultMap;
}
