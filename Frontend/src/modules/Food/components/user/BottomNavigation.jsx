import { Link, useLocation } from "react-router-dom"
import { Tag, User, Truck, UtensilsCrossed } from "lucide-react"
import { useState, useEffect } from "react"
import api from "@food/api"

export default function BottomNavigation() {
  const location = useLocation()
  const pathname = location.pathname
  const [under250PriceLimit, setUnder250PriceLimit] = useState(250)

  // Fetch landing settings to get dynamic price limit
  useEffect(() => {
    let cancelled = false
    api.get('/food/landing/settings/public')
      .then((res) => {
        if (cancelled) return
        const settings = res?.data?.data
        if (settings && typeof settings.under250PriceLimit === 'number') {
          setUnder250PriceLimit(settings.under250PriceLimit)
        }
      })
      .catch(() => {
        if (!cancelled) setUnder250PriceLimit(250)
      })
    return () => { cancelled = true }
  }, [])

  // Check active routes - support both /user/* and /* paths
  const isDining = pathname === "/food/dining" || pathname.startsWith("/food/user/dining")
  const isUnder250 = pathname === "/food/under-250" || pathname.startsWith("/food/user/under-250")
  const isProfile = pathname.startsWith("/food/profile") || pathname.startsWith("/food/user/profile")
  const isDelivery =
    !isDining &&
    !isUnder250 &&
    !isProfile &&
    (pathname === "/food" ||
      pathname === "/food/" ||
      pathname === "/food/user" ||
      (pathname.startsWith("/food/user") &&
        !pathname.includes("/dining") &&
        !pathname.includes("/under-250") &&
        !pathname.includes("/profile")))

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-800 z-50 shadow-lg"
    >
      <div className="flex items-center justify-around h-auto px-2 sm:px-4">
        {/* Delivery Tab */}
        <Link
          to="/food/user/"
          className={`flex flex-1 flex-col items-center gap-1.5 px-2 sm:px-3 py-2 transition-all duration-200 relative ${isDelivery
              ? "text-primary"
              : "text-gray-600 dark:text-gray-400"
            }`}
        >
          < Truck className={`h-5 w-5 ${isDelivery ? "text-primary fill-primary/10" : "text-gray-600 dark:text-gray-400"}`} strokeWidth={2} />
          <span className={`text-xs sm:text-sm font-medium ${isDelivery ? "text-primary font-bold" : "text-gray-600 dark:text-gray-400"}`}>
            Delivery
          </span>
          {isDelivery && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded-b-full" />
          )}
        </Link>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-300 dark:bg-gray-700" />

        {/* Dining Tab */}
        <Link
          to="/food/user/dining"
          className={`flex flex-1 flex-col items-center gap-1.5 px-2 sm:px-3 py-2 transition-all duration-200 relative ${isDining
              ? "text-primary"
              : "text-gray-600 dark:text-gray-400"
            }`}
        >
          <UtensilsCrossed className={`h-5 w-5 ${isDining ? "text-primary" : "text-gray-600 dark:text-gray-400"}`} strokeWidth={2} />
          <span className={`text-xs sm:text-sm font-medium ${isDining ? "text-primary font-bold" : "text-gray-600 dark:text-gray-400"}`}>
            Dining
          </span>
          {isDining && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded-b-full" />
          )}
        </Link>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-300 dark:bg-gray-700" />

        {/* Under 250 Tab */}
        <Link
          to="/food/user/under-250"
          className={`flex flex-1 flex-col items-center gap-1.5 px-2 sm:px-3 py-2 transition-all duration-200 relative ${isUnder250
              ? "text-primary"
              : "text-gray-600 dark:text-gray-400"
            }`}
        >
          <Tag className={`h-5 w-5 ${isUnder250 ? "text-primary fill-primary/10" : "text-gray-600 dark:text-gray-400"}`} strokeWidth={2} />
          <span className={`text-xs sm:text-sm font-medium ${isUnder250 ? "text-primary font-bold" : "text-gray-600 dark:text-gray-400"}`}>
            Under ₹{under250PriceLimit}
          </span>
          {isUnder250 && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded-b-full" />
          )}
        </Link>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-300 dark:bg-gray-700" />

        {/* Profile Tab */}
        <Link
          to="/food/user/profile"
          className={`flex flex-1 flex-col items-center gap-1.5 px-2 sm:px-3 py-2 transition-all duration-200 relative ${isProfile
              ? "text-primary"
              : "text-gray-600 dark:text-gray-400"
            }`}
        >
          <User className={`h-5 w-5 ${isProfile ? "text-primary fill-primary/10" : "text-gray-600 dark:text-gray-400"}`} />
          <span className={`text-xs sm:text-sm font-medium ${isProfile ? "text-primary font-bold" : "text-gray-600 dark:text-gray-400"}`}>
            Profile
          </span>
          {isProfile && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded-b-full" />
          )}
        </Link>
      </div>
    </div>
  )
}
