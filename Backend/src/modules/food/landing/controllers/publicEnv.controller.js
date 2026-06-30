import { config } from '../../../../config/env.js';
import EnvSetting from '../../../../models/EnvSetting.js';
import { decrypt } from '../../../../utils/encryption.js';

const sanitize = (value) => (value ? String(value).trim().replace(/^['"]|['"]$/g, '') : '');

async function resolveGoogleMapsKey() {
    const fromConfig =
        sanitize(config.googleMapsApiKey) ||
        sanitize(process.env.VITE_GOOGLE_MAPS_API_KEY) ||
        sanitize(process.env.GOOGLE_MAPS_API_KEY);

    if (fromConfig) return fromConfig;

    try {
        const setting = await EnvSetting.findOne({ key: 'GOOGLE_MAPS_API_KEY' }).lean();
        if (setting?.value) {
            const raw = setting.isEncrypted ? decrypt(setting.value) : String(setting.value);
            const key = sanitize(raw);
            if (key) return key;
        }
    } catch {
        /* fall through */
    }

    return '';
}

/**
 * Public environment variables for frontend runtime.
 * IMPORTANT: Only expose non-secret keys safe for clients.
 */
export const getPublicEnvController = async (_req, res, next) => {
    try {
        const googleMapsKey = await resolveGoogleMapsKey();

        return res.status(200).json({
            success: true,
            message: 'Public environment variables fetched',
            data: {
                VITE_GOOGLE_MAPS_API_KEY: googleMapsKey || '',
                GOOGLE_MAPS_API_KEY: googleMapsKey || '',
                VITE_FIREBASE_API_KEY: sanitize(process.env.VITE_FIREBASE_API_KEY) || '',
                VITE_FIREBASE_AUTH_DOMAIN: sanitize(process.env.VITE_FIREBASE_AUTH_DOMAIN) || '',
                VITE_FIREBASE_PROJECT_ID: sanitize(process.env.VITE_FIREBASE_PROJECT_ID) || '',
                VITE_FIREBASE_STORAGE_BUCKET: sanitize(process.env.VITE_FIREBASE_STORAGE_BUCKET) || '',
                VITE_FIREBASE_MESSAGING_SENDER_ID: sanitize(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || '',
                VITE_FIREBASE_APP_ID: sanitize(process.env.VITE_FIREBASE_APP_ID) || '',
                VITE_FIREBASE_MEASUREMENT_ID: sanitize(process.env.VITE_FIREBASE_MEASUREMENT_ID) || '',
                VITE_FIREBASE_VAPID_KEY: sanitize(process.env.VITE_FIREBASE_VAPID_KEY) || '',
                FIREBASE_API_KEY: sanitize(process.env.VITE_FIREBASE_API_KEY) || '',
                FIREBASE_AUTH_DOMAIN: sanitize(process.env.VITE_FIREBASE_AUTH_DOMAIN) || '',
                FIREBASE_PROJECT_ID: sanitize(process.env.VITE_FIREBASE_PROJECT_ID) || '',
                FIREBASE_STORAGE_BUCKET: sanitize(process.env.VITE_FIREBASE_STORAGE_BUCKET) || '',
                FIREBASE_MESSAGING_SENDER_ID: sanitize(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || '',
                FIREBASE_APP_ID: sanitize(process.env.VITE_FIREBASE_APP_ID) || '',
                FIREBASE_MEASUREMENT_ID: sanitize(process.env.VITE_FIREBASE_MEASUREMENT_ID) || '',
                FIREBASE_VAPID_KEY: sanitize(process.env.VITE_FIREBASE_VAPID_KEY) || '',
                NODE_ENV: config.nodeEnv || 'development'
            }
        });
    } catch (error) {
        next(error);
    }
};

