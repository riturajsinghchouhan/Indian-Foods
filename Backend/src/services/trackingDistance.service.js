import { getDrivingDistances } from './googleMaps.service.js';
import { haversineMeters, estimateEtaSeconds } from '../utils/geo.js';

export function straightLineDistance(origin, destination) {
    if (!origin?.lat || !destination?.lat) return null;
    const meters = haversineMeters(origin.lat, origin.lng, destination.lat, destination.lng);
    if (meters === null) return null;
    return {
        mode: 'straight_line',
        distanceMeters: Math.round(meters),
        distanceText: meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`,
        durationSeconds: estimateEtaSeconds(meters),
        durationText: formatDuration(estimateEtaSeconds(meters)),
    };
}

function formatDuration(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    if (s < 60) return `${s} sec`;
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
}

export async function roadDistanceAndEta(origin, destination, { id = 'dest' } = {}) {
    const straight = straightLineDistance(origin, destination);
    if (!straight) return null;

    try {
        const map = await getDrivingDistances(origin, [{ id, lat: destination.lat, lng: destination.lng }]);
        const road = map.get(String(id));
        if (road) {
            return {
                mode: 'road',
                distanceMeters: road.distanceValue,
                distanceText: road.distanceText,
                durationSeconds: road.durationValue,
                durationText: road.durationText,
                straightLineMeters: straight.distanceMeters,
            };
        }
    } catch {
        // fallback below
    }

    return { ...straight, straightLineMeters: straight.distanceMeters };
}

export async function computeTrackingLegs({ rider, restaurant, customer }) {
    const legs = {};

    if (rider?.lat && restaurant?.lat) {
        legs.riderToRestaurant = await roadDistanceAndEta(
            { lat: rider.lat, lng: rider.lng },
            { lat: restaurant.lat, lng: restaurant.lng },
            { id: 'restaurant' },
        );
    }

    if (rider?.lat && customer?.lat) {
        legs.riderToCustomer = await roadDistanceAndEta(
            { lat: rider.lat, lng: rider.lng },
            { lat: customer.lat, lng: customer.lng },
            { id: 'customer' },
        );
    }

    if (restaurant?.lat && customer?.lat) {
        legs.restaurantToCustomer = await roadDistanceAndEta(
            { lat: restaurant.lat, lng: restaurant.lng },
            { lat: customer.lat, lng: customer.lng },
            { id: 'order_route' },
        );
    }

    return legs;
}
