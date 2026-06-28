import { useEffect, useRef, useState, useContext } from 'react';
import { toast } from 'sonner';
import { userAPI } from '@food/api';
import { dispatchNotificationInboxRefresh } from '@food/hooks/useNotificationInbox';
import { UserNotificationContext } from '../context/UserNotificationContext';
import {
  acquireUserSocket,
  releaseUserSocket,
  subscribeUserSocketConnection,
} from '@food/utils/userSocketManager';

const debugLog = (...args) => {
  if (import.meta.env.DEV) {
    console.log('📬 [UserSocket]', ...args);
  }
};

/**
 * Hook for user to receive real-time order notifications.
 * Dispatches 'orderStatusNotification' custom event for OrderTrackingCard.
 */
export const useUserNotifications = () => {
  const context = useContext(UserNotificationContext);
  if (context) return context;

  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userId, setUserId] = useState(null);
  const lastDropOtpToastRef = useRef({ key: '', at: 0 });
  const lastOrderStatusToastRef = useRef({ key: '', at: 0 });

  const DROP_OTP_TOAST_ID = 'user-delivery-drop-otp';
  const DROP_OTP_DEDUPE_MS = 15000;
  const ORDER_STATUS_TOAST_ID = 'user-order-status-update';
  const ORDER_STATUS_DEDUPE_MS = 4000;

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await userAPI.getProfile();
        if (response.data?.success && response.data.data?.user) {
          const user = response.data.data.user;
          const id = user._id?.toString() || user.userId || user.id;
          setUserId(id);
        }
      } catch {
        // Not logged in or error
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (!userId) return undefined;

    const sock = acquireUserSocket(userId);
    if (!sock) return undefined;

    socketRef.current = sock;
    debugLog('🔌 Using shared user socket, userId:', userId);

    const unsubConnection = subscribeUserSocketConnection(setIsConnected);

    const onOrderStatus = (data) => {
      debugLog('🔔 Order status update received:', data);

      const title = data.title || `Order #${data.orderId || 'Update'}`;
      const message =
        data.message ||
        `Your order status is now ${String(data.orderStatus || '').replace(/_/g, ' ')}`;

      const isImportant =
        String(data.orderStatus).includes('cancel') ||
        ['ready_for_pickup', 'ready', 'confirmed'].includes(data.orderStatus);
      const isOrderTrackingScreen =
        typeof window !== 'undefined' &&
        String(window.location?.pathname || '').includes('/user/orders/');

      const statusKey = `${String(data.orderId || '')}:${String(data.orderStatus || '')}`;
      const now = Date.now();
      const isDuplicateStatusToast =
        statusKey &&
        statusKey === lastOrderStatusToastRef.current.key &&
        now - lastOrderStatusToastRef.current.at < ORDER_STATUS_DEDUPE_MS;

      if (isImportant && !isOrderTrackingScreen && !isDuplicateStatusToast) {
        lastOrderStatusToastRef.current = { key: statusKey, at: now };
        toast.dismiss(ORDER_STATUS_TOAST_ID);
        toast.message(title, {
          id: ORDER_STATUS_TOAST_ID,
          description: message,
          duration: 6000,
        });
      }

      window.dispatchEvent(
        new CustomEvent('orderStatusNotification', {
          detail: {
            orderMongoId: data.orderMongoId,
            orderId: data.orderId,
            status: data.orderStatus,
            orderStatus: data.orderStatus,
            title,
            message,
            deliveryState: data.deliveryState,
            deliveryVerification: data.deliveryVerification,
            dispatch: data.dispatch,
            deliveryPartner: data.deliveryPartner,
            deliveryPartnerId: data.deliveryPartnerId,
            timestamp: new Date().toISOString(),
          },
        }),
      );
    };

    const onOrderState = (activeOrder) => {
      if (!activeOrder) return;
      window.dispatchEvent(
        new CustomEvent('orderStatusNotification', {
          detail: {
            orderMongoId: activeOrder.orderMongoId || activeOrder._id,
            orderId: activeOrder.orderId || activeOrder.order_id,
            status: activeOrder.orderStatus || activeOrder.status,
            orderStatus: activeOrder.orderStatus || activeOrder.status,
            deliveryState: activeOrder.deliveryState,
            deliveryVerification: activeOrder.deliveryVerification,
            dispatch: activeOrder.dispatch,
            resynced: true,
            timestamp: new Date().toISOString(),
          },
        }),
      );
    };

    const onDropOtp = (payload) => {
      debugLog('🔐 Delivery handover OTP:', payload?.orderId);
      const otp = payload?.otp != null ? String(payload.otp) : '';
      const orderId = payload?.orderId != null ? String(payload.orderId) : '';
      const message = payload?.message != null ? String(payload.message) : '';

      const otpKey = `${orderId}:${otp}`;
      const now = Date.now();
      const lastToast = lastDropOtpToastRef.current;
      const isDuplicateOtp =
        otpKey && otpKey === lastToast.key && now - lastToast.at < DROP_OTP_DEDUPE_MS;

      if (isDuplicateOtp) return;

      lastDropOtpToastRef.current = { key: otpKey, at: now };

      window.dispatchEvent(
        new CustomEvent('deliveryDropOtp', {
          detail: {
            orderMongoId: payload?.orderMongoId,
            orderId,
            otp,
            message,
          },
        }),
      );

      const title = orderId ? `Order ${orderId}` : 'Delivery OTP';
      const parts = [message, otp ? `OTP: ${otp}` : ''].filter(Boolean);

      toast.dismiss(DROP_OTP_TOAST_ID);
      toast.message(title, {
        id: DROP_OTP_TOAST_ID,
        description: parts.join(' — ') || 'Handover OTP from your delivery partner.',
        duration: 12_000,
      });
    };

    const onAdminNotification = (payload) => {
      toast.message(payload?.title || 'Notification', {
        description: payload?.message || 'New broadcast notification received.',
        duration: 8000,
      });
      dispatchNotificationInboxRefresh();
    };

    sock.on('order_status_update', onOrderStatus);
    sock.on('order_state', onOrderState);
    sock.on('delivery_drop_otp', onDropOtp);
    sock.on('admin_notification', onAdminNotification);

    return () => {
      sock.off('order_status_update', onOrderStatus);
      sock.off('order_state', onOrderState);
      sock.off('delivery_drop_otp', onDropOtp);
      sock.off('admin_notification', onAdminNotification);
      unsubConnection();
      socketRef.current = null;
      releaseUserSocket();
    };
  }, [userId]);

  return { isConnected };
};
