import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * Redis-backed response cache middleware.
 *
 * Usage:
 *   router.get('/search', redisCacheMiddleware({ ttlSeconds: 180 }), searchController);
 *
 * Cache key is derived from the full request URL (path + query string),
 * so each unique search is cached independently.
 *
 * The middleware is a transparent pass-through when Redis is disabled or unavailable.
 */
export const redisCacheMiddleware = ({ ttlSeconds = 180, prefix = 'api_cache' } = {}) => {
  return async (req, res, next) => {
    const redis = getRedisClient();

    // If Redis is unavailable, skip caching entirely — zero impact on existing flow.
    if (!redis || !redis.isReady) {
      return next();
    }

    // Build a unique cache key from the request URL (includes query params)
    const cacheKey = `${prefix}:${req.originalUrl || req.url}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return res.status(200).json(parsed);
      }
    } catch (err) {
      // Cache miss or parse error — just proceed to handler
      logger.warn(`[RedisCache] Read error for ${cacheKey}: ${err.message}`);
    }

    // Intercept res.json to cache the response before sending
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          redis.setEx(cacheKey, ttlSeconds, JSON.stringify(body)).catch((err) => {
            logger.warn(`[RedisCache] Write error for ${cacheKey}: ${err.message}`);
          });
        } catch {
          // Non-blocking — don't break the response if caching fails
        }
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate all cached entries matching a glob pattern.
 * Example: invalidateCache('api_cache:/food/user/search*')
 *
 * Call this from restaurant/menu update services to bust stale data.
 */
export const invalidateCache = async (pattern = 'api_cache:*') => {
  const redis = getRedisClient();
  if (!redis || !redis.isReady) return;

  try {
    let cursor = 0;
    const keysToDelete = [];
    do {
      const result = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      keysToDelete.push(...result.keys);
    } while (cursor !== 0);

    if (keysToDelete.length > 0) {
      await redis.del(keysToDelete);
      logger.info(`[RedisCache] Invalidated ${keysToDelete.length} key(s) matching: ${pattern}`);
    }
  } catch (err) {
    logger.warn(`[RedisCache] Invalidation error for pattern ${pattern}: ${err.message}`);
  }
};
