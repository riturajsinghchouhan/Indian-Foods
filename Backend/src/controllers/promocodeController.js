import Promocode from '../models/Promocode.js';
import { sendResponse } from '../utils/response.js';
import { FoodRestaurant } from '../modules/food/restaurant/models/restaurant.model.js';

const syncRestaurantDiscount = async (restaurantId) => {
    try {
        const now = new Date();
        const activePromos = await Promocode.find({
            restaurantId,
            isActive: true,
            expiryDate: { $gt: now }
        });
        
        let maxDiscount = 0;
        for (const promo of activePromos) {
            if (!promo.usageLimit || promo.usageCount < promo.usageLimit) {
                if (promo.discountType === 'PERCENTAGE' && promo.discountValue > maxDiscount) {
                    maxDiscount = promo.discountValue;
                }
            }
        }
        
        await FoodRestaurant.findByIdAndUpdate(restaurantId, { discount: maxDiscount });
    } catch (err) {
        console.error('Error syncing restaurant discount:', err);
    }
};

// Restaurant: Create Promocode
export const createPromocode = async (req, res, next) => {
  try {
    const restaurantId = req.user?.userId;
    const { code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, expiryDate, usageLimit } = req.body;

    if (!code || !description || !discountType || !discountValue || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Check if code already exists for this restaurant
    const existingCode = await Promocode.findOne({ restaurantId, code: code.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ success: false, message: 'Promocode with this code already exists for your restaurant' });
    }

    const promocode = await Promocode.create({
      restaurantId,
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      expiryDate,
      usageLimit: usageLimit || null,
    });

    await syncRestaurantDiscount(restaurantId);

    return sendResponse(res, 201, 'Promocode created successfully', { promocode });
  } catch (error) {
    next(error);
  }
};

// Restaurant: Get all Promocodes
export const getRestaurantPromocodes = async (req, res, next) => {
  try {
    const restaurantId = req.user?.userId;
    const promocodes = await Promocode.find({ restaurantId }).sort('-createdAt');

    return sendResponse(res, 200, 'Promocodes fetched successfully', { promocodeList: promocodes });
  } catch (error) {
    next(error);
  }
};

// Restaurant: Toggle Status
export const togglePromocodeStatus = async (req, res, next) => {
  try {
    const restaurantId = req.user?.userId;
    const { id } = req.params;
    const { isActive } = req.body;

    const promocode = await Promocode.findOneAndUpdate(
      { _id: id, restaurantId },
      { isActive },
      { new: true, runValidators: true }
    );

    if (!promocode) {
      return res.status(404).json({ success: false, message: 'Promocode not found or you do not have permission' });
    }

    await syncRestaurantDiscount(restaurantId);

    return sendResponse(res, 200, 'Promocode status updated', { promocode });
  } catch (error) {
    next(error);
  }
};

// Restaurant: Delete Promocode
export const deletePromocode = async (req, res, next) => {
  try {
    const restaurantId = req.user?.userId;
    const { id } = req.params;

    const promocode = await Promocode.findOneAndDelete({ _id: id, restaurantId });

    if (!promocode) {
      return res.status(404).json({ success: false, message: 'Promocode not found or you do not have permission' });
    }

    await syncRestaurantDiscount(restaurantId);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// User: Get active Promocodes for a Restaurant
export const getActivePromocodes = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const promocodes = await Promocode.find({ 
      restaurantId, 
      isActive: true,
      expiryDate: { $gt: new Date() }
    }).sort('-createdAt');

    // Filter out those that have reached usage limit
    const validPromocodes = promocodes.filter(p => !p.usageLimit || p.usageCount < p.usageLimit);

    return sendResponse(res, 200, 'Active promocodes fetched', { promocodeList: validPromocodes });
  } catch (error) {
    next(error);
  }
};

// User: Validate Promocode
export const validatePromocode = async (req, res, next) => {
  try {
    const { code, restaurantId, orderAmount } = req.body;

    if (!code || !restaurantId || !orderAmount) {
      return res.status(400).json({ success: false, message: 'Please provide code, restaurantId and orderAmount' });
    }

    const promocode = await Promocode.findOne({ 
      restaurantId, 
      code: code.toUpperCase(),
      isActive: true 
    });

    if (!promocode) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive promocode' });
    }

    if (new Date(promocode.expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'This promocode has expired' });
    }

    if (promocode.usageLimit && promocode.usageCount >= promocode.usageLimit) {
      return res.status(400).json({ success: false, message: 'This promocode has reached its usage limit' });
    }

    if (orderAmount < promocode.minOrderAmount) {
      return res.status(400).json({ success: false, message: `Minimum order amount of ₹${promocode.minOrderAmount} is required` });
    }

    // Calculate discount
    let discountAmount = 0;
    if (promocode.discountType === 'FLAT') {
      discountAmount = promocode.discountValue;
    } else if (promocode.discountType === 'PERCENTAGE') {
      discountAmount = (orderAmount * promocode.discountValue) / 100;
      if (promocode.maxDiscountAmount && discountAmount > promocode.maxDiscountAmount) {
        discountAmount = promocode.maxDiscountAmount;
      }
    }

    // Ensure discount is not greater than order amount
    if (discountAmount > orderAmount) {
      discountAmount = orderAmount;
    }

    return sendResponse(res, 200, 'Promocode applied successfully', {
      promocode,
      discountAmount,
      finalAmount: orderAmount - discountAmount
    });
  } catch (error) {
    next(error);
  }
};
