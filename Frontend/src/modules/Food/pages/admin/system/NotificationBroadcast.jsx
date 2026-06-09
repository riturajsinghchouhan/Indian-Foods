import { useEffect, useMemo, useState } from "react";
import { BellRing, Loader2, Search, Send, Trash2 } from "lucide-react";
import { adminAPI } from "@food/api";

const TARGET_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "USER", label: "Users" },
  { value: "RESTAURANT", label: "Restaurants" },
  { value: "DELIVERY", label: "Delivery Partners" },
  { value: "CUSTOM", label: "Particular Persons" },
];

const getRows = (response) => {
  const payload = response?.data?.data;
  return (
    payload?.items ||
    payload?.restaurants ||
    payload?.partners ||
    payload?.customers ||
    payload?.users ||
    payload?.data ||
    payload?.rows ||
    response?.data?.items ||
    []
  );
};

const normalizeRecipients = (response, ownerType, mapper) =>
  getRows(response)
    .map((item) => mapper(item, ownerType))
    .filter((item) => item.ownerId);

const toDateLabel = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function NotificationBroadcast() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    targetType: "ALL",
  });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [allRecipients, setAllRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await adminAPI.getBroadcastNotifications({ page: 1, limit: 50 });
      setHistory(response?.data?.data?.items || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadRecipients = async () => {
    try {
      setRecipientLoading(true);
      const [customersRes, restaurantsRes, deliveryRes] = await Promise.all([
        adminAPI.getCustomers({ page: 1, limit: 500 }),
        adminAPI.getRestaurants({ page: 1, limit: 500 }),
        adminAPI.getDeliveryPartners({ page: 1, limit: 500 }),
      ]);

      const customers = normalizeRecipients(customersRes, "USER", (item, ownerType) => ({
        ownerType,
        ownerId: String(item?._id || item?.id || ""),
        label: String(item?.name || item?.phone || "User").trim(),
        subLabel: [item?.phone, item?.email].filter(Boolean).join(" • "),
      }));

      const restaurants = normalizeRecipients(restaurantsRes, "RESTAURANT", (item, ownerType) => ({
        ownerType,
        ownerId: String(item?._id || item?.id || ""),
        label: String(item?.restaurantName || item?.ownerName || "Restaurant").trim(),
        subLabel: [item?.ownerPhone, item?.ownerEmail].filter(Boolean).join(" • "),
      }));

      const deliveryPartners = normalizeRecipients(deliveryRes, "DELIVERY_PARTNER", (item, ownerType) => ({
        ownerType,
        ownerId: String(item?._id || item?.id || ""),
        label: String(item?.name || item?.phone || "Delivery Partner").trim(),
        subLabel: [item?.phone, item?.email].filter(Boolean).join(" • "),
      }));

      setAllRecipients([...customers, ...restaurants, ...deliveryPartners]);
    } catch {
      setAllRecipients([]);
    } finally {
      setRecipientLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (form.targetType !== "CUSTOM") return;
    if (allRecipients.length > 0) return;
    loadRecipients();
  }, [allRecipients.length, form.targetType]);

  useEffect(() => {
    if (form.targetType !== "CUSTOM") {
      setSelectedRecipients([]);
      setSearch("");
    }
  }, [form.targetType]);

  const filteredRecipients = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    if (!keyword) return allRecipients;
    return allRecipients.filter((item) =>
      [item.label, item.subLabel, item.ownerType]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [allRecipients, search]);

  const selectedKeys = useMemo(
    () => new Set(selectedRecipients.map((item) => `${item.ownerType}:${item.ownerId}`)),
    [selectedRecipients]
  );

  const toggleRecipient = (recipient) => {
    const key = `${recipient.ownerType}:${recipient.ownerId}`;
    setSelectedRecipients((prev) =>
      prev.some((item) => `${item.ownerType}:${item.ownerId}` === key)
        ? prev.filter((item) => `${item.ownerType}:${item.ownerId}` !== key)
        : [...prev, recipient]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    if (form.targetType === "CUSTOM" && selectedRecipients.length === 0) return;

    try {
      setSubmitting(true);
      await adminAPI.createBroadcastNotification({
        title: form.title.trim(),
        message: form.message.trim(),
        targetType: form.targetType,
        targetIds:
          form.targetType === "CUSTOM"
            ? selectedRecipients.map((item) => item.ownerId)
            : [],
        targets:
          form.targetType === "CUSTOM"
            ? selectedRecipients.map((item) => ({
                ownerType: item.ownerType,
                ownerId: item.ownerId,
                label: item.label,
                subLabel: item.subLabel,
              }))
            : [],
      });
      setForm({ title: "", message: "", targetType: "ALL" });
      setSelectedRecipients([]);
      setSearch("");
      window.dispatchEvent(new Event("adminBroadcastUpdated"));
      await loadHistory();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    try {
      await adminAPI.deleteBroadcastNotification(id);
      window.dispatchEvent(new Event("adminBroadcastUpdated"));
      await loadHistory();
    } catch {}
  };

  return (
    <div className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <div className="w-full mx-auto space-y-3">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <BellRing className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Broadcast Notification</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Form Section */}
          <div className="lg:col-span-4 bg-white rounded-lg shadow-sm border border-slate-200 p-3">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Send Broadcast</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Title</span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Enter notification title"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Target Type</span>
                  <select
                    value={form.targetType}
                    onChange={(event) => setForm((prev) => ({ ...prev, targetType: event.target.value }))}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {TARGET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Message</span>
                <textarea
                  value={form.message}
                  onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                  placeholder="Enter notification message"
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
                />
              </label>

              {form.targetType === "CUSTOM" && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search users, restaurants..."
                      className="w-full text-xs bg-transparent outline-none flex-1 min-w-[150px]"
                    />
                  </div>

                  <div className="text-[10px] font-medium text-slate-500 px-1">
                    Selected recipients: {selectedRecipients.length}
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    {recipientLoading ? (
                      <div className="p-3 text-xs text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Loading...
                      </div>
                    ) : filteredRecipients.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">No recipients found.</div>
                    ) : (
                      filteredRecipients.map((recipient) => {
                        const key = `${recipient.ownerType}:${recipient.ownerId}`;
                        const checked = selectedKeys.has(key);
                        return (
                          <label
                            key={key}
                            className="flex items-start gap-2 px-2 py-2 cursor-pointer hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRecipient(recipient)}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold text-slate-900 leading-tight">
                                {recipient.label}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {recipient.ownerType.replaceAll("_", " ")}
                                {recipient.subLabel ? ` • ${recipient.subLabel}` : ""}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-all w-full"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Broadcast
                </button>
              </div>
            </form>
          </div>

          {/* History Section */}
          <div className="lg:col-span-8 bg-white rounded-lg shadow-sm border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-sm font-bold text-slate-900">Broadcast History</h2>
            </div>

            {historyLoading ? (
              <div className="py-10 text-xs text-slate-500 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="py-10 text-xs text-slate-500 text-center flex flex-col items-center">
                <p>No broadcast notifications found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-hide border border-slate-200 rounded-lg">
                <table className="w-full text-left" style={{ tableLayout: 'auto' }}>
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">Title</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">Message</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">Target</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">Recipients</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-700 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {history.map((item) => (
                      <tr key={item?._id} className="hover:bg-slate-50 transition-colors align-top">
                        <td className="px-3 py-2">
                          <span className="text-[11px] font-semibold text-slate-900">{item?.title || "Notification"}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[11px] text-slate-600 line-clamp-2 max-w-[200px]">{item?.message || "-"}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[11px] text-slate-700 whitespace-nowrap">{item?.targetLabel || item?.targetType}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-[11px] font-medium text-slate-700">{item?.targetCount || item?.targets?.length || 0}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-[11px] text-slate-500">{toDateLabel(item?.createdAt)}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(item?._id)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
