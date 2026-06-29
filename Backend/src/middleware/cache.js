import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Higher-order function to create a caching middleware.
 * @param {number} ttlInSeconds - Time to live for the cache in seconds.
 * @param {string} prefix - Optional key prefix for Redis (e.g. 'restaurants').
 * @returns {import('express').RequestHandler}
 */
export const cacheResponse = (ttlInSeconds = 300, prefix = 'api_cache') => {
    return async (req, res, next) => {
        // Skip caching if Redis is disabled or not a GET request
        if (!config.redisEnabled || req.method !== 'GET') return next();

        const redis = getRedisClient();
        if (!redis || !redis.isReady) return next();

        // Unique key for the current request (Method + URL + Query Params)
        let normalizedUrl = req.originalUrl || req.url;
        
        // Normalize GPS coordinates in the cache key to prevent fragmentation.
        // Rounding to 3 decimal places groups users within ~111 meters into the same cache bucket.
        if (req.query.lat && req.query.lng) {
            try {
                const dummyHost = 'http://localhost';
                const parsedUrl = new URL(normalizedUrl, dummyHost);
                const lat = parseFloat(parsedUrl.searchParams.get('lat'));
                const lng = parseFloat(parsedUrl.searchParams.get('lng'));
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    parsedUrl.searchParams.set('lat', lat.toFixed(3));
                    parsedUrl.searchParams.set('lng', lng.toFixed(3));
                    // Reconstruct without the dummy host
                    normalizedUrl = parsedUrl.pathname + parsedUrl.search;
                }
            } catch (err) {
                // Ignore parsing errors, fallback to raw url
                logger.debug(`Cache URL parsing error: ${err.message}`);
            }
        }
        
        const key = `${prefix}:${req.method}:${normalizedUrl}`;

        try {
            const cachedData = await redis.get(key);
            if (cachedData) {
                // logger.debug(`[Cache Hit] key=${key}`);
                return res.json(JSON.parse(cachedData));
            }

            // Capture the JSON response to store in Redis
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                // If it's a success response (status < 400), cache it
                if (res.statusCode < 400) {
                    redis.set(key, JSON.stringify(body), { EX: ttlInSeconds })
                        .catch(err => logger.error(`Redis caching failed for ${key}: ${err.message}`));
                }
                return originalJson(body);
            };

            // logger.debug(`[Cache Miss] key=${key}`);
            next();
        } catch (err) {
            logger.warn(`Cache middleware error: ${err.message}`);
            next(); // fallback to normal flow if something fails
        }
    };
};

/**
 * Clear cache by pattern (e.g. 'api_cache:GET:/api/food/restaurants*')
 * WARNING: 'keys' is O(N), use with care or switch to SCAN for large datasets.
 * @param {string} pattern - Redis glob pattern for keys to delete.
 */
export const invalidateCache = async (pattern) => {
    if (!config.redisEnabled) return;
    const redis = getRedisClient();
    if (!redis || !redis.isReady) return;

    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(keys);
            logger.info(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
        }
    } catch (err) {
        logger.error(`Cache invalidation error: ${err.message}`);
    }
};
