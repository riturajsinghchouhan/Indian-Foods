import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import NewOrderNotification from "./NewOrderNotification"
import notificationSound from "@food/assets/audio/alert.mp3"
import { useRestaurantNotifications } from "@food/hooks/useRestaurantNotifications"

const isDesktopOrWebView = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false

  const userAgent = navigator.userAgent || ""
  const isWebView =
    Boolean(window.ReactNativeWebView) ||
    Boolean(window.flutter_inappwebview) ||
    /\bwv\b|WebView/i.test(userAgent)

  if (isWebView) return true

  const isMobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini|Windows Phone/i.test(userAgent)
  const isSmallViewport = window.matchMedia?.("(max-width: 768px)")?.matches

  return !(isMobileUserAgent || isSmallViewport)
}

const shouldHideGlobalNotification = (pathname = "") =>
  pathname === "/food/restaurant" || pathname.startsWith("/food/restaurant/orders")

export default function GlobalRestaurantOrderNotification() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { newOrder, clearNewOrder } = useRestaurantNotifications()
  const [enabled, setEnabled] = useState(() => isDesktopOrWebView())
  const [isMuted, setIsMuted] = useState(false)
  const lastAlertOrderKeyRef = useRef(null)
  const audioRef = useRef(null)
  const audioUnlockedRef = useRef(false)
  const isMutedRef = useRef(false)

  useEffect(() => {
    const updateEnabled = () => setEnabled(isDesktopOrWebView())

    updateEnabled()
    window.addEventListener("resize", updateEnabled)

    return () => {
      window.removeEventListener("resize", updateEnabled)
    }
  }, [])

  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(notificationSound)
      audioRef.current.preload = "auto"
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const unlockAudio = async () => {
      if (audioUnlockedRef.current || !audioRef.current) return

      try {
        audioRef.current.muted = true
        await audioRef.current.play()
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current.muted = false
        audioRef.current.volume = 1
        audioUnlockedRef.current = true
      } catch (_) {
        if (audioRef.current) {
          audioRef.current.muted = false
        }
      }
    }

    window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true })
    window.addEventListener("keydown", unlockAudio, { once: true })

    return () => {
      window.removeEventListener("pointerdown", unlockAudio)
      window.removeEventListener("keydown", unlockAudio)
    }
  }, [])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible" && audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [])

  const playPopupSound = () => {
    if (!audioRef.current || isMutedRef.current) return

    audioRef.current.loop = false
    audioRef.current.muted = false
    audioRef.current.volume = 1
    audioRef.current.currentTime = 0
    audioRef.current.play().catch(() => {})
  }

  const order = newOrder
    ? {
        ...newOrder,
        orderMongoId: newOrder.orderMongoId || newOrder._id || newOrder.id,
        total: newOrder.total ?? newOrder.pricing?.total ?? 0,
        customerAddress: newOrder.customerAddress || newOrder.deliveryAddress || newOrder.address,
      }
    : null

  const shouldShow = enabled && order && !shouldHideGlobalNotification(pathname)
  const alertLoopIntervalMs = 4500
  const alertLoopMaxMs = 120000
  const orderKey = order
    ? String(order.orderMongoId || order._id || order.orderId || order.id || "").trim()
    : ""

  useEffect(() => {
    if (!shouldShow || !orderKey) {
      lastAlertOrderKeyRef.current = null
      return
    }

    if (lastAlertOrderKeyRef.current === orderKey) {
      return
    }

    lastAlertOrderKeyRef.current = orderKey
    if (!isMuted) {
      playPopupSound()
    }
  }, [isMuted, orderKey, shouldShow])

  useEffect(() => {
    if (!shouldShow || !order || !orderKey) {
      return undefined
    }

    const startedAt = Date.now()
    const intervalId = window.setInterval(() => {
      if (Date.now() - startedAt >= alertLoopMaxMs) {
        window.clearInterval(intervalId)
        return
      }

      if (!isMuted) {
        playPopupSound()
      }
    }, alertLoopIntervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [alertLoopIntervalMs, alertLoopMaxMs, isMuted, orderKey, shouldShow])

  if (!shouldShow) return null

  return (
    <NewOrderNotification
      order={order}
      isMuted={isMuted}
      onToggleMute={() => setIsMuted((prev) => !prev)}
      showSoundToggle
      onClose={clearNewOrder}
      onViewOrder={(selectedOrder) => {
        navigate(`/food/restaurant/orders/${selectedOrder.orderMongoId || selectedOrder._id || selectedOrder.orderId}`)
      }}
    />
  )
}
