import { createContext, useContext, useState, useCallback, useMemo } from "react"

const defaultOptions = {
  showSidebar: true,
  showNavbar: null,
  showBottomNav: null,
}

const RestaurantLayoutContext = createContext({
  options: defaultOptions,
  setLayoutOptions: () => {},
  resetLayoutOptions: () => {},
})

export function RestaurantLayoutProvider({ children, routeDefaults }) {
  const [overrides, setOverrides] = useState({})

  const setLayoutOptions = useCallback((next) => {
    setOverrides((prev) => ({ ...prev, ...next }))
  }, [])

  const resetLayoutOptions = useCallback(() => {
    setOverrides({})
  }, [])

  const options = useMemo(
    () => ({
      showSidebar:
        overrides.showSidebar ?? routeDefaults.showSidebar ?? true,
      showNavbar:
        overrides.showNavbar ?? routeDefaults.showNavbar ?? false,
      showBottomNav:
        overrides.showBottomNav ?? routeDefaults.showBottomNav ?? true,
    }),
    [overrides, routeDefaults]
  )

  return (
    <RestaurantLayoutContext.Provider
      value={{ options, setLayoutOptions, resetLayoutOptions }}
    >
      {children}
    </RestaurantLayoutContext.Provider>
  )
}

export function useRestaurantLayout() {
  return useContext(RestaurantLayoutContext)
}

export default RestaurantLayoutContext
