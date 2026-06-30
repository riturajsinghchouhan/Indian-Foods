import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@food/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@food/components/ui/select"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  ArrowUpRight,
  Clock,
  IndianRupee,
  Package,
  ShoppingBag,
  Star,
  TrendingUp,
  Wallet,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
  AlertTriangle,
} from "lucide-react"
import { restaurantAPI } from "@food/api"
import { cn } from "@food/utils/utils"
import RestaurantPageShell from "@food/components/restaurant/RestaurantPageShell"
import RestaurantBentoGrid from "@food/components/restaurant/RestaurantBentoGrid"

const INR = "\u20B9"

function formatCurrency(value) {
  return `${INR}${Number(value || 0).toLocaleString("en-IN")}`
}

function KpiCard({ title, value, subtitle, icon: Icon, trend, accent = "primary" }) {
  const accentClasses = {
    primary: "from-[#B80B3D]/10 to-[#66001D]/5 text-[#B80B3D]",
    green: "from-emerald-50 to-emerald-100/50 text-emerald-700",
    amber: "from-amber-50 to-amber-100/50 text-amber-700",
    blue: "from-blue-50 to-blue-100/50 text-blue-700",
    violet: "from-violet-50 to-violet-100/50 text-violet-700",
  }

  return (
    <Card className="restaurant-bento-card border-0 shadow-none ring-1 ring-gray-100 overflow-hidden h-full">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {title}
            </p>
            <p className="mt-2 text-2xl font-black text-gray-900 truncate">{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-gray-500 font-medium">{subtitle}</p>
            )}
            {trend != null && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                {trend}
              </p>
            )}
          </div>
          <div
            className={cn(
              "shrink-0 rounded-2xl p-3 bg-gradient-to-br",
              accentClasses[accent] || accentClasses.primary
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const chartTooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
}

export default function RestaurantDashboard() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState("month")
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const res = await restaurantAPI.getDashboardStats({ period })
        if (!cancelled && res.data?.success) {
          setData(res.data.data)
        }
      } catch {
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [period])

  const kpis = data?.kpis || {}
  const orderPie = data?.orderStatusBreakdown || []
  const paymentPie = data?.paymentMethodBreakdown || []
  const revenueTrend = data?.revenueTrend || []
  const monthlyTrend = data?.monthlyTrend || []
  const topItems = data?.topItems || []
  const recentOrders = data?.recentOrders || []

  const periodLabel = useMemo(() => {
    switch (period) {
      case "today":
        return "Today"
      case "week":
        return "This week"
      case "month":
        return "This month"
      case "year":
        return "This year"
      default:
        return "Overall"
    }
  }, [period])

  if (loading && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#B80B3D] border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <RestaurantPageShell className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B80B3D]">
            Restaurant overview
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 mt-1">
            {data?.restaurant?.name || "Dashboard"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {periodLabel} performance ·{" "}
            <span
              className={cn(
                "font-semibold",
                data?.restaurant?.isOnline ? "text-emerald-600" : "text-gray-400"
              )}
            >
              {data?.restaurant?.isOnline ? "Online" : "Offline"}
            </span>
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-[180px] rounded-xl border-gray-200 bg-white">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="year">This year</SelectItem>
            <SelectItem value="overall">Overall</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <RestaurantBentoGrid variant="dashboard-kpi">
        <KpiCard
          title="Total revenue"
          value={formatCurrency(kpis.totalRevenue)}
          subtitle={`${kpis.deliveredOrders || 0} delivered orders`}
          icon={IndianRupee}
          accent="primary"
        />
        <KpiCard
          title="Today's orders"
          value={kpis.todayOrders ?? 0}
          subtitle={`${kpis.pendingOrders || 0} pending · ${kpis.processingOrders || 0} processing`}
          icon={ShoppingBag}
          accent="blue"
        />
        <KpiCard
          title="Available balance"
          value={formatCurrency(kpis.availableBalance)}
          subtitle={`Cycle earnings ${formatCurrency(kpis.cycleEarnings)}`}
          icon={Wallet}
          accent="green"
        />
        <KpiCard
          title="Average rating"
          value={Number(kpis.averageRating || 0).toFixed(1)}
          subtitle={`${kpis.totalRatings || 0} reviews`}
          icon={Star}
          accent="amber"
        />
        <KpiCard
          title="Total orders"
          value={kpis.totalOrders ?? 0}
          subtitle={`${kpis.completionRate || 0}% completion rate`}
          icon={CheckCircle2}
          accent="green"
        />
        <KpiCard
          title="Avg order value"
          value={formatCurrency(kpis.averageOrderValue)}
          subtitle="Per delivered order"
          icon={TrendingUp}
          accent="violet"
        />
        <KpiCard
          title="Menu items"
          value={kpis.menuItems ?? 0}
          subtitle={`${kpis.activeMenuItems || 0} active · ${kpis.addons || 0} add-ons`}
          icon={UtensilsCrossed}
          accent="primary"
        />
        <KpiCard
          title="Cancelled"
          value={kpis.cancelledOrders ?? 0}
          subtitle={`${kpis.cancellationRate || 0}% cancellation rate`}
          icon={XCircle}
          accent="amber"
        />
      </RestaurantBentoGrid>

      <RestaurantBentoGrid variant="dashboard-charts">
        <Card className="restaurant-bento-card restaurant-bento-span-8 border-0 shadow-none ring-1 ring-gray-100 h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-gray-900">
              Revenue trend
            </CardTitle>
            <p className="text-xs text-gray-500">Daily revenue & orders (last 14 days)</p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B80B3D" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#B80B3D" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#B80B3D"
                    fill="url(#revGrad)"
                    name="Revenue (₹)"
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#66001D"
                    strokeWidth={2}
                    dot={false}
                    name="Orders"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="restaurant-bento-card restaurant-bento-span-4 border-0 shadow-none ring-1 ring-gray-100 h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-gray-900">
              Order status
            </CardTitle>
            <p className="text-xs text-gray-500">Donut breakdown · {periodLabel}</p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={orderPie}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {orderPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend formatter={(v) => <span className="text-xs text-gray-700">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="restaurant-bento-card restaurant-bento-span-4 border-0 shadow-none ring-1 ring-gray-100 h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-gray-900">
              Payment methods
            </CardTitle>
            <p className="text-xs text-gray-500">Pie chart by payment type</p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={paymentPie}
                    dataKey="value"
                    nameKey="label"
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {paymentPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend formatter={(v) => <span className="text-xs text-gray-700">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="restaurant-bento-card restaurant-bento-span-8 border-0 shadow-none ring-1 ring-gray-100 h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-gray-900">
              Monthly momentum
            </CardTitle>
            <p className="text-xs text-gray-500">Bar chart — orders & revenue by month</p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Bar dataKey="orders" fill="#B80B3D" radius={[6, 6, 0, 0]} name="Orders" />
                  <Bar dataKey="revenue" fill="#66001D" radius={[6, 6, 0, 0]} name="Revenue (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="restaurant-bento-card restaurant-bento-span-6 border-0 shadow-none ring-1 ring-gray-100 h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Top dishes</CardTitle>
              <p className="text-xs text-gray-500">Best sellers in selected period</p>
            </div>
            <Package className="h-5 w-5 text-[#B80B3D]" />
          </CardHeader>
          <CardContent className="space-y-3">
            {topItems.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No item data yet</p>
            ) : (
              topItems.map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fdf2f5] text-xs font-black text-[#B80B3D]">
                      {idx + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{item.orders} sold</p>
                    <p className="text-xs text-gray-500">{formatCurrency(item.revenue)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="restaurant-bento-card restaurant-bento-span-6 border-0 shadow-none ring-1 ring-gray-100 h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Recent orders</CardTitle>
              <p className="text-xs text-gray-500">Latest activity from your outlet</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/food/restaurant/orders/all")}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#B80B3D] hover:underline"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">No orders yet</p>
            ) : (
              recentOrders.map((order) => (
                <button
                  key={order.orderId}
                  type="button"
                  onClick={() => navigate(`/food/restaurant/orders/${order.orderId}`)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">#{order.orderId}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(order.total)}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {String(order.status || "").replace(/_/g, " ")}
                    </p>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </RestaurantBentoGrid>

      {(kpis.complaints || 0) > 0 && (
        <Card className="restaurant-bento-card border-amber-200 bg-amber-50/80 shadow-none">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900">
                {kpis.complaints} open complaint{kpis.complaints !== 1 ? "s" : ""}
              </p>
              <p className="text-sm text-amber-800/80">Review customer issues in the feedback section.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/food/restaurant/feedback?tab=complaints")}
              className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
            >
              View
            </button>
          </CardContent>
        </Card>
      )}
    </RestaurantPageShell>
  )
}
