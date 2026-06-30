import { cn } from "@food/utils/utils"

/**
 * Standard page wrapper inside RestaurantLayout scroll area.
 * Use for consistent padding, max-width, and desktop card grids.
 */
export default function RestaurantPageShell({
  children,
  className,
  noPadding = false,
  fullWidth = false,
}) {
  return (
    <div
      className={cn(
        "restaurant-page min-h-full w-full",
        !noPadding && "px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8",
        !fullWidth && "mx-auto max-w-[var(--restaurant-content-max,1400px)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function RestaurantCardGrid({ children, className, cols = "auto" }) {
  return (
    <div
      className={cn(
        "restaurant-card-grid",
        cols === "2" && "restaurant-card-grid-2",
        cols === "3" && "restaurant-card-grid-3",
        cols === "4" && "restaurant-card-grid-4",
        className
      )}
    >
      {children}
    </div>
  )
}

export function RestaurantSubheader({ title, description, actions, className }) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {title && (
          <h1 className="text-xl font-black text-gray-900 md:text-2xl">{title}</h1>
        )}
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
