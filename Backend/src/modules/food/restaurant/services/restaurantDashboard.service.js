import mongoose from 'mongoose';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodTransaction } from '../../orders/models/foodTransaction.model.js';
import { FoodRestaurant } from '../models/restaurant.model.js';
import { FoodItem } from '../../admin/models/food.model.js';
import { FoodAddon } from '../models/foodAddon.model.js';
import { FoodSupportTicket } from '../../user/models/supportTicket.model.js';
import { getRestaurantFinance } from './restaurantFinance.service.js';

const CANCELLED_STATUSES = ['cancelled_by_user', 'cancelled_by_restaurant', 'cancelled_by_admin', 'dead'];
const PENDING_STATUSES = ['created', 'confirmed'];
const PROCESSING_STATUSES = ['preparing', 'ready_for_pickup', 'picked_up'];
const DELIVERED_STATUS = 'delivered';

const STATUS_COLORS = {
    Pending: '#f59e0b',
    Processing: '#3b82f6',
    Delivered: '#10b981',
    Cancelled: '#ef4444',
    Other: '#94a3b8',
};

const PAYMENT_COLORS = {
    Online: '#8b5cf6',
    COD: '#f97316',
    Wallet: '#06b6d4',
    Other: '#64748b',
};

function getPeriodRange(period) {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (String(period || 'month').toLowerCase()) {
        case 'today': {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            return { start, end };
        }
        case 'week': {
            const start = new Date(now);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            return { start, end };
        }
        case 'month': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start, end };
        }
        case 'year': {
            const start = new Date(now.getFullYear(), 0, 1);
            return { start, end };
        }
        case 'overall':
        default:
            return null;
    }
}

function formatDayLabel(date) {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatMonthLabel(year, monthIndex) {
    return new Date(year, monthIndex - 1, 1).toLocaleString('en-IN', { month: 'short' });
}

function classifyOrderBucket(status) {
    const s = String(status || '').toLowerCase();
    if (PENDING_STATUSES.includes(s)) return 'Pending';
    if (PROCESSING_STATUSES.includes(s)) return 'Processing';
    if (s === DELIVERED_STATUS) return 'Delivered';
    if (CANCELLED_STATUSES.includes(s)) return 'Cancelled';
    return 'Other';
}

function classifyPayment(method) {
    const m = String(method || '').toLowerCase();
    if (m === 'cash' || m === 'cod') return 'COD';
    if (m === 'wallet') return 'Wallet';
    if (m === 'razorpay' || m === 'razorpay_qr' || m === 'online') return 'Online';
    return 'Other';
}

export async function getRestaurantDashboardStats(restaurantId, query = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) return null;

    const rid = new mongoose.Types.ObjectId(restaurantId);
    const period = String(query.period || 'month').toLowerCase();
    const periodRange = getPeriodRange(period);

    const orderMatch = { restaurantId: rid };
    if (periodRange) {
        orderMatch.createdAt = { $gte: periodRange.start, $lte: periodRange.end };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const lineStart = new Date();
    lineStart.setDate(lineStart.getDate() - 13);
    lineStart.setHours(0, 0, 0, 0);

    const monthlyStart = new Date();
    monthlyStart.setMonth(monthlyStart.getMonth() - 5);
    monthlyStart.setDate(1);
    monthlyStart.setHours(0, 0, 0, 0);

    const [
        restaurant,
        orderTotalsAgg,
        todayOrdersAgg,
        statusAgg,
        paymentAgg,
        dailyAgg,
        monthlyAgg,
        topItemsAgg,
        menuStatsAgg,
        addonCount,
        complaintsCount,
        recentOrders,
        financeSnapshot,
    ] = await Promise.all([
        FoodRestaurant.findById(rid)
            .select('restaurantName rating totalRatings isAcceptingOrders status createdAt')
            .lean(),
        FoodOrder.aggregate([
            { $match: orderMatch },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    delivered: { $sum: { $cond: [{ $eq: ['$orderStatus', DELIVERED_STATUS] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $in: ['$orderStatus', CANCELLED_STATUSES] }, 1, 0] } },
                    pending: { $sum: { $cond: [{ $in: ['$orderStatus', PENDING_STATUSES] }, 1, 0] } },
                    processing: { $sum: { $cond: [{ $in: ['$orderStatus', PROCESSING_STATUSES] }, 1, 0] } },
                    revenue: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', DELIVERED_STATUS] }, { $ifNull: ['$pricing.total', 0] }, 0],
                        },
                    },
                    avgOrderValue: {
                        $avg: {
                            $cond: [{ $eq: ['$orderStatus', DELIVERED_STATUS] }, { $ifNull: ['$pricing.total', 0] }, null],
                        },
                    },
                },
            },
        ]),
        FoodOrder.aggregate([
            { $match: { restaurantId: rid, createdAt: { $gte: todayStart, $lte: todayEnd } } },
            { $group: { _id: null, count: { $sum: 1 } } },
        ]),
        FoodOrder.aggregate([
            { $match: orderMatch },
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
        ]),
        FoodOrder.aggregate([
            { $match: orderMatch },
            { $group: { _id: '$payment.method', count: { $sum: 1 } } },
        ]),
        FoodOrder.aggregate([
            {
                $match: {
                    restaurantId: rid,
                    createdAt: { $gte: lineStart, $lte: todayEnd },
                },
            },
            {
                $group: {
                    _id: {
                        y: { $year: '$createdAt' },
                        m: { $month: '$createdAt' },
                        d: { $dayOfMonth: '$createdAt' },
                    },
                    orders: { $sum: 1 },
                    revenue: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', DELIVERED_STATUS] }, { $ifNull: ['$pricing.total', 0] }, 0],
                        },
                    },
                },
            },
            { $sort: { '_id.y': 1, '_id.m': 1, '_id.d': 1 } },
        ]),
        FoodOrder.aggregate([
            {
                $match: {
                    restaurantId: rid,
                    createdAt: { $gte: monthlyStart, $lte: todayEnd },
                },
            },
            {
                $group: {
                    _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
                    orders: { $sum: 1 },
                    revenue: {
                        $sum: {
                            $cond: [{ $eq: ['$orderStatus', DELIVERED_STATUS] }, { $ifNull: ['$pricing.total', 0] }, 0],
                        },
                    },
                },
            },
            { $sort: { '_id.y': 1, '_id.m': 1 } },
        ]),
        FoodOrder.aggregate([
            { $match: { ...orderMatch, orderStatus: DELIVERED_STATUS } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.name',
                    orders: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                },
            },
            { $sort: { orders: -1 } },
            { $limit: 5 },
        ]),
        FoodItem.aggregate([
            { $match: { restaurantId: rid } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    available: { $sum: { $cond: ['$isAvailable', 1, 0] } },
                    approved: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'approved'] }, 1, 0] } },
                },
            },
        ]),
        FoodAddon.countDocuments({ restaurantId: rid }),
        FoodSupportTicket.countDocuments({ restaurantId: rid, type: 'order' }),
        FoodOrder.find(orderMatch)
            .sort({ createdAt: -1 })
            .limit(6)
            .select('orderId orderStatus pricing.total payment.method createdAt')
            .lean(),
        getRestaurantFinance(restaurantId).catch(() => null),
    ]);

    const totals = orderTotalsAgg[0] || {};
    const totalOrders = Number(totals.totalOrders || 0);
    const deliveredOrders = Number(totals.delivered || 0);
    const cancelledOrders = Number(totals.cancelled || 0);
    const pendingOrders = Number(totals.pending || 0);
    const processingOrders = Number(totals.processing || 0);
    const totalRevenue = Number(totals.revenue || 0);
    const averageOrderValue = Number(totals.avgOrderValue || 0);
    const todayOrders = Number(todayOrdersAgg[0]?.count || 0);

    const menuStats = menuStatsAgg[0] || {};
    const availableBalance = Number(financeSnapshot?.currentCycle?.estimatedPayout || 0);
    const cycleEarnings = Number(financeSnapshot?.currentCycle?.totalEarnings || 0);

    const orderStatusMap = {};
    statusAgg.forEach((row) => {
        const bucket = classifyOrderBucket(row._id);
        orderStatusMap[bucket] = (orderStatusMap[bucket] || 0) + Number(row.count || 0);
    });

    const orderStatusBreakdown = Object.entries(orderStatusMap).map(([label, value]) => ({
        label,
        value,
        color: STATUS_COLORS[label] || STATUS_COLORS.Other,
    }));

    const paymentMap = {};
    paymentAgg.forEach((row) => {
        const bucket = classifyPayment(row._id);
        paymentMap[bucket] = (paymentMap[bucket] || 0) + Number(row.count || 0);
    });

    const paymentMethodBreakdown = Object.entries(paymentMap).map(([label, value]) => ({
        label,
        value,
        color: PAYMENT_COLORS[label] || PAYMENT_COLORS.Other,
    }));

    const dailyMap = new Map();
    dailyAgg.forEach((row) => {
        const key = `${row._id.y}-${row._id.m}-${row._id.d}`;
        dailyMap.set(key, {
            orders: Number(row.orders || 0),
            revenue: Number(row.revenue || 0),
        });
    });

    const revenueTrend = [];
    for (let i = 13; i >= 0; i -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        const point = dailyMap.get(key) || { orders: 0, revenue: 0 };
        revenueTrend.push({
            date: formatDayLabel(d),
            orders: point.orders,
            revenue: Math.round(point.revenue),
        });
    }

    const monthlyTrend = monthlyAgg.map((row) => ({
        month: formatMonthLabel(row._id.y, row._id.m),
        orders: Number(row.orders || 0),
        revenue: Math.round(Number(row.revenue || 0)),
    }));

    const topItems = topItemsAgg.map((row) => ({
        name: row._id || 'Item',
        orders: Number(row.orders || 0),
        revenue: Math.round(Number(row.revenue || 0)),
    }));

    const completionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
    const cancellationRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;

    return {
        period,
        restaurant: {
            name: restaurant?.restaurantName || '',
            isOnline: Boolean(restaurant?.isAcceptingOrders),
            status: restaurant?.status || 'approved',
            averageRating: Number(restaurant?.rating || 0),
            totalRatings: Number(restaurant?.totalRatings || 0),
            joinedAt: restaurant?.createdAt || null,
        },
        kpis: {
            totalOrders,
            todayOrders,
            pendingOrders,
            processingOrders,
            deliveredOrders,
            cancelledOrders,
            totalRevenue: Math.round(totalRevenue),
            availableBalance: Math.round(availableBalance),
            cycleEarnings: Math.round(cycleEarnings),
            averageOrderValue: Math.round(averageOrderValue),
            averageRating: Number(restaurant?.rating || 0),
            totalRatings: Number(restaurant?.totalRatings || 0),
            menuItems: Number(menuStats.total || 0),
            activeMenuItems: Number(menuStats.available || 0),
            approvedMenuItems: Number(menuStats.approved || 0),
            addons: Number(addonCount || 0),
            complaints: Number(complaintsCount || 0),
            completionRate,
            cancellationRate,
        },
        orderStatusBreakdown,
        paymentMethodBreakdown,
        revenueTrend,
        monthlyTrend,
        topItems,
        recentOrders: recentOrders.map((o) => ({
            orderId: o.orderId,
            status: o.orderStatus,
            total: Number(o?.pricing?.total || 0),
            paymentMethod: o?.payment?.method || '',
            createdAt: o.createdAt,
        })),
    };
}
