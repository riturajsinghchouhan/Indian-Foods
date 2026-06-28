import { Link, useLocation } from "react-router-dom"
import { Tag, User, Home as HomeIcon, UtensilsCrossed, ShoppingBag } from "lucide-react"
import { useState, useEffect } from "react"
import { getPublicLandingSettings } from "@food/api"
import { useAppLocation } from "@food/hooks/useAppLocation"

export default function BottomNavigation() {
  const location = useLocation()
  const pathname = location.pathname
  const { zoneId } = useAppLocation()
  const [under250PriceLimit, setUnder250PriceLimit] = useState(250)
  const [showDining, setShowDining] = useState(true)

  // Fetch landing settings to get dynamic price limit and features
  useEffect(() => {
    let cancelled = false
    getPublicLandingSettings(zoneId || null)
      .then((settings) => {
        if (cancelled || !settings) return
        if (typeof settings.under250PriceLimit === 'number') {
          setUnder250PriceLimit(settings.under250PriceLimit)
        }
        if (typeof settings.showDining === 'boolean') {
          setShowDining(settings.showDining)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnder250PriceLimit(250)
          setShowDining(true)
        }
      })
    return () => { cancelled = true }
  }, [zoneId])

  // Check active routes - support both /user/* and /* paths
  const isDining = pathname === "/food/dining" || pathname.startsWith("/food/user/dining")
  const isUnder250 = pathname === "/food/under-250" || pathname.startsWith("/food/user/under-250")
  const isOrders = pathname === "/food/orders" || pathname.startsWith("/food/user/orders")
  const isProfile = pathname === "/food/profile" || pathname.startsWith("/food/user/profile")
  const isHome =
    !isDining &&
    !isUnder250 &&
    !isOrders &&
    !isProfile &&
    (pathname === "/food" ||
      pathname === "/food/" ||
      pathname === "/food/user" ||
      (pathname.startsWith("/food/user") &&
        !pathname.includes("/dining") &&
        !pathname.includes("/under-250") &&
        !pathname.includes("/profile")))

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 bg-white dark:bg-[#1a1a1a] rounded-[2rem] z-50 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between px-2 py-1.5">
        {/* Home Tab */}
        <Link
          to="/food/user/"
          className={`flex flex-col items-center justify-center gap-1 w-[22%] py-2 rounded-[1.5rem] transition-all duration-300 ${isHome
              ? "bg-[#ffeef2] dark:bg-primary/20 text-primary"
              : "text-slate-500 dark:text-gray-400"
            }`}
        >
          <HomeIcon className={`h-5 w-5 ${isHome ? "text-primary" : "text-slate-500 dark:text-gray-400"}`} strokeWidth={isHome ? 2.5 : 2} />
          <span className={`text-[10px] sm:text-xs font-bold ${isHome ? "text-primary" : "text-slate-500 dark:text-gray-400 font-semibold"}`}>
            Home
          </span>
        </Link>

        {/* Under 250 Tab */}
        <Link
          to="/food/user/under-250"
          className={`flex flex-col items-center justify-center gap-1 w-[22%] py-2 rounded-[1.5rem] transition-all duration-300 ${isUnder250
              ? "bg-[#ffeef2] dark:bg-primary/20 text-primary"
              : "text-slate-500 dark:text-gray-400"
            }`}
        >
          <Tag className={`h-5 w-5 ${isUnder250 ? "text-primary" : "text-slate-500 dark:text-gray-400"}`} strokeWidth={isUnder250 ? 2.5 : 2} />
          <span className={`text-[10px] sm:text-xs font-bold ${isUnder250 ? "text-primary" : "text-slate-500 dark:text-gray-400 font-semibold"}`}>
            Under ₹{under250PriceLimit}
          </span>
        </Link>

        {/* Orders Tab */}
        <Link
          to="/food/user/orders"
          className={`flex flex-col items-center justify-center gap-1 w-[22%] py-2 rounded-[1.5rem] transition-all duration-300 ${isOrders
              ? "bg-[#ffeef2] dark:bg-primary/20 text-primary"
              : "text-slate-500 dark:text-gray-400"
            }`}
        >
          <ShoppingBag className={`h-5 w-5 ${isOrders ? "text-primary" : "text-slate-500 dark:text-gray-400"}`} strokeWidth={isOrders ? 2.5 : 2} />
          <span className={`text-[10px] sm:text-xs font-bold ${isOrders ? "text-primary" : "text-slate-500 dark:text-gray-400 font-semibold"}`}>
            Orders
          </span>
        </Link>

        {/* Profile Tab */}
        <Link
          to="/food/user/profile"
          className={`flex flex-col items-center justify-center gap-1 w-[22%] py-2 rounded-[1.5rem] transition-all duration-300 ${isProfile
              ? "bg-[#ffeef2] dark:bg-primary/20 text-primary"
              : "text-slate-500 dark:text-gray-400"
            }`}
        >
          <User className={`h-5 w-5 ${isProfile ? "text-primary" : "text-slate-500 dark:text-gray-400"}`} strokeWidth={isProfile ? 2.5 : 2} />
          <span className={`text-[10px] sm:text-xs font-bold ${isProfile ? "text-primary" : "text-slate-500 dark:text-gray-400 font-semibold"}`}>
            Profile
          </span>
        </Link>
      </div>
    </div>
  )
}
