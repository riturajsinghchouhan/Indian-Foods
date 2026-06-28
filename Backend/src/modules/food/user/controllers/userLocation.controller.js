import { sendResponse } from '../../../../utils/response.js';
import { getUserLocation, updateUserLocation } from '../services/userLocation.service.js';

export const getUserLocationController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const result = await getUserLocation(userId);
        return sendResponse(res, 200, 'Location retrieved successfully', result);
    } catch (error) {
        next(error);
    }
};

export const updateUserLocationController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const result = await updateUserLocation(userId, req.body ?? {});
        return sendResponse(res, 200, 'Location updated successfully', result);
    } catch (error) {
        next(error);
    }
};
