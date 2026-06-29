import express from 'express';
import { searchController, listAdminCategoriesController } from '../controllers/search.controller.js';
import { redisCacheMiddleware } from '../../../../middleware/redisCache.middleware.js';

const router = express.Router();

/**
 * Unified Search Endpoint
 * GET /api/v1/food/search/unified
 * Cached for 3 minutes (180s) — unique per query params (lat, lng, q, categoryId, etc.)
 */
router.get('/unified', redisCacheMiddleware({ ttlSeconds: 180, prefix: 'cache:search' }), searchController);

/**
 * Admin Categories Only Endpoint (to avoid restaurant-created ones as requested)
 * GET /api/v1/food/search/categories/admin
 * Cached for 5 minutes (300s) — categories change rarely.
 */
router.get('/categories/admin', redisCacheMiddleware({ ttlSeconds: 300, prefix: 'cache:categories' }), listAdminCategoriesController);

export default router;
