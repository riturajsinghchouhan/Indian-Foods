import express from 'express';
import { authMiddleware } from '../auth/auth.middleware.js';
import { verifyAccessToken } from '../auth/token.util.js';
import { sendError } from '../../utils/response.js';
import {
    removeFirebaseDeviceToken,
    sendTestNotification,
    upsertFirebaseDeviceToken
} from './firebase.service.js';
import { FoodUser } from '../users/user.model.js';
import { FoodRestaurant } from '../../modules/food/restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../../modules/food/delivery/models/deliveryPartner.model.js';
import { FoodAdmin } from '../admin/admin.model.js';

const router = express.Router();

const getOwnerContext = (req) => ({
    ownerType: req.user?.role,
    ownerId: req.user?.userId
});

const getOwnerContextOptional = (req) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
        if (token) {
            const decoded = verifyAccessToken(token);
            return {
                ownerType: decoded.role,
                ownerId: decoded.userId
            };
        }
    } catch (e) {
        // Ignore error and return empty context
    }
    return { ownerType: null, ownerId: null };
};

// Public health check for fcm-tokens service
router.get('/check', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'FCM tokens service is operational',
        timestamp: new Date().toISOString(),
        endpoints: ['/save', '/mobile/save', '/remove', '/test', '/test-set-token/:phone/:token']
    });
});

// Temporary administrative test route to set token by phone
router.get('/test-set-token/:phone/:token', async (req, res, next) => {
    try {
        const { phone, token } = req.params;
        const user = await FoodUser.findOne({ phone: phone.trim() });
        if (!user) return res.status(404).json({ success: false, message: `User with phone ${phone} not found` });

        await upsertFirebaseDeviceToken({ 
            ownerType: 'USER', 
            ownerId: String(user._id), 
            token, 
            platform: 'mobile' 
        });

        return res.status(200).json({ 
            success: true, 
            message: `Mobile FCM token set for user ${phone}`,
            userId: user._id
        });
    } catch (error) {
        next(error);
    }
});

// Temporary administrative test route to get tokens by phone
router.get('/test-get-token/:phone', async (req, res, next) => {
    try {
        const { phone } = req.params;
        const user = await FoodUser.findOne({ phone: phone.trim() }).select('fcmTokens fcmTokenMobile');
        if (!user) return res.status(404).json({ success: false, message: `User with phone ${phone} not found` });

        return res.status(200).json({ 
            success: true, 
            data: {
                web: user.fcmTokens || [],
                mobile: user.fcmTokenMobile || []
            }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/save', authMiddleware, async (req, res, next) => {
    try {
        const { ownerType, ownerId } = getOwnerContext(req);
        const token = String(req.body?.token || '').trim();
        const platform = req.body?.platform === 'mobile' ? 'mobile' : 'web';

        console.log(`[FCM-DEBUG] /save request received: ownerType=${ownerType}, ownerId=${ownerId}, platform=${platform}, tokenPreview=${token?.slice(0, 10)}...`);

        if (!ownerType || !ownerId) {
            console.warn('[FCM-DEBUG] /save - Authentication required');
            return sendError(res, 401, 'Authentication required');
        }

        await upsertFirebaseDeviceToken({ ownerType, ownerId, token, platform });
        console.log('[FCM-DEBUG] /save - Token saved successfully');
        return res.status(200).json({
            success: true,
            message: 'FCM token saved',
            data: { ownerType, ownerId, platform }
        });
    } catch (error) {
        next(error);
    }
});

router.post('/mobile/save', authMiddleware, async (req, res, next) => {
    try {
        const { ownerType, ownerId } = getOwnerContext(req);
        const token = String(req.body?.token || '').trim();

        console.log(`[FCM-DEBUG] /mobile/save request received: ownerType=${ownerType}, ownerId=${ownerId}, tokenPreview=${token?.slice(0, 10)}...`);

        if (!ownerType || !ownerId) {
            console.warn('[FCM-DEBUG] /mobile/save - Authentication required');
            return sendError(res, 401, 'Authentication required');
        }

        if (!token) {
            console.warn('[FCM-DEBUG] /mobile/save - FCM token is required');
            return sendError(res, 400, 'FCM token is required');
        }

        await upsertFirebaseDeviceToken({ ownerType, ownerId, token, platform: 'mobile' });
        console.log('[FCM-DEBUG] /mobile/save - Token saved successfully');
        return res.status(200).json({
            success: true,
            message: 'Mobile FCM token saved successfully',
            data: { ownerType, ownerId, platform: 'mobile' }
        });
    } catch (error) {
        next(error);
    }
});

const handleRemoveToken = async (req, res, next) => {
    try {
        // Optionally try to parse authorization header first to scope it, 
        // but fallback to unauthenticated global removal to prevent blocked logouts on expired sessions.
        let { ownerType, ownerId } = getOwnerContext(req);
        if (!ownerType || !ownerId) {
            const opt = getOwnerContextOptional(req);
            ownerType = opt.ownerType;
            ownerId = opt.ownerId;
        }

        const token = String(req.params?.token || req.body?.token || '').trim();
        const platformInput = req.body?.platform || req.query?.platform;
        const platform = platformInput === 'mobile' ? 'mobile' : platformInput === 'web' ? 'web' : undefined;

        if (!token) {
            return sendError(res, 400, 'FCM token is required');
        }

        if (ownerType && ownerId) {
            // If authenticated (or token successfully decoded), do a targeted removal.
            await removeFirebaseDeviceToken({ ownerType, ownerId, token, platform });
        } else {
            // If unauthenticated (e.g. session expired, logout fallback), perform a global token removal across all collections.
            const models = [FoodUser, FoodRestaurant, FoodDeliveryPartner, FoodAdmin];
            await Promise.all(
                models.map((model) =>
                    model.updateMany(
                        { $or: [{ fcmTokens: token }, { fcmTokenMobile: token }] },
                        { $pull: { fcmTokens: token, fcmTokenMobile: token } }
                    )
                )
            );
        }

        return res.status(200).json({
            success: true,
            message: 'FCM token removed'
        });
    } catch (error) {
        next(error);
    }
};

// Remove FCM token routes do NOT enforce authMiddleware to guarantee clean logouts when sessions expire.
router.delete('/remove', handleRemoveToken);
router.delete('/remove/:token', handleRemoveToken);

router.post('/test', authMiddleware, async (req, res, next) => {
    try {
        const { ownerType, ownerId } = getOwnerContext(req);
        const platform = req.body?.platform === 'mobile' ? 'mobile' : req.body?.platform === 'web' ? 'web' : undefined;

        if (!ownerType || !ownerId) {
            return sendError(res, 401, 'Authentication required');
        }

        const result = await sendTestNotification({ ownerType, ownerId, platform });
        return res.status(200).json({
            success: true,
            message: 'Test notification sent',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

export default router;
