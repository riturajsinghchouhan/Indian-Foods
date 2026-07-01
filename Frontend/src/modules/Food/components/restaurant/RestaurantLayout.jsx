import { useState, useEffect, useMemo } from "react"
import { Outlet, useLocation } from "react-router-dom"
import RestaurantNavbar from "./RestaurantNavbar"
import RestaurantSidebar from "./RestaurantSidebar"
import BottomNavOrders from "./BottomNavOrders"
import { RestaurantLayoutProvider, useRestaurantLayout } from "./RestaurantLayoutContext"
import { RestaurantNotificationProvider } from "@food/context/RestaurantNotificationContext"
import { getRestaurantLayoutOptions, getRestaurantHeaderOptions } from "@food/utils/restaurantLayoutConfig"
import { cn } from "@food/utils/utils"

export default function RestaurantLayout() {
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const routeDefaults = useMemo(
    () => getRestaurantLayoutOptions(pathname),
    [pathname]
  )

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("restaurant_sidebar_collapsed")
      if (saved !== null) setSidebarCollapsed(JSON.parse(saved))
    } catch {
      /* ignore */
    }
  }, [])

  // Only the main content area scrolls — lock document/body scroll
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  const handleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("restaurant_sidebar_collapsed", JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <RestaurantNotificationProvider>
      <RestaurantLayoutProvider routeDefaults={routeDefaults}>
        <RestaurantLayoutShell
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          onToggleCollapse={handleCollapse}
        />
      </RestaurantLayoutProvider>
    </RestaurantNotificationProvider>
  )
}

function RestaurantLayoutShell({
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  onToggleCollapse,
}) {
  const { pathname } = useLocation()
  const { options } = useRestaurantLayout()
  const { showSidebar, showNavbar, showBottomNav } = options
  const headerOptions = getRestaurantHeaderOptions(pathname)

  return (
    <div className="restaurant-layout h-screen overflow-hidden bg-gray-100 flex">
      {sidebarOpen && showSidebar && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {showSidebar && (
        <RestaurantSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      )}

      <div
        className={cn(
          "flex h-screen min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300",
          showSidebar && (sidebarCollapsed ? "lg:ml-20" : "lg:ml-72")
        )}
      >
        <header className="restaurant-layout-header shrink-0 z-[var(--rt-header-z)] bg-white shadow-sm border-b border-gray-100">
          {showNavbar && (
            <RestaurantNavbar
              {...headerOptions}
              onMobileMenuOpen={
                showSidebar ? () => setSidebarOpen(true) : undefined
              }
            />
          )}
        </header>

        <main
          id="restaurant-main-scroll"
          className={cn(
            "restaurant-main-scroll flex-1 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-contain",
            showBottomNav &&
              "pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0"
          )}
        >
          <div id="restaurant-scroll-content" className="min-h-full w-full">
            <Outlet />
          </div>
        </main>

        {showBottomNav && <BottomNavOrders />}
      </div>
    </div>
  )
}
