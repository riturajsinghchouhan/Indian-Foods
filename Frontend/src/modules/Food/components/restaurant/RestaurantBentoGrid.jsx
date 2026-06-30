import { cn } from "@food/utils/utils"

/**
 * Desktop bento-style card grid. Mobile stays single-column stacked.
 * @param {"default"|"orders"|"explore"|"inventory"|"dashboard-kpi"|"dashboard-charts"} variant
 */
export default function RestaurantBentoGrid({
  children,
  variant = "default",
  className,
  as: Component = "div",
}) {
  return (
    <Component
      className={cn(
        "restaurant-bento-grid",
        variant === "orders" && "restaurant-bento-grid--orders",
        variant === "explore" && "restaurant-bento-grid--explore",
        variant === "inventory" && "restaurant-bento-grid--inventory",
        variant === "dashboard-kpi" && "restaurant-bento-grid--dashboard-kpi",
        variant === "dashboard-charts" && "restaurant-bento-grid--dashboard-charts",
        className
      )}
    >
      {children}
    </Component>
  )
}
