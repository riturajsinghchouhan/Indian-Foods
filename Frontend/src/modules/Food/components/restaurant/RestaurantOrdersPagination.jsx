import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@food/utils/utils"

export default function RestaurantOrdersPagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  className,
}) {
  const safeTotalPages = Math.max(1, totalPages || 1)
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages)
  const start = total === 0 ? 0 : (safePage - 1) * limit + 1
  const end = total === 0 ? 0 : Math.min(safePage * limit, total)

  if (safeTotalPages <= 1 && total <= limit) return null

  return (
    <div
      className={cn(
        "mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-700">{start}-{end}</span> of{" "}
        <span className="font-semibold text-gray-700">{total}</span> orders
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="min-w-[88px] text-center text-xs font-semibold text-gray-600">
          Page {safePage} / {safeTotalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= safeTotalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
