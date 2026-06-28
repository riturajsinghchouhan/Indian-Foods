import { sendResponse } from '../../../../utils/response.js';
import { reverseGeocode } from '../../../../services/geocoding.service.js';
import { computeTrackingLegs } from '../../../../services/trackingDistance.service.js';

export const reverseGeocodePublicController = async (req, res, next) => {
    try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        const result = await reverseGeocode(lat, lng);
        return sendResponse(res, 200, 'Address resolved', {
            results: [
                {
                    formatted_address: result.formattedAddress,
                    address_components: {
                        area: result.area,
                        city: result.city,
                        state: result.state,
                        country: result.country,
                        postal_code: result.postalCode,
                    },
                },
            ],
            location: result,
        });
    } catch (error) {
        next(error);
    }
};

export const computeDistancePublicController = async (req, res, next) => {
    try {
        const { rider, restaurant, customer } = req.body ?? {};
        const legs = await computeTrackingLegs({ rider, restaurant, customer });
        return sendResponse(res, 200, 'Distances computed', { legs });
    } catch (error) {
        next(error);
    }
};
