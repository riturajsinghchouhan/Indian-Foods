import { useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@food/utils/utils"

const SIZE_MAX = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  auto: "max-w-[min(92vw,640px)]",
}

/**
 * Centered, content-sized restaurant modal.
 * variant="sheet" slides up from bottom but stays centered — not edge-to-edge.
 */
export default function RestaurantModal({
  open,
  onClose,
  children,
  title,
  description,
  size = "md",
  variant = "center",
  showClose = true,
  closeOnBackdrop = true,
  noPadding = false,
  className,
  contentClassName,
  panelClassName,
  zIndex = 200,
  bottomOffset = false,
}) {
  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const isSheet = variant === "sheet"
  const maxClass = SIZE_MAX[size] ?? SIZE_MAX.md

  const panelClasses = cn(
    "restaurant-modal-panel bg-white text-gray-900 shadow-2xl overflow-hidden",
    "inline-block w-auto align-middle",
    "max-w-[min(calc(100vw-2rem),28rem)]",
    maxClass,
    isSheet ? "rounded-t-3xl sm:rounded-2xl" : "rounded-2xl",
    panelClassName
  )

  const hasHeader = Boolean(title || (showClose && !noPadding))

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            "fixed inset-0 flex justify-center p-4 sm:p-6",
            isSheet ? "items-end sm:items-center" : "items-center",
            bottomOffset && "pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
          )}
          style={{ zIndex }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnBackdrop ? onClose : undefined}
          />

          <motion.div
            className={cn("relative z-10 shrink-0", className)}
            initial={
              isSheet
                ? { y: 40, opacity: 0, scale: 0.96 }
                : { scale: 0.92, opacity: 0, y: 8 }
            }
            animate={
              isSheet
                ? { y: 0, opacity: 1, scale: 1 }
                : { scale: 1, opacity: 1, y: 0 }
            }
            exit={
              isSheet
                ? { y: 40, opacity: 0, scale: 0.96 }
                : { scale: 0.92, opacity: 0, y: 8 }
            }
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={panelClasses} data-restaurant-modal-panel>
              {hasHeader && (
                <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
                  <div className="min-w-0 flex-1">
                    {title && (
                      <h2 className="text-lg font-bold text-gray-900 leading-tight">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="mt-1 text-sm text-gray-500">{description}</p>
                    )}
                  </div>
                  {showClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              )}
              <div
                className={cn(
                  !noPadding && (hasHeader ? "px-5 pb-5" : "p-5"),
                  contentClassName
                )}
              >
                {children}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (typeof document === "undefined") return null
  return createPortal(content, document.body)
}

export { SIZE_MAX as RESTAURANT_MODAL_SIZES }
