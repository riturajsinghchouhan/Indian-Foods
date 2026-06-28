import { FoodUser } from '../../../../core/users/user.model.js';
import { ValidationError } from '../../../../core/auth/errors.js';
import { reverseGeocode } from '../../../../services/geocoding.service.js';

const INDIA_LAT = [6.5, 37.1];
const INDIA_LNG = [68.7, 97.4];

function isInIndia(lat, lng) {
    return lat >= INDIA_LAT[0] && lat <= INDIA_LAT[1] && lng >= INDIA_LNG[0] && lng <= INDIA_LNG[1] && lng > 0;
}

function normalizeLocationPayload(body = {}) {
    const lat = Number(body.latitude ?? body.lat);
    const lng = Number(body.longitude ?? body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new ValidationError('latitude and longitude are required');
    }
    return {
        latitude: lat,
        longitude: lng,
        address: String(body.address || '').trim(),
        formattedAddress: String(body.formattedAddress || body.address || '').trim(),
        city: String(body.city || '').trim(),
        state: String(body.state || '').trim(),
        area: String(body.area || '').trim(),
        accuracy: body.accuracy != null ? Number(body.accuracy) : undefined,
    };
}

function toClientLocation(doc) {
    const loc = doc?.lastKnownLocation;
    if (!loc?.latitude || !loc?.longitude) return null;
    return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address || '',
        formattedAddress: loc.formattedAddress || loc.address || '',
        city: loc.city || '',
        state: loc.state || '',
        area: loc.area || '',
        accuracy: loc.accuracy ?? null,
        updatedAt: loc.updatedAt || doc.updatedAt,
    };
}

export async function getUserLocation(userId) {
    const user = await FoodUser.findById(userId).select('lastKnownLocation updatedAt').lean();
    if (!user) throw new ValidationError('User not found');
    return { location: toClientLocation(user) };
}

export async function updateUserLocation(userId, body = {}) {
    let payload = normalizeLocationPayload(body);

    const needsGeocode =
        !payload.formattedAddress ||
        payload.formattedAddress === 'Select location' ||
        /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(payload.formattedAddress);

    if (needsGeocode && isInIndia(payload.latitude, payload.longitude)) {
        try {
            const geocoded = await reverseGeocode(payload.latitude, payload.longitude);
            payload = {
                ...payload,
                area: payload.area || geocoded.area,
                city: payload.city || geocoded.city,
                state: payload.state || geocoded.state,
                formattedAddress: geocoded.formattedAddress,
                address: payload.address || geocoded.address,
            };
        } catch {
            // keep coords-only payload
        }
    }

    const user = await FoodUser.findByIdAndUpdate(
        userId,
        {
            $set: {
                lastKnownLocation: {
                    type: 'Point',
                    coordinates: [payload.longitude, payload.latitude],
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    address: payload.address,
                    formattedAddress: payload.formattedAddress,
                    city: payload.city,
                    state: payload.state,
                    area: payload.area,
                    accuracy: Number.isFinite(payload.accuracy) ? payload.accuracy : undefined,
                    updatedAt: new Date(),
                },
            },
        },
        { new: true },
    ).select('lastKnownLocation updatedAt');

    if (!user) throw new ValidationError('User not found');
    return { location: toClientLocation(user) };
}
