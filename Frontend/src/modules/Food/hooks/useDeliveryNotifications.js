import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import io from 'socket.io-client';
import { API_BASE_URL } from '@food/api/config';
import { deliveryAPI } from '@food/api';
import { toast } from 'sonner';
import alertSound from '@food/assets/audio/alert.mp3';

import { dispatchNotificationInboxRefresh } from '@food/hooks/useNotificationInbox';
import {
  getOrderAlertKey,
  getOrderMongoId,
  getOrderAcceptId,
  normalizeIncomingOrder,
} from '@food/utils/orderDispatchId';
import { isValidSocketOrigin, resolveSocketOrigin } from '@food/utils/socketOrigin';
import { DeliveryNotificationContext } from '../context/DeliveryNotificationContext';
import { subscribeDeliveryPartnerOffers } from '@food/realtimeTracking';

const shouldLogDeliverySocket = () => {
  if (typeof window === 'undefined') return import.meta.env.DEV;
  try {
    return (
      import.meta.env.DEV ||
      window.localStorage.getItem('delivery_socket_debug') === '1' ||
      window.location.search.includes('delivery_socket_debug=1')
    );
  } catch {
    return import.meta.env.DEV;
  }
};

const debugLog = (...args) => {
  if (shouldLogDeliverySocket()) {
    console.log('[DeliverySocket]', ...args);
  }
};
const debugWarn = (...args) => {
  if (shouldLogDeliverySocket()) {
    console.warn('[DeliverySocket]', ...args);
  }
};
const debugError = (...args) => {
  console.error('[DeliverySocket]', ...args);
};

if (typeof window !== 'undefined') {
  debugLog('alertSound URL:', alertSound);
}

const resolveAudioSource = (source) => {
  if (!source) return '';
  // Handle ES6 module imports where the URL might be in a 'default' property
  const url = typeof source === 'object' ? (source.default || source) : source;
  return url;
};

const safeReadJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const isRiderOnline = () => {
  try {
    const raw = localStorage.getItem('delivery-v2-online-pref');
    if (raw) {
      const parsed = JSON.parse(raw);
      return !!parsed?.state?.isOnline;
    }
  } catch (e) {}
  return false;
};

const decodeJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((ch) => `%${(`00${ch.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getDeliveryAuthToken = () =>
  localStorage.getItem('delivery_accessToken') || null;

const hasDeliverySession = () => Boolean(getDeliveryAuthToken());

const resolveDeliveryPartnerIdFromClient = () => {
  if (!hasDeliverySession()) return null;

  try {
    const storedUser = safeReadJson('delivery_user') || safeReadJson('deliveryUser');

    const nestedCandidate =
      storedUser?.id ||
      storedUser?._id ||
      storedUser?.userId ||
      storedUser?.deliveryId ||
      storedUser?.deliveryPartnerId ||
      storedUser?.user?.id ||
      storedUser?.user?._id ||
      storedUser?.deliveryPartner?.id ||
      storedUser?.deliveryPartner?._id;

    if (nestedCandidate) return String(nestedCandidate);

    const payload = decodeJwtPayload(getDeliveryAuthToken());
    const tokenCandidate =
      payload?.userId ||
      payload?.id ||
      payload?._id ||
      payload?.sub;

    return tokenCandidate ? String(tokenCandidate) : null;
  } catch {
    return null;
  }
};

const supportsBrowserNotifications = () =>
  typeof window !== 'undefined' && typeof Notification !== 'undefined';

const buildDeliveryOrderNotification = (orderData = {}) => {
  const orderId = orderData.orderId || orderData.orderMongoId || orderData.id || 'New';
  const itemCount = Array.isArray(orderData.items) ? orderData.items.length : 0;
  const total = Number(orderData.total || orderData.pricing?.total || orderData.orderTotal || 0);

  return {
    title: `New order #${orderId}`,
    body: itemCount > 0
      ? `${itemCount} item${itemCount === 1 ? '' : 's'} - ₹${total.toFixed(2)}`
      : 'A new order is available to accept',
    tag: `delivery-order-${orderId}`,
    data: {
      orderId,
      targetUrl: '/delivery',
    },
  };
}

const triggerWebViewNativeNotification = async (orderData = {}) => {
  if (typeof window === 'undefined') return false;

  const bridgePayload = {
    title: 'New delivery order',
    body: `Order #${orderData?.orderId || orderData?.orderMongoId || orderData?.id || ''}`.trim(),
    orderId: orderData?.orderId || orderData?.order_id || '',
    orderMongoId: orderData?.orderMongoId || orderData?.order_mongo_id || '',
    targetUrl: '/delivery',
  };

  try {
    if (
      window.flutter_inappwebview &&
      typeof window.flutter_inappwebview.callHandler === 'function'
    ) {
      const handlerNames = [
        'playNotificationSound',
        'triggerNotificationFeedback',
        'onPushNotification',
      ];

      for (const handlerName of handlerNames) {
        try {
          await window.flutter_inappwebview.callHandler(handlerName, bridgePayload);
          return true;
        } catch {
          // Try next handler name.
        }
      }
    }
  } catch {
    // Ignore bridge failures and fall back to browser/web audio.
  }

  return false;
}


export const useDeliveryNotifications = () => {
  const context = useContext(DeliveryNotificationContext);
  if (context) return context;
  
  // CRITICAL: All hooks must be called unconditionally and in the same order every render
  // Order: useRef -> useState -> useEffect -> useCallback
  
  // Step 1: All refs first (unconditional)
  const socketRef = useRef(null);
  const audioRef = useRef(null);
  const audioUnlockAttemptedRef = useRef(false);
  const activeOrderRef = useRef(null);
  const alertLoopTimerRef = useRef(null);
  const alertLoopStartedAtRef = useRef(0);
  const userInteractedRef = useRef(false);
  const lastAlertAtByOrderRef = useRef(new Map());
  const lastBrowserNotificationAtByOrderRef = useRef(new Map());
  const lastFirebaseOfferAtByOrderRef = useRef(new Map());
  const prevFirebaseOfferKeysRef = useRef(new Set());
  const firebaseDeliveryOffersHealthyRef = useRef(true);
  
  // Step 2: All state hooks (unconditional)
  const [newOrder, setNewOrder] = useState(null);
  const [orderReady, setOrderReady] = useState(null);
  const [orderStatusUpdate, setOrderStatusUpdate] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deliveryPartnerId, setDeliveryPartnerId] = useState(null);
  const [autoKilledOrder, setAutoKilledOrder] = useState(null);
  const [claimedOrderId, setClaimedOrderId] = useState(null); // set when another partner claims an order
  const [adminNotification, setAdminNotification] = useState(null);
  const [deliverySessionToken, setDeliverySessionToken] = useState(() => getDeliveryAuthToken());
  const joinedDeliveryRoomRef = useRef(null);
  const joinedTrackingOrdersRef = useRef(new Set());
  const ALERT_LOOP_INTERVAL_MS = 4500;
  const ALERT_LOOP_MAX_MS = 120000;
  const ALERT_DEDUPE_MS = 15000;
  const BROWSER_NOTIFICATION_DEDUPE_MS = 20000;
  const NOTIFICATION_PERMISSION_ASKED_KEY = 'delivery_notification_permission_asked';

  // Step 3: All callbacks before effects (unconditional)
  const shouldProcessOrderAlert = (orderData = {}) => {
    const key = getOrderAlertKey(orderData);
    if (!key) return true;
    const now = Date.now();
    const last = lastAlertAtByOrderRef.current.get(key) || 0;
    if (now - last < ALERT_DEDUPE_MS) return false;
    lastAlertAtByOrderRef.current.set(key, now);
    return true;
  };

  const shouldShowBrowserNotification = (orderData = {}) => {
    const key = getOrderAlertKey(orderData);
    if (!key) return true;
    const now = Date.now();
    const last = lastBrowserNotificationAtByOrderRef.current.get(key) || 0;
    if (now - last < BROWSER_NOTIFICATION_DEDUPE_MS) return false;
    lastBrowserNotificationAtByOrderRef.current.set(key, now);
    return true;
  };

  const stopAlertLoop = useCallback(() => {
    if (alertLoopTimerRef.current) {
      clearInterval(alertLoopTimerRef.current);
      alertLoopTimerRef.current = null;
    }
    alertLoopStartedAtRef.current = 0;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const startAlertLoop = useCallback((playSoundFn) => {
    stopAlertLoop();
    alertLoopStartedAtRef.current = Date.now();

    alertLoopTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - alertLoopStartedAtRef.current;
      if (elapsed >= ALERT_LOOP_MAX_MS || !activeOrderRef.current) {
        stopAlertLoop();
        return;
      }

      if (typeof document !== 'undefined') {
        playSoundFn(activeOrderRef.current);
      }
    }, ALERT_LOOP_INTERVAL_MS);
  }, [stopAlertLoop]);
  
  const playNotificationSound = useCallback(async (orderData = {}) => {
    try {
      // Temporarily disabled native bridge sound trigger
      // const usedNativeBridge = await triggerWebViewNativeNotification(orderData);
      const usedNativeBridge = false;

      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }

      if (usedNativeBridge) {
        return;
      }

      // Lazily create audio if it doesn't exist yet
      if (!audioRef.current) {
        const soundFile = resolveAudioSource(alertSound);
        audioRef.current = new Audio(soundFile);
        audioRef.current.preload = 'auto';
        audioRef.current.volume = 0.9;
      }

      // audioRef.current.muted = false;
      // audioRef.current.volume = 0.9;
      // audioRef.current.currentTime = 0;
      // audioRef.current.play().catch(error => {
      //   // On strict autoplay environments, vibration/native bridge path stays active.
      //   if (!error.message?.includes('user didn\'t interact') && !error.name?.includes('NotAllowedError')) {
      //     debugWarn('Error playing notification sound:', error);
      //   }
      // });
    } catch (error) {
      if (!error.message?.includes('user didn\'t interact') && !error.name?.includes('NotAllowedError')) {
        debugWarn('Error playing sound:', error);
      }
    }
  }, []);

  const showBackgroundOrderNotification = useCallback(async (orderData = {}) => {
    if (!shouldShowBrowserNotification(orderData)) {
      return;
    }

    if (!supportsBrowserNotifications() || Notification.permission !== 'granted') {
      return;
    }

    const notificationOptions = buildDeliveryOrderNotification(orderData);

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(notificationOptions.title, {
            body: notificationOptions.body,
            tag: notificationOptions.tag,
            renotify: true,
            requireInteraction: true,
            silent: false,
            vibrate: [200, 100, 200, 100, 300],
            icon: '/logo.png',
            data: notificationOptions.data,
          });
          return;
        }
      }

      new Notification(notificationOptions.title, {
        body: notificationOptions.body,
        tag: notificationOptions.tag,
        requireInteraction: true,
        silent: false,
        icon: '/logo.png',
        data: notificationOptions.data,
      });
    } catch (error) {
      debugWarn('Error showing background delivery notification:', error);
    }
  }, []);

  const handleIncomingOrderAlert = useCallback((orderData = {}) => {
    if (!shouldProcessOrderAlert(orderData)) {
      return;
    }

    activeOrderRef.current = orderData || { id: Date.now() };
    playNotificationSound(orderData);
    startAlertLoop(playNotificationSound);

    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      showBackgroundOrderNotification(orderData);
    }
  }, [playNotificationSound, showBackgroundOrderNotification, startAlertLoop]);

  const shouldUseSocketOrderFallback = useCallback((orderData = {}) => {
    const channel = String(orderData?.channel || '').toLowerCase();
    const shouldUse = channel === 'socket_fallback' || !firebaseDeliveryOffersHealthyRef.current;
    debugLog('Socket fallback health check', {
      shouldUse,
      channel,
      firebaseHealthy: firebaseDeliveryOffersHealthyRef.current,
      orderId: orderData?.orderId || orderData?.orderMongoId || orderData?._id,
    });
    return shouldUse;
  }, []);

  const recoverDeliveryState = useCallback(async () => {
    if (!deliveryPartnerId) return;

    try {
      const [availableResult, currentTripResult] = await Promise.allSettled([
        deliveryAPI.getOrders({ limit: 20, page: 1 }),
        deliveryAPI.getCurrentDelivery(),
      ]);

      const currentTrip =
        currentTripResult.status === 'fulfilled'
          ? currentTripResult.value?.data?.data ??
            currentTripResult.value?.data ??
            null
          : null;

      if (currentTrip) {
        debugLog('Recovered current delivery trip after reconnect/focus:', currentTrip);
        setOrderStatusUpdate({
          ...currentTrip,
          recoverySource: 'delivery_reconnect',
        });
        return;
      }

      const availablePayload =
        availableResult.status === 'fulfilled'
          ? availableResult.value?.data?.data ??
            availableResult.value?.data ??
            {}
          : {};
      const availableOrders = Array.isArray(availablePayload?.docs)
        ? availablePayload.docs
        : Array.isArray(availablePayload?.items)
          ? availablePayload.items
          : Array.isArray(availablePayload)
            ? availablePayload
            : [];

      const recoverableOrder = availableOrders.find((order) => {
        const dispatchStatus = order?.dispatch?.status;
        return (
          ['unassigned', 'assigned'].includes(dispatchStatus) &&
          ['confirmed', 'preparing', 'ready_for_pickup'].includes(order?.orderStatus)
        );
      });

      if (recoverableOrder && !activeOrderRef.current) {
        const normalized = normalizeIncomingOrder(recoverableOrder);
        debugLog('Recovered available delivery order after reconnect/focus:', normalized);
        setNewOrder(normalized);
        handleIncomingOrderAlert(normalized);
      }
    } catch (error) {
      debugWarn('Delivery recovery sync failed:', error?.message || error);
    }
  }, [deliveryPartnerId, handleIncomingOrderAlert]);

  const joinDeliveryRoomIfPossible = useCallback(() => {
    if (!socketRef.current?.connected || !deliveryPartnerId) {
      return false;
    }

    if (joinedDeliveryRoomRef.current === deliveryPartnerId) {
      return true;
    }

    debugLog('Joining delivery room', {
      deliveryPartnerId,
      socketId: socketRef.current?.id,
    });
    socketRef.current.emit('join-delivery', deliveryPartnerId);
    joinedDeliveryRoomRef.current = deliveryPartnerId;
    return true;
  }, [deliveryPartnerId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.__deliverySocketDebug = {
      enabled: shouldLogDeliverySocket(),
      apiBaseUrl: API_BASE_URL,
      get deliveryPartnerId() {
        return deliveryPartnerId;
      },
      get isConnected() {
        return isConnected;
      },
      get socketId() {
        return socketRef.current?.id || null;
      },
      get socketConnected() {
        return Boolean(socketRef.current?.connected);
      },
      forceReconnect() {
        if (socketRef.current) {
          socketRef.current.connect();
        }
      },
      dump() {
        return {
          enabled: shouldLogDeliverySocket(),
          apiBaseUrl: API_BASE_URL,
          deliveryPartnerId,
          isConnected,
          socketId: socketRef.current?.id || null,
          socketConnected: Boolean(socketRef.current?.connected),
          socketAuthTokenPresent: Boolean(getDeliveryAuthToken()),
        };
      },
    };

    return () => {
      if (window.__deliverySocketDebug) {
        delete window.__deliverySocketDebug;
      }
    };
  }, [deliveryPartnerId, isConnected]);

  // Step 4: All effects (unconditional hook calls, conditional logic inside)
  useEffect(() => {
    if (!supportsBrowserNotifications()) return;

    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(NOTIFICATION_PERMISSION_ASKED_KEY) === 'true') return;

    const requestPermissionOnce = async () => {
      localStorage.setItem(NOTIFICATION_PERMISSION_ASKED_KEY, 'true');
      try {
        await Notification.requestPermission();
      } catch (error) {
        debugWarn('Failed to request delivery notification permission:', error);
      }
    };

    const askOnInteraction = () => {
      requestPermissionOnce();
      window.removeEventListener('pointerdown', askOnInteraction);
      window.removeEventListener('keydown', askOnInteraction);
    };

    window.addEventListener('pointerdown', askOnInteraction, { once: true, passive: true });
    window.addEventListener('keydown', askOnInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', askOnInteraction);
      window.removeEventListener('keydown', askOnInteraction);
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState !== 'hidden') {
        void recoverDeliveryState();
        return;
      }
      if (!activeOrderRef.current) return;

      playNotificationSound(activeOrderRef.current);
      showBackgroundOrderNotification(activeOrderRef.current);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [playNotificationSound, showBackgroundOrderNotification, recoverDeliveryState]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onDeliveryFcmAlert = (event) => {
      const detail = event?.detail || {};
      debugLog('Received delivery FCM alert bridge', detail);
      if (!isRiderOnline()) {
        debugLog('Ignored delivery FCM alert bridge because rider is offline');
        return;
      }

      const hintedOrder = normalizeIncomingOrder({
        orderId: detail?.orderId || detail?.orderMongoId,
        orderMongoId: detail?.orderMongoId || detail?.orderId,
      });

      if (hintedOrder && (hintedOrder.orderId || hintedOrder.orderMongoId)) {
        setNewOrder(hintedOrder);
      }

      void recoverDeliveryState();
    };

    window.addEventListener('delivery-fcm-order-alert', onDeliveryFcmAlert);
    return () => {
      window.removeEventListener('delivery-fcm-order-alert', onDeliveryFcmAlert);
    };
  }, [recoverDeliveryState]);

  // Track user interaction — mark gesture only; never play alert.mp3 during unlock (iOS leak)
  useEffect(() => {
    const handleUserInteraction = async () => {
      userInteractedRef.current = true;
      audioUnlockAttemptedRef.current = true;

      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('pointerdown', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    document.addEventListener('keydown', handleUserInteraction, { once: true });
    window.addEventListener('pointerdown', handleUserInteraction, { once: true, passive: true });
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('pointerdown', handleUserInteraction);
    };
  }, []);
  
  // Initialize audio on mount (delivery session only — provider mounts in delivery module)
  useEffect(() => {
    if (!deliverySessionToken) return;

    const soundFile = resolveAudioSource(alertSound);
    if (!audioRef.current) {
      audioRef.current = new Audio(soundFile);
      audioRef.current.preload = 'auto';
      audioRef.current.volume = 0.9;
      debugLog('?? Audio initialized on mount with Alert Sound');
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [deliverySessionToken]);

  // Fetch delivery partner ID (only when logged in as delivery partner)
  useEffect(() => {
    if (!deliverySessionToken) {
      setDeliveryPartnerId(null);
      return undefined;
    }

    const fallbackId = resolveDeliveryPartnerIdFromClient();
    if (fallbackId) {
      setDeliveryPartnerId(fallbackId);
      debugLog('Delivery Partner ID restored from local client auth:', fallbackId);
    }

    let cancelled = false;

    const fetchDeliveryPartnerId = async () => {
      try {
        const response = await deliveryAPI.getMe();
        if (cancelled) return;
        if (response.data?.success && response.data.data) {
          const deliveryPartner = response.data.data.user || response.data.data.deliveryPartner;
          if (deliveryPartner) {
            const id =
              deliveryPartner.id?.toString() ||
              deliveryPartner._id?.toString() ||
              deliveryPartner.deliveryId;
            if (id) {
              setDeliveryPartnerId(id);
              debugLog('Delivery Partner ID fetched:', id);
            } else {
              debugWarn('Could not extract delivery partner ID from response');
            }
          } else {
            debugWarn('No delivery partner data in API response');
          }
        } else {
          debugWarn('Could not fetch delivery partner ID from API');
        }
      } catch (error) {
        if (cancelled) return;
        const msg = String(error?.message || '').toLowerCase();
        if (msg.includes('not authenticated') || msg.includes('unauthorized')) {
          debugLog('Delivery getMe skipped — no active delivery session');
          return;
        }
        debugWarn('Error fetching delivery partner:', error);
      }
    };

    void fetchDeliveryPartnerId();

    return () => {
      cancelled = true;
    };
  }, [deliverySessionToken]);

  // Keep delivery session in sync (login/logout) so socket effect can reconnect.
  useEffect(() => {
    const syncDeliverySession = () => {
      setDeliverySessionToken(getDeliveryAuthToken());
    };
    syncDeliverySession();
    window.addEventListener('deliveryAuthChanged', syncDeliverySession);
    window.addEventListener('storage', syncDeliverySession);
    return () => {
      window.removeEventListener('deliveryAuthChanged', syncDeliverySession);
      window.removeEventListener('storage', syncDeliverySession);
    };
  }, []);

  const reconnectSocketWithToken = useCallback((newToken) => {
    if (!socketRef.current || !newToken) return;
    debugLog('Reconnecting delivery socket with refreshed token');
    socketRef.current.auth = { token: newToken };
    if (socketRef.current.io?.opts) {
      socketRef.current.io.opts.query = { token: newToken };
    }
    joinedDeliveryRoomRef.current = null;
    joinedTrackingOrdersRef.current.clear();
    if (socketRef.current.connected) {
      socketRef.current.disconnect();
    }
    socketRef.current.connect();
  }, []);

  // Socket connection — only for authenticated delivery partners
  useEffect(() => {
    if (!API_BASE_URL || !String(API_BASE_URL).trim()) {
      setIsConnected(false);
      return undefined;
    }

    const token = deliverySessionToken;
    if (!token) {
      debugLog('No delivery session — socket idle');
      setIsConnected(false);
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    const backendUrl = resolveSocketOrigin();
    const socketUrl = backendUrl;
    
    debugLog('?? Attempting to connect to Delivery Socket.IO:', socketUrl);
    debugLog('?? Backend URL:', backendUrl);
    debugLog('?? API_BASE_URL:', API_BASE_URL);
    debugLog('?? Delivery Partner ID:', deliveryPartnerId);
    debugLog('?? Environment: (ui-only mode)');
    
    // Block localhost only in production builds. In dev, localhost is expected.
    if (import.meta.env.PROD && backendUrl.includes('localhost')) {
      debugError('? CRITICAL: Trying to connect Socket.IO to localhost in production!');
      debugError('?? Current socketUrl:', socketUrl);
      debugError('?? Current API_BASE_URL:', API_BASE_URL);
      setIsConnected(false);
      return;
    }
    
    if (!isValidSocketOrigin(backendUrl)) {
      debugError('? CRITICAL: Invalid backend URL format:', backendUrl);
      debugError('?? API_BASE_URL:', API_BASE_URL);
      return;
    }
    
    // Validate socket URL format
    try {
      new URL(socketUrl); // This will throw if URL is invalid
    } catch (urlError) {
      debugError('? CRITICAL: Invalid Socket.IO URL:', socketUrl);
      debugError('?? URL validation error:', urlError.message);
      debugError('?? Backend URL:', backendUrl);
      debugError('?? API_BASE_URL:', API_BASE_URL);
      return; // Don't try to connect with invalid URL
    }

    const tokenPreview = token ? `${String(token).slice(0, 12)}...` : null;
    debugLog('Preparing socket auth payload', {
      tokenPresent: Boolean(token),
      tokenPreview,
      deliveryPartnerId,
      socketUrl,
    });

    socketRef.current = io(socketUrl, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'], // WebSocket-first for instant delivery
      upgrade: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      auth: {
        token: token || ""
      },
      query: token ? { token } : undefined,
    });

    debugLog('Socket.IO client created', {
      socketUrl,
      path: '/socket.io/',
      transports: ['polling', 'websocket'],
      tokenPresent: Boolean(token),
      tokenPreview,
      deliveryPartnerId,
    });

    socketRef.current.on('connect', () => {
      debugLog('Socket connected', {
        socketId: socketRef.current?.id,
        deliveryPartnerId,
        transport: socketRef.current?.io?.engine?.transport?.name || 'unknown',
      });
      setIsConnected(true);

      joinedDeliveryRoomRef.current = null;
      joinedTrackingOrdersRef.current.clear();
      if (!joinDeliveryRoomIfPossible()) {
        debugLog('Socket connected before deliveryPartnerId was ready; waiting to join room.');
      }
      debugLog('Requesting resync after connect', {
        deliveryPartnerId,
        socketId: socketRef.current?.id,
      });
      socketRef.current.emit('resync');
      void recoverDeliveryState();
    });

    socketRef.current.on('delivery-room-joined', (data) => {
      debugLog('Delivery room joined successfully', data);
    });

    socketRef.current.on('resync_complete', (data) => {
      debugLog('Resync completed', data);
    });

    socketRef.current.on('active_order', (activeOrderData) => {
      debugLog('Active order recovered via socket resync', {
        orderId: activeOrderData?.orderId || activeOrderData?.orderMongoId || activeOrderData?._id,
      });
      if (!activeOrderData) return;
      setOrderStatusUpdate({
        ...activeOrderData,
        recoverySource: 'socket_resync',
      });
    });

    socketRef.current.on('pending_offers', ({ offers = [] } = {}) => {
      debugLog('Pending offers batch from resync', { count: offers.length });
      if (!isRiderOnline() || !Array.isArray(offers) || offers.length === 0) return;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('deliveryPendingOffers', {
            detail: {
              offers: offers.map((offer) => normalizeIncomingOrder(offer)).filter(Boolean),
            },
          }),
        );
      }
    });

    socketRef.current.on('connect_error', (error) => {
      debugError('Socket connection error', {
        message: error?.message,
        type: error?.type,
        description: error?.description,
        context: error?.context,
        data: error?.data,
        socketUrl,
        apiBaseUrl: API_BASE_URL,
        deliveryPartnerId,
        tokenPresent: Boolean(token),
        tokenPreview,
        transport: socketRef.current?.io?.engine?.transport?.name || 'unknown',
      });
      setIsConnected(false);
    });

    socketRef.current.on('disconnect', (reason) => {
      debugWarn('Socket disconnected', {
        reason,
        socketId: socketRef.current?.id,
        deliveryPartnerId,
      });
      setIsConnected(false);
      joinedDeliveryRoomRef.current = null;
      joinedTrackingOrdersRef.current.clear();
      
      if (reason === 'io server disconnect') {
        socketRef.current.connect();
      }
    });

    socketRef.current.on('reconnect_attempt', (attemptNumber) => {
      debugWarn('Reconnection attempt', {
        attemptNumber,
        socketUrl,
        deliveryPartnerId,
      });
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      debugLog('Socket reconnected', {
        attemptNumber,
        socketId: socketRef.current?.id,
        deliveryPartnerId,
        transport: socketRef.current?.io?.engine?.transport?.name || 'unknown',
      });
      setIsConnected(true);

      joinedDeliveryRoomRef.current = null;
      joinedTrackingOrdersRef.current.clear();
      joinDeliveryRoomIfPossible();
      socketRef.current.emit('resync');
      void recoverDeliveryState();
    });

    socketRef.current.on('new_order', (orderData) => {
      debugLog('New order received via socket', {
        orderId: orderData?.orderId || orderData?.orderMongoId || orderData?._id,
        dispatchStatus: orderData?.dispatch?.status,
        channel: orderData?.channel,
      });
      if (!isRiderOnline()) {
        debugLog('?? Ignored new_order - rider is offline');
        return;
      }
      const fallbackOnly = shouldUseSocketOrderFallback(orderData);
      if (!fallbackOnly) {
        debugLog('Using socket new_order as direct popup source even though Firebase is healthy', {
          orderId: orderData?.orderId || orderData?.orderMongoId || orderData?._id,
          channel: orderData?.channel,
        });
      }
      const normalized = normalizeIncomingOrder(orderData);
      setNewOrder(normalized);
      handleIncomingOrderAlert(normalized);
    });

    // Socket fallback for dispatch offers when Firebase publish fails on the server.
    socketRef.current.on('new_order_available', (orderData) => {
      const normalized = normalizeIncomingOrder(orderData);
      debugLog('New order available received via socket', {
        orderId: orderData?.orderId || orderData?.orderMongoId || orderData?._id,
        normalizedOrderId: normalized?.orderId,
        normalizedMongoId: normalized?.orderMongoId,
        phase: orderData?.phase || 'unknown',
        dispatchStatus: orderData?.dispatch?.status,
        channel: orderData?.channel,
      });
      if (!isRiderOnline()) {
        debugLog('?? Ignored new_order_available - rider is offline');
        return;
      }
      const fallbackOnly = shouldUseSocketOrderFallback(orderData);
      if (!fallbackOnly) {
        debugLog('Using socket new_order_available as direct popup source even though Firebase is healthy', {
          orderId: orderData?.orderId || orderData?.orderMongoId || orderData?._id,
          normalizedOrderId: normalized?.orderId,
          normalizedMongoId: normalized?.orderMongoId,
          channel: orderData?.channel,
        });
      }
      setNewOrder(normalized);
      handleIncomingOrderAlert(normalized);
    });

    socketRef.current.on('play_notification_sound', (data) => {
      debugLog('play_notification_sound received', {
        orderId: data?.orderId || data?.orderMongoId || data?.order_id,
      });
      if (!isRiderOnline()) {
        debugLog('?? Ignored play_notification_sound - rider is offline');
        return;
      }
      const normalizedData = normalizeIncomingOrder({
        orderId: data?.orderId || data?.order_id,
        orderMongoId: data?.orderMongoId || data?.order_mongo_id,
        ...data
      });
      setNewOrder(normalizedData);
      // Force immediate buzz for notification events, even if dedupe would skip.
      activeOrderRef.current = normalizedData || { id: Date.now() };
      playNotificationSound(normalizedData);
      startAlertLoop(playNotificationSound);
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        showBackgroundOrderNotification(normalizedData);
      }
    });

    socketRef.current.on('order_ready', (orderData) => {
      debugLog('order_ready received via socket', {
        orderId: orderData?.orderId || orderData?.orderMongoId || orderData?._id,
      });
      setOrderReady(orderData);
      playNotificationSound(orderData);
    });

    socketRef.current.on('order_status_update', (statusData) => {
      debugLog('?? Delivery order status update received via socket:', statusData);

      const statusValue = String(
        statusData?.status || statusData?.orderStatus || ''
      ).toLowerCase();
      const orderStatusPayload = statusData || null;
      const affectedOrderId =
        statusData?.orderMongoId || statusData?.orderId || statusData?._id;

      if (statusValue.includes('cancel') || statusValue === 'dead') {
        stopAlertLoop();
        activeOrderRef.current = null;
        setNewOrder(null);
        if (affectedOrderId) {
          setClaimedOrderId({
            orderId: affectedOrderId,
            orderMongoId: statusData?.orderMongoId || affectedOrderId,
            claimedBy: 'cancelled',
          });
        }
        setOrderStatusUpdate({
          ...orderStatusPayload,
          status: 'cancelled',
          orderStatus: statusData?.orderStatus || statusData?.status || 'cancelled',
        });
        return;
      }

      if (statusValue === 'deleted') {
        stopAlertLoop();
        activeOrderRef.current = null;
        setNewOrder(null);
        if (affectedOrderId) {
          setClaimedOrderId({
            orderId: affectedOrderId,
            orderMongoId: statusData?.orderMongoId || affectedOrderId,
            claimedBy: 'deleted',
          });
        }
        setOrderStatusUpdate({
          ...orderStatusPayload,
          status: 'deleted',
        });
        return;
      }

      setOrderStatusUpdate(orderStatusPayload);
    });

    socketRef.current.on('order_cancelled', (statusData) => {
      debugLog('?? Delivery order cancelled event received via socket:', statusData);
      stopAlertLoop();
      activeOrderRef.current = null;
      setNewOrder(null);
      
      const cancelledId = statusData?.orderId || statusData?.orderMongoId || statusData?._id;
      if (cancelledId) setClaimedOrderId({ orderId: cancelledId, claimedBy: 'cancelled' });
      
      setOrderStatusUpdate({
        ...(statusData || {}),
        status: 'cancelled'
      });
    });

    socketRef.current.on('order_deleted', (statusData) => {
      debugLog('?? Delivery order deleted event received via socket:', statusData);
      setOrderStatusUpdate({
        ...(statusData || {}),
        status: 'deleted'
      });
    });

    socketRef.current.on('order_auto_killed', (data) => {
      debugLog('?? Delivery order auto-killed event received via socket:', data);
      stopAlertLoop();
      activeOrderRef.current = null;
      setNewOrder(null);
      
      const cancelledId = data?.orderId || data?.orderMongoId || data?._id;
      if (cancelledId) setClaimedOrderId({ orderId: cancelledId, claimedBy: 'cancelled' });
      
      setOrderStatusUpdate({
        ...(data || {}),
        status: 'cancelled'
      });
      setAutoKilledOrder(data);
    });

    socketRef.current.on('order_reassigned_elsewhere', (data) => {
      debugLog('?? Order reassigned to another partner:', data);
      stopAlertLoop();
      activeOrderRef.current = null;
      setNewOrder(null);
      const reassignedId = getOrderMongoId(data) || data?.orderId;
      if (reassignedId) {
        setClaimedOrderId({
          orderId: reassignedId,
          orderMongoId: getOrderMongoId(data) || reassignedId,
          claimedBy: data?.claimedBy || 'reassigned',
        });
      }
    });

    // Backend emits 'order_claimed' when another delivery boy accepts an offered order
    socketRef.current.on('order_claimed', (data) => {
      const claimedMongoId = getOrderMongoId(data) || data?.orderId || data?.order_id;
      const activeOrderRefId = getOrderMongoId(activeOrderRef.current) || activeOrderRef.current?.orderId || activeOrderRef.current?._id;
      const isCurrentAlertOrder = Boolean(claimedMongoId && activeOrderRefId && String(claimedMongoId) == String(activeOrderRefId));
      debugLog('?? order_claimed received - order taken by another partner:', {
        raw: data,
        claimedMongoId,
        claimedBy: data?.claimedBy,
        activeOrderRefId,
        isCurrentAlertOrder,
      });
      if (isCurrentAlertOrder) {
        stopAlertLoop();
        activeOrderRef.current = null;
        setNewOrder(null);
      }
      if (claimedMongoId) {
        setClaimedOrderId({
          orderId: claimedMongoId,
          orderMongoId: getOrderMongoId(data) || claimedMongoId,
          claimedBy: data?.claimedBy,
        });
      }
    });

    socketRef.current.on('admin_notification', (payload) => {
      debugLog('Admin broadcast received via socket', payload);
      setAdminNotification(payload);
      dispatchNotificationInboxRefresh();
    });

    socketRef.current.on('admin_force_status', async (payload) => {
      debugLog('Admin force status received via socket', payload);
      try {
        const { useDeliveryStore } = await import('@/modules/DeliveryV2/store/useDeliveryStore');
        const isOnline = payload?.status === 'online';
        useDeliveryStore.getState().setOnline(isOnline);
        
        if (isOnline) {
            toast.success(payload?.message || 'You have been marked online by the Admin.', { duration: 5000 });
        } else {
            toast.error(payload?.message || 'You have been marked offline by the Admin.', { duration: 8000 });
            stopAlertLoop();
            activeOrderRef.current = null;
            setNewOrder(null);
        }
      } catch (err) {
        debugError('Error handling admin_force_status:', err);
      }
    });

    // Auth change/refresh listeners
    const handleAuthChange = () => {
      const newToken = getDeliveryAuthToken();
      if (!newToken) {
        setDeliveryPartnerId(null);
        setIsConnected(false);
        joinedDeliveryRoomRef.current = null;
        joinedTrackingOrdersRef.current.clear();
        if (socketRef.current) {
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
          socketRef.current = null;
        }
        return;
      }
      reconnectSocketWithToken(newToken);
    };

    const handleAuthRefreshed = (e) => {
      if (e.detail?.module === 'delivery' && e.detail.token) {
        debugLog('?? Auth refreshed for delivery, reconnecting socket');
        reconnectSocketWithToken(e.detail.token);
      }
    };

    const handleWindowFocus = () => {
      void recoverDeliveryState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void recoverDeliveryState();
      }
    };

    window.addEventListener('deliveryAuthChanged', handleAuthChange);
    window.addEventListener('authRefreshed', handleAuthRefreshed);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      debugLog('? Cleaning up socket connection...');
      stopAlertLoop();
      joinedDeliveryRoomRef.current = null;
      joinedTrackingOrdersRef.current.clear();
      window.removeEventListener('deliveryAuthChanged', handleAuthChange);
      window.removeEventListener('authRefreshed', handleAuthRefreshed);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [deliveryPartnerId, deliverySessionToken, handleIncomingOrderAlert, joinDeliveryRoomIfPossible, playNotificationSound, recoverDeliveryState, reconnectSocketWithToken, shouldUseSocketOrderFallback, showBackgroundOrderNotification, startAlertLoop, stopAlertLoop]);

  useEffect(() => {
    if (!deliveryPartnerId) {
      if (deliverySessionToken) {
        debugLog('Waiting for deliveryPartnerId (delivery session active)');
      }
      return;
    }

    joinDeliveryRoomIfPossible();

    if (socketRef.current?.connected) {
      debugLog('Requesting resync after deliveryPartnerId resolved', {
        deliveryPartnerId,
        socketId: socketRef.current?.id,
      });
      socketRef.current.emit('resync');
      void recoverDeliveryState();
    }
  }, [deliveryPartnerId, deliverySessionToken, joinDeliveryRoomIfPossible, recoverDeliveryState]);

  useEffect(() => {
    if (!deliveryPartnerId) return undefined;

    debugLog('Subscribing to Firebase delivery partner offers', { deliveryPartnerId });

    const unsubscribe = subscribeDeliveryPartnerOffers(
      deliveryPartnerId,
      (offersMap = {}) => {
        if (!isRiderOnline()) return;
        firebaseDeliveryOffersHealthyRef.current = true;

        const currentKeys = new Set(Object.keys(offersMap || {}));

        for (const previousKey of prevFirebaseOfferKeysRef.current) {
          if (!currentKeys.has(previousKey)) {
            const activeKey =
              getOrderMongoId(activeOrderRef.current) ||
              activeOrderRef.current?.orderId ||
              activeOrderRef.current?._id;
            if (activeKey && String(activeKey) === String(previousKey)) {
              debugLog('Firebase offer removed for active alert order', { orderId: previousKey });
              stopAlertLoop();
              activeOrderRef.current = null;
              setNewOrder(null);
            }
            setClaimedOrderId({
              orderId: previousKey,
              orderMongoId: previousKey,
              claimedBy: 'claimed',
            });
          }
        }
        prevFirebaseOfferKeysRef.current = currentKeys;

        Object.entries(offersMap || {}).forEach(([orderMongoId, offerData]) => {
          if (!offerData || typeof offerData !== 'object') return;

          const offerStatus = String(offerData.status || 'offered').toLowerCase();
          if (offerStatus !== 'offered') return;

          const offeredAt = Number(offerData.offeredAt || offerData.last_updated || 0);
          const lastSeen = lastFirebaseOfferAtByOrderRef.current.get(orderMongoId) || 0;
          if (!offeredAt || offeredAt <= lastSeen) return;

          lastFirebaseOfferAtByOrderRef.current.set(orderMongoId, offeredAt);

          const normalized = normalizeIncomingOrder({
            ...offerData,
            orderMongoId,
            _id: offerData._id || orderMongoId,
            source: 'firebase',
          });

          debugLog('New order offer received via Firebase', {
            orderMongoId,
            orderId: normalized?.orderId,
            offeredAt,
          });

          setNewOrder(normalized);
          handleIncomingOrderAlert(normalized);
        });
      },
      (error) => {
        firebaseDeliveryOffersHealthyRef.current = false;
        debugWarn('Firebase delivery-offer listener error:', error?.message || error);
      },
    );

    return () => {
      debugLog('Unsubscribing Firebase delivery partner offers', { deliveryPartnerId });
      prevFirebaseOfferKeysRef.current = new Set();
      unsubscribe();
    };
  }, [deliveryPartnerId, handleIncomingOrderAlert, stopAlertLoop]);

  // Helper functions
  const clearNewOrder = () => {
    stopAlertLoop();
    activeOrderRef.current = null;
    setNewOrder(null);
  };

  const clearClaimedOrderId = () => setClaimedOrderId(null);

  const clearOrderReady = () => {
    setOrderReady(null);
  };

  const clearOrderStatusUpdate = () => {
    setOrderStatusUpdate(null);
  };

  const clearAdminNotification = () => {
    setAdminNotification(null);
  };

  const emitLocation = useCallback((data) => {
    if (!socketRef.current?.connected || !data) return false;

    const orderId = String(getOrderMongoId(data) || getOrderAcceptId(data) || data.orderId || '').trim();
    if (!orderId) return false;

    if (!joinedTrackingOrdersRef.current.has(orderId)) {
      joinedTrackingOrdersRef.current.add(orderId);
      socketRef.current.emit('join-tracking', orderId);
    }

    socketRef.current.emit('update-location', {
      ...data,
      orderId,
      userId: data.userId,
      restaurantId: data.restaurantId,
    });
    return true;
  }, []);

  return {
    newOrder,
    clearNewOrder,
    orderReady,
    clearOrderReady,
    orderStatusUpdate,
    clearOrderStatusUpdate,
    adminNotification,
    clearAdminNotification,
    claimedOrderId,
    clearClaimedOrderId,
    autoKilledOrder,
    clearAutoKilledOrder: () => setAutoKilledOrder(null),
    isConnected,
    playNotificationSound,
    emitLocation
  };
};


