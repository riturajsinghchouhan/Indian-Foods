/**
 * Global Zone Middleware
 * Intercepts the X-Zone-Id header from Axios and attaches it to the request object.
 * This ensures that cross-zone leakage cannot happen if a developer forgets to pass the zone in query params.
 */
import mongoose from 'mongoose';

export const requireZone = (req, res, next) => {
    // Priority: 1. Header (Axios Auto-Injection) 2. Query param (Legacy compatibility)
    const zoneId = req.headers['x-zone-id'] || req.query.zoneId;

    if (zoneId && zoneId !== 'null' && zoneId !== 'undefined' && mongoose.Types.ObjectId.isValid(zoneId)) {
        req.zoneId = zoneId;
        
        // Also attach it to req.query so existing controllers don't break
        // This is the magic part that ensures backward compatibility while adding global safety
        if (!req.query.zoneId) {
            req.query.zoneId = zoneId;
        }
    }

    next();
};
