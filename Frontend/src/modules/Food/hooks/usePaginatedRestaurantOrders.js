import { useCallback, useEffect, useState } from "react"
import { restaurantAPI } from "@food/api"

export const RESTAURANT_ORDERS_PAGE_SIZE = 30

/** Maps OrdersMain tab ids to backend `status` query values */
export const RESTAURANT_ORDER_TAB_STATUS = {
  new: "new",
  preparing: "preparing",
  ready: "ready",
  "out-for-delivery": "out_for_delivery",
  scheduled: "scheduled",
  completed: "completed",
  cancelled: "cancelled",
  dead: "dead",
  all: "all",
}

export function usePaginatedRestaurantOrders({
  status = "all",
  refreshToken = 0,
  enablePoll = false,
  pollMs = 15000,
}) {
  const [page, setPage] = useState(1)
  const [orders, setOrders] = useState([])
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: RESTAURANT_ORDERS_PAGE_SIZE,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(
    async (pageNum, { silent = false } = {}) => {
      if (!silent) setLoading(true)
      try {
        const response = await restaurantAPI.getOrders({
          page: pageNum,
          limit: RESTAURANT_ORDERS_PAGE_SIZE,
          status,
        })

        if (response.data?.success) {
          const rows = response.data.data?.orders || []
          const m = response.data.data?.meta || {}
          setOrders(rows)
          setMeta({
            total: Number(m.total ?? rows.length),
            page: Number(m.page ?? pageNum),
            limit: Number(m.limit ?? RESTAURANT_ORDERS_PAGE_SIZE),
            totalPages: Number(m.totalPages ?? 1),
          })
        } else {
          setOrders([])
          setMeta({
            total: 0,
            page: pageNum,
            limit: RESTAURANT_ORDERS_PAGE_SIZE,
            totalPages: 1,
          })
        }
      } catch {
        setOrders([])
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [status]
  )

  useEffect(() => {
    setPage(1)
  }, [status, refreshToken])

  useEffect(() => {
    fetchOrders(page)
  }, [page, refreshToken, fetchOrders])

  useEffect(() => {
    if (!enablePoll) return undefined
    const intervalId = setInterval(() => {
      if (document.hidden) return
      fetchOrders(page, { silent: true })
    }, pollMs)
    return () => clearInterval(intervalId)
  }, [enablePoll, pollMs, page, fetchOrders])

  const goToPage = (nextPage) => {
    setPage((current) => {
      const max = meta.totalPages || 1
      return Math.max(1, Math.min(nextPage, max))
    })
  }

  return {
    orders,
    meta,
    page,
    loading,
    setPage: goToPage,
    goNext: () => goToPage(page + 1),
    goPrev: () => goToPage(page - 1),
    refetch: () => fetchOrders(page),
  }
}

export default usePaginatedRestaurantOrders
