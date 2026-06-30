import { useEffect } from "react"

/**
 * RestaurantLayout locks document scroll; pages must not use default Lenis().
 * Native overflow on #restaurant-main-scroll handles scrolling.
 * This hook is a no-op kept for pages that previously initialized Lenis on window.
 */
export default function useRestaurantLenis() {
  useEffect(() => {
    const main = document.getElementById("restaurant-main-scroll")
    if (!main) return undefined

    // Ensure native scroll is enabled if a prior Lenis instance left inline styles.
    main.style.overflow = ""
    main.style.height = ""

    return undefined
  }, [])
}
