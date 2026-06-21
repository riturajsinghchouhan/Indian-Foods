import mongoose from 'mongoose';
import { FoodOrder, FoodSettings } from '../models/order.model.js';
import { FoodRestaurant } from '../../restaurant/models/restaurant.model.js';
import { FoodDeliveryPartner } from '../../delivery/models/deliveryPartner.model.js';
import { FoodDeliveryCashDeposit } from '../../delivery/models/foodDeliveryCashDeposit.model.js';
import { FoodDeliveryCashLimit } from '../../admin/models/deliveryCashLimit.model.js';
import { FoodFeeSettings } from '../../admin/models/feeSettings.model.js';
import { ValidationError, NotFoundError } from '../../../../core/auth/errors.js';
import { logger } from '../../../../utils/logger.js';
import { config } from '../../../../config/env.js';
import { getIO, rooms } from '../../../../config/socket.js';
import { addOrderJob } from '../../../../queues/producers/order.producer.js';
import {
  buildDeliverySocketPayload,
  buildOrderIdentityFilter,
  haversineKm,
  notifyOwnerSafely,
  notifyOwnersSafely,
} from './order.helpers.js';

async function filterPartnersByCashLimit(partners = [], options = {}) {
  // Since we are removing cash limit checks, we simply map partners to ensure they have expected shape.
  // We allow all partners to bypass cash limit.
  if (!Array.isArray(partners) || partners.length === 0) return [];
  
  return partners.map((p) => ({
    ...p,
    availableCashLimit: Number.MAX_SAFE_INTEGER,
    allowOverLimit: true,
    requiredCashForOrder: 0,
  }));
}

async function listNearbyOnlineDeliveryPartners(
  restaurantId,
  { maxKm = 15, limit = 25, requiredAmount = 0, allowOverLimitFallback = true } = {},
) {
  const rId = (restaurantId?._id || restaurantId).toString();
  const restaurant = await FoodRestaurant.findById(rId)
    .select("location")
    .lean();

  if (!restaurant?.location?.coordinates?.length) {
    // Restaurant has no GPS coordinates — cannot calculate distance to riders.
    // Return empty so no one gets notified until restaurant sets their location.
    logger.warn(`listNearbyOnlineDeliveryPartners: Restaurant ${rId} has no location coordinates. Skipping dispatch.`);
    return { restaurant: null, partners: [] };
  }

  const [rLng, rLat] = restaurant.location.coordinates;
  const allOnline = await FoodDeliveryPartner.find({
    availabilityStatus: "online",
  })
    .select("_id status lastLat lastLng lastLocationAt name")
    .lean();

  const scored = [];
  const allowedStatuses = ['approved'];
  const STALE_GPS_MS = 10 * 60 * 1000;

  for (const p of allOnline) {
    if (!allowedStatuses.includes(p.status)) continue;

    // Skip riders with no GPS data or stale location — they cannot be distance-verified
    const isStale = !p.lastLocationAt || (Date.now() - new Date(p.lastLocationAt).getTime()) > STALE_GPS_MS;
    if (p.lastLat == null || p.lastLng == null || isStale) {
      continue;
    }

    const d = haversineKm(rLat, rLng, p.lastLat, p.lastLng);
    if (Number.isFinite(d) && d <= maxKm) {
      scored.push({ partnerId: p._id, distanceKm: d, status: p.status });
    }
  }

  scored.sort((a, b) => a.distanceKm - b.distanceKm);
  const picked = scored.slice(0, Math.max(1, limit));

  // No fallback — if no riders found in radius, return empty.
  // The tiered dispatch will expand radius on next attempt automatically.
  if (picked.length === 0) {
    return { partners: [] };
  }

  const final = picked.filter(p => p.status === 'approved');

  const cashEligibleFinal = await filterPartnersByCashLimit(final, {
    requiredAmount,
    allowOverLimitFallback,
  });

  return { partners: cashEligibleFinal };
}

export async function getDispatchSettings() {
  return { dispatchMode: "auto" };
}

export async function updateDispatchSettings(dispatchMode, adminId) {
  // Always set to auto
  await FoodSettings.findOneAndUpdate(
    { key: "dispatch" },
    {
      $set: {
        dispatchMode: "auto",
        updatedBy: { role: "ADMIN", adminId, at: new Date() },
      },
    },
    { upsert: true, new: true },
  );
  return getDispatchSettings();
}

export async function tryAutoAssign(orderId, options = {}) {
  const attempt = options.attempt || 1;
  const lockTimeout = 20000; // 20 seconds lock interval

  const dispatchableStatuses = new Set([
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'ready',
    'picked_up',
  ]);

  const order = await FoodOrder.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(orderId),
      orderStatus: { $in: Array.from(dispatchableStatuses) },
      $or: [
        { 'dispatch.status': 'unassigned' },
        {
          'dispatch.status': 'assigned',
          'dispatch.acceptedAt': { $exists: false },
          'dispatch.assignedAt': { $lt: new Date(Date.now() - lockTimeout) }
        }
      ],
      'dispatch.dispatchingAt': { $exists: false }
    },
    {
      $set: { 'dispatch.dispatchingAt': new Date() }
    },
    { new: true }
  ).populate(['restaurantId', 'userId']);

  if (!order) {
    logger.info(`tryAutoAssign: Skip for ${orderId} (not dispatchable, already dispatching, accepted, or multi-attempt lock active).`);
    return null;
  }

  try {
    const offeredIds = (order.dispatch?.offeredTo || []).map(o => o.partnerId.toString());
    const paymentMethod = String(order.payment?.method || 'cash').toLowerCase();
    const isCashOrder = paymentMethod === 'cash';
    const requiredAmount = isCashOrder ? Number(order?.pricing?.total || 0) : 0;
    
    // RADIUS EXPANSION LOGIC
    const feeSettings = await FoodFeeSettings.findOne({ isActive: true }).lean();
    let radiusTiers = feeSettings?.dispatchRadiusTiers || [];
    if (!radiusTiers.length) {
      radiusTiers = [2, 4, 6, 8, 10]; // fallback
    }
    const maxKm = radiusTiers[Math.min(attempt - 1, radiusTiers.length - 1)];

    const searchOptions = {
      maxKm,
      limit: 10000, // No artificial limit, fetch all in the radius
      requiredAmount: 0,
      allowOverLimitFallback: true,
    };
    const { partners } = await listNearbyOnlineDeliveryPartners(order.restaurantId, searchOptions);
    
    // TIERED ALERT LOGIC
    // Phase 2: Broadcast to all (Attempt 4+)
    // Phase 3: Admin Alert (Attempt 6+ or roughly 2 mins)
    const isPhase2 = attempt >= 4;
    const isPhase3 = attempt >= 6; // ~2 minutes (20s * 6)

    if (isPhase3) {
      logger.error(`[CRITICAL] Order ${order._id} unassigned for ${attempt} mins. Triggering Admin Alert (Phase 3).`);
      // Notify Admin via Push (Web/Mobile)
      try {
        await notifyOwnersSafely(
          [{ ownerType: 'ADMIN', ownerId: 'GLOBAL' }], // Use GLOBAL or specific admin group if defined
          {
            title: 'Unassigned Order Crisis!',
            body: `Order #${order.order_id || order._id} has not been picked up for 5+ minutes. Manual intervention required!`,
            data: { type: 'admin_alert_unassigned', orderId: order._id.toString() }
          }
        );
      } catch (err) {
        logger.warn(`Admin notification failed: ${err.message}`);
      }
    }

    const eligible = partners.filter(p => !offeredIds.includes(p.partnerId.toString()));

    if (eligible.length === 0) {
      logger.info(`tryAutoAssign: No NEW eligible partners in ${maxKm}km for order ${order._id}. Restarting hunt...`);
      
      // If we ran out of new eligible partners, we might want to re-offer to everyone (Phase 2 style)
      const io = getIO();
      if (io && partners.length > 0) {
        const payload = buildDeliverySocketPayload(order, order.restaurantId);
        for (const p of partners) {
          const roomName = rooms.delivery(p.partnerId);
          io.to(roomName).emit('new_order_available', { ...payload, pickupDistanceKm: p.distanceKm });
        }
        
        // Also send FCM push for riders with app in background/closed
        const reNotifyList = partners.map(p => ({
          ownerType: 'DELIVERY_PARTNER',
          ownerId: p.partnerId,
        }));
        try {
          await notifyOwnersSafely(
            reNotifyList,
            {
              title: '🚴 Order Still Waiting!',
              body: `Order #${order.order_id || order._id} needs a delivery partner. Accept now!`,
              dataOnly: true,
              data: { type: 'new_order', orderId: order._id.toString() },
            },
          );
        } catch (err) {
          logger.warn(`Re-broadcast push notifications failed: ${err.message}`);
        }
      }

      // Re-queue itself to keep trying
      await addOrderJob({
        action: 'DISPATCH_TIMEOUT_CHECK',
        orderMongoId: order._id.toString(),
        orderId: order._id.toString(),
        attempt: attempt + 1
      }, { delay: 20000 }); // Retry faster (20s) if no one found

      return order;
    }

    const io = getIO();
    const payload = buildDeliverySocketPayload(order, order.restaurantId);

    // No batching limit - send to ALL eligible riders in the current radius
    const phase1Batch = eligible;

    if (isPhase2) {
      // PHASE 2 BROADCAST: Notify everyone remaining
      logger.info(`[Phase 2] Broadcasting order ${order._id} to ${eligible.length} riders.`);
      for (const p of eligible) {
        const roomName = rooms.delivery(p.partnerId);
        if (io) {
          const eventPayload = { ...payload, pickupDistanceKm: p.distanceKm };
          io.to(roomName).emit('new_order_available', eventPayload);
        }
      }
      
      // Phase 2 also needs FCM push for riders with app in background/closed
      const phase2NotifyList = eligible.map(p => ({
        ownerType: 'DELIVERY_PARTNER',
        ownerId: p.partnerId,
      }));
      try {
        await notifyOwnersSafely(
          phase2NotifyList,
          {
            title: '🚴 New Order Nearby!',
            body: `Order #${order.order_id || order._id} is waiting. Be the first to accept!`,
            dataOnly: true,
            data: { type: 'new_order', orderId: order._id.toString() },
          },
        );
      } catch (err) {
        logger.warn(`Phase 2 push notifications failed: ${err.message}`);
      }
    } else {
      // PHASE 1: Offer to top few nearby riders (avoid single-partner bottleneck).
      const lead = phase1Batch[0];
      if (lead) {
        logger.info(`[Phase 1] Offering order ${order._id} to ${phase1Batch.length} riders (lead ${lead.partnerId}, ${lead.distanceKm}km)`);
      }

      for (const p of phase1Batch) {
        const roomName = rooms.delivery(p.partnerId);
        if (io) {
          const eventPayload = { ...payload, pickupDistanceKm: p.distanceKm };
          io.to(roomName).emit('new_order_available', eventPayload);
        }
      }

      // Send push notifications to ALL riders in the batch (not just lead)
      // so riders whose socket is disconnected or app is in background also get triggered
      const notifyList = phase1Batch.map(p => ({
        ownerType: 'DELIVERY_PARTNER',
        ownerId: p.partnerId,
      }));
      try {
        await notifyOwnersSafely(
          notifyList,
          {
            title: '🚴 New Order Nearby!',
            body: `Order #${order.order_id || order._id} is waiting. Be the first to accept!`,
            dataOnly: true,
            data: { type: 'new_order', orderId: order._id.toString() },
          },
        );
      } catch (err) {
        logger.warn(`Push notifications failed for batch: ${err.message}`);
      }
    }

    const partnersToRecord = isPhase2 ? eligible : phase1Batch;
    const offeredToEntries = partnersToRecord.map(p => ({
      partnerId: p.partnerId,
      at: new Date(),
      action: 'offered',
      allowOverLimit: Boolean(p.allowOverLimit),
      requiredCashForOrder: Number(p.requiredCashForOrder || requiredAmount || 0),
    }));

    order.dispatch.status = 'unassigned';
    order.dispatch.deliveryPartnerId = null;
    order.dispatch.offeredTo.push(...offeredToEntries);
    await order.save();

    // Re-check in 20s
    await addOrderJob({
      action: 'DISPATCH_TIMEOUT_CHECK',
      orderMongoId: order._id.toString(),
      orderId: order._id.toString(),
      attempt: attempt + 1
    }, { delay: 20000 });

    return order;
  } finally {
    await FoodOrder.findByIdAndUpdate(orderId, {
      $unset: { 'dispatch.dispatchingAt': '' },
    });
  }
}


export async function processDispatchTimeout(orderId, partnerId, options = {}) {
  const order = await FoodOrder.findById(orderId);
  if (!order) return;

  const stillAssigned = order.dispatch?.status === 'assigned' &&
    String(order.dispatch?.deliveryPartnerId) === String(partnerId) &&
    !order.dispatch?.acceptedAt;

  if (stillAssigned) {
    logger.info(`Dispatch timeout for partner ${partnerId} on order ${orderId}. Re-trying hunt...`);
    const offer = order.dispatch.offeredTo.find(
      o => String(o.partnerId) === String(partnerId) && o.action === 'offered'
    );
    if (offer) offer.action = 'timeout';

    order.dispatch.status = 'unassigned';
    order.dispatch.deliveryPartnerId = null;
    await order.save();
    
    const attempt = options.attempt || (order.dispatch?.offeredTo?.length || 0) + 1;
    await tryAutoAssign(orderId, { attempt });
  } else if (order.dispatch?.status === 'unassigned') {
    // If it's already unassigned (e.g. from a previous timeout), just keep hunting
    const attempt = options.attempt || (order.dispatch?.offeredTo?.length || 0) + 1;
    await tryAutoAssign(orderId, { attempt });
  }
}


export async function resendDeliveryNotificationRestaurant(orderId, restaurantId) {
  const identity = buildOrderIdentityFilter(orderId);
  const order = await FoodOrder.findOne({
    ...identity,
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  });

  if (!order) throw new NotFoundError('Order not found');

  const activeStatuses = ['confirmed', 'preparing', 'ready_for_pickup', 'ready'];
  if (!activeStatuses.includes(order.orderStatus)) {
    throw new ValidationError(`Cannot resend notification for order in status: ${order.orderStatus}`);
  }

  if (order.dispatch?.status === 'accepted') {
    throw new ValidationError('A delivery partner has already accepted this order.');
  }

  const paymentMethod = String(order.payment?.method || 'cash').toLowerCase();
  const requiredAmount = paymentMethod === 'cash' ? Number(order?.pricing?.total || 0) : 0;
  const preview = await listNearbyOnlineDeliveryPartners(order.restaurantId, {
    maxKm: 15,
    limit: 10000, // No artificial limit
    requiredAmount,
    allowOverLimitFallback: true,
  });
  const shortlistedCount = Array.isArray(preview?.partners) ? preview.partners.length : 0;

  order.dispatch.status = 'unassigned';
  order.dispatch.deliveryPartnerId = null;
  order.dispatch.offeredTo = [];
  await order.save();

  await tryAutoAssign(order._id);

  const refreshed = await FoodOrder.findById(order._id)
    .select('dispatch.offeredTo dispatch.status dispatch.deliveryPartnerId')
    .lean();
  const notifiedCount = Array.isArray(refreshed?.dispatch?.offeredTo)
    ? refreshed.dispatch.offeredTo.filter((entry) => entry?.action === 'offered').length
    : 0;
  const notifiedPartnerIds = Array.isArray(refreshed?.dispatch?.offeredTo)
    ? refreshed.dispatch.offeredTo
        .filter((entry) => entry?.action === 'offered' && entry?.partnerId)
        .map((entry) => String(entry.partnerId))
    : [];
  const io = getIO();
  const connectedSocketCount = io
    ? notifiedPartnerIds.reduce((count, pid) => {
        const roomName = rooms.delivery(pid);
        const roomSize = io?.sockets?.adapter?.rooms?.get(roomName)?.size || 0;
        return count + roomSize;
      }, 0)
    : 0;

  return {
    success: true,
    notifiedCount,
    shortlistedCount,
    requiredAmount,
    connectedSocketCount,
    dispatchStatus: refreshed?.dispatch?.status || 'unassigned',
  };
}
