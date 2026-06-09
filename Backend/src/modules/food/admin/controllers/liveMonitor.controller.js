import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { FoodOrder } from '../../orders/models/order.model.js';

export async function getLiveMonitorStatus(req, res, next) {
    try {
        // Use a 24-hour rolling window instead of midnight to avoid timezone issues
        const today = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Fetch All Approved Restaurants
        const restaurants = await FoodRestaurant.find({ status: 'approved' })
            .select('restaurantName logo location addressLine1 area city state openingTime closingTime openDays isAcceptingOrders ownerName ownerPhone')
            .lean();

        // Fetch Outlet Timings for these restaurants
        const restaurantIds = restaurants.map(r => r._id);
        const { FoodRestaurantOutletTimings } = await import('../../restaurant/models/outletTimings.model.js');
        const outletTimings = await FoodRestaurantOutletTimings.find({ restaurantId: { $in: restaurantIds } }).lean();
        const timingsMap = {};
        outletTimings.forEach(t => {
            timingsMap[t.restaurantId.toString()] = t;
        });

        // Attach timings
        restaurants.forEach(r => {
            r.outletTimings = timingsMap[r._id.toString()];
        });

        // Get orders for restaurants today
        const rOrders = await FoodOrder.aggregate([
            { $match: { createdAt: { $gte: today } } },
            { $group: {
                _id: '$restaurantId',
                totalOrders: { $sum: 1 },
                deliveredOrders: {
                    $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
                },
                activeOrders: {
                    $sum: { $cond: [{ $in: ['$orderStatus', ['created', 'confirmed', 'preparing', 'ready_for_pickup', 'reached_pickup', 'picked_up', 'reached_drop']] }, 1, 0] }
                },
                cancelledOrders: {
                    $sum: { $cond: [{ $in: ['$orderStatus', ['cancelled_by_restaurant', 'cancelled_by_admin', 'cancelled_by_user', 'dead']] }, 1, 0] }
                },
                revenue: {
                    $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, { $ifNull: ['$pricing.total', 0] }, 0] }
                }
            }}
        ]);

        const rOrdersMap = {};
        rOrders.forEach(o => {
            rOrdersMap[o._id.toString()] = {
                totalOrders: o.totalOrders,
                deliveredOrders: o.deliveredOrders,
                activeOrders: o.activeOrders,
                cancelledOrders: o.cancelledOrders,
                revenue: o.revenue
            };
        });

        const formattedRestaurants = restaurants.map(r => ({
            ...r,
            stats: rOrdersMap[r._id.toString()] || { totalOrders: 0, deliveredOrders: 0, activeOrders: 0, cancelledOrders: 0, revenue: 0 }
        }));

        // Fetch ALL Delivery Partners (approved)
        const deliveryPartners = await FoodDeliveryPartner.find({ status: 'approved' })
            .select('name phone profilePhoto lastLat lastLng lastLocationAt vehicleType vehicleNumber availabilityStatus shiftStartPic shiftStartTime shiftStartAddress')
            .lean();

        // Get active orders assigned to these delivery partners
        const dpIds = deliveryPartners.map(dp => dp._id);
        const activeOrdersForDp = await FoodOrder.find({
            'dispatch.deliveryPartnerId': { $in: dpIds },
            orderStatus: { $in: ['created', 'confirmed', 'preparing', 'ready_for_pickup', 'reached_pickup', 'picked_up', 'reached_drop'] }
        }).select('_id orderStatus deliveryAddress restaurantId dispatch.deliveryPartnerId').lean();

        const activeOrdersMap = {};
        activeOrdersForDp.forEach(o => {
            if (o.dispatch && o.dispatch.deliveryPartnerId) {
                activeOrdersMap[o.dispatch.deliveryPartnerId.toString()] = o;
            }
        });

        // Get ALL orders today for these partners
        const allDpOrdersToday = await FoodOrder.find({
            createdAt: { $gte: today },
            'dispatch.deliveryPartnerId': { $in: dpIds }
        })
        .select('_id orderId order_id orderStatus customerName createdAt pricing dispatch')
        .populate('restaurantId', 'restaurantName')
        .populate('userId', 'fullName name')
        .lean();

        const dpOrdersMap = {};
        allDpOrdersToday.forEach(o => {
            const dpId = o.dispatch?.deliveryPartnerId?.toString();
            if (dpId) {
                if (!dpOrdersMap[dpId]) dpOrdersMap[dpId] = { deliveredCount: 0, orders: [] };
                
                // Format order for frontend
                dpOrdersMap[dpId].orders.push({
                    id: o._id,
                    orderId: o.orderId || o.order_id || 'N/A',
                    status: o.orderStatus,
                    restaurantName: o.restaurantId?.restaurantName || 'Unknown',
                    userName: o.customerName || o.userId?.fullName || o.userId?.name || 'Unknown',
                    time: o.createdAt,
                    amount: o.pricing?.total || 0
                });

                if (o.orderStatus === 'delivered') {
                    dpOrdersMap[dpId].deliveredCount++;
                }
            }
        });

        const formattedDeliveryPartners = deliveryPartners.map(dp => {
            const dpData = dpOrdersMap[dp._id.toString()] || { deliveredCount: 0, orders: [] };
            return {
                ...dp,
                currentOrder: activeOrdersMap[dp._id.toString()] || null,
                deliveredToday: dpData.deliveredCount,
                todayOrders: dpData.orders
            };
        });

        res.status(200).json({
            success: true,
            data: {
                restaurants: formattedRestaurants,
                deliveryPartners: formattedDeliveryPartners
            }
        });
    } catch (error) {
        next(error);
    }
}
