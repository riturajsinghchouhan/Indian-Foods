import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Search, Mic, Bell, CheckCircle2, Tag, Gift, AlertCircle, Clock, BellOff, X, IndianRupee } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@food/components/ui/popover";
import { Badge } from "@food/components/ui/badge";
import { Avatar, AvatarFallback } from "@food/components/ui/avatar";
import foodIcon from "@food/assets/category-icons/food.png";
import quickIcon from "@food/assets/category-icons/quick.png";
import taxiIcon from "@food/assets/category-icons/taxi.png";
import hotelIcon from "@food/assets/category-icons/hotel.png";
import useNotificationInbox from "@food/hooks/useNotificationInbox";

const ICON_MAP = {
  CheckCircle2,
  Tag,
  Gift,
  AlertCircle
};

export default function HomeHeader({
  activeTab,
  setActiveTab,
  location,
  savedAddressText,
  handleLocationClick,
  handleSearchFocus,
  placeholderIndex,
  placeholders,
  vegMode = false,
  handleVegModeChange,
  isCategoryStuck = false,
  handleVoiceSearchClick
}) {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('food_user_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const {
    items: broadcastNotifications,
    unreadCount: broadcastUnreadCount,
    dismiss: dismissBroadcastNotification,
  } = useNotificationInbox("user", { limit: 20 });

  useEffect(() => {
    const syncNotifications = () => {
      const saved = localStorage.getItem('food_user_notifications');
      setNotifications(saved ? JSON.parse(saved) : []);
    };

    window.addEventListener('notificationsUpdated', syncNotifications);

    return () => window.removeEventListener('notificationsUpdated', syncNotifications);
  }, []);

  const mergedNotifications = useMemo(() => {
    const localItems = Array.isArray(notifications)
      ? notifications.map((item) => ({ ...item, source: "local" }))
      : [];
    const broadcastItems = (broadcastNotifications || []).map((item) => ({
      ...item,
      source: "broadcast",
      time: item.createdAt
        ? new Date(item.createdAt).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        : "Just now",
      type: "broadcast",
      icon: "Bell",
      iconColor: "text-blue-600",
    }));

    return [...broadcastItems, ...localItems].sort(
      (a, b) =>
        new Date(b.createdAt || b.timestamp || 0).getTime() -
        new Date(a.createdAt || a.timestamp || 0).getTime()
    );
  }, [broadcastNotifications, notifications]);

  const unreadCount = notifications.filter(n => !n.read).length + broadcastUnreadCount;

  const handleDeleteNotification = (id, source = "local") => {
    if (source === "broadcast") {
      dismissBroadcastNotification(id);
      return;
    }
    setNotifications((prev) => {
      const next = prev.filter((notification) => notification.id !== id);
      localStorage.setItem('food_user_notifications', JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { count: next.filter((n) => !n.read).length } }));
      return next;
    });
  };

  return (
    <>
      <div id="home-header-loc-row" className="relative pt-2 pb-0 px-4 transition-all duration-700 overflow-hidden bg-transparent shadow-none">
        {/* Subtle Artistic Glows - Adds depth without being 'boring' */}
        <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-[#48c479]/5 blur-[80px] rounded-full pointer-events-none" />

        {/* Main Header Content */}
        <div className="relative z-10 space-y-2.5">
          {/* Row 1: Location, Toggle, and Notifications */}
        <div className="flex items-center justify-between gap-3">
          {/* Location Selector */}
          <div
            className="flex items-center gap-2 cursor-pointer group min-w-0 flex-1"
            onClick={handleLocationClick}
          >
            <div className="flex-shrink-0 flex items-center justify-center">
              <MapPin className="h-[26px] w-[26px] text-[#e11d48]" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[15px] sm:text-[16px] font-bold text-white truncate tracking-tight">
                  {(() => {
                    const area = location?.area || location?.subLocality || location?.mainTitle || location?.neighborhood;
                    const city = (location?.city || "").toLowerCase();
                    const state = (location?.state || "").toLowerCase();

                    if (area && !/^-?\d+(\.\d+)?$/.test(area.trim())) {
                      const areaLower = area.toLowerCase();
                      if (areaLower !== city && areaLower !== state) {
                        return area;
                      }
                    }
                    
                    // Fallback to a part of the address if area is missing or redundant
                    if (location?.address && location.address !== "Select location") {
                      const parts = location.address.split(',').map(p => p.trim());
                      // Take the first part that isn't city or state
                      for (const part of parts) {
                        const partLower = part.toLowerCase();
                        if (partLower && 
                            partLower !== city && 
                            partLower !== state && 
                            !/^-?\d/.test(part) &&
                            part.length > 2) {
                          return part;
                        }
                      }
                    }
                    
                    return location?.area || location?.city || "Select Location";
                  })()}
                </span>
                <ChevronDown className="h-[16px] w-[16px] text-white flex-shrink-0" strokeWidth={2.5} />
              </div>
              
              <span className="text-[11px] font-medium text-white/80 uppercase truncate leading-tight mt-0.5">
                {(() => {
                  const addr = location?.formattedAddress || location?.address || "";
                  if (addr && addr.length > 5 && addr !== "Select location") {
                     return addr;
                  }
                  
                  const state = location?.state || "";
                  const pincode = location?.pincode || "";
                  
                  if (state && pincode) return `${state}, ${pincode}`;
                  if (state) return state;
                  if (pincode) return pincode;
                  
                  return "Pinpoint location";
                })()}
              </span>
            </div>
          </div>

          {/* Right Actions: Bell */}
          <div className="flex items-center gap-2.5">
 
            <Popover>
              <PopoverTrigger asChild>
                <div className="h-8 w-8 relative flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/20 cursor-pointer active:scale-90 transition-all">
                  <Bell className="h-4 w-4 text-white" />
                  {unreadCount > 0 && (
                    <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border animate-pulse ${vegMode ? 'bg-orange-400 border-[#00b09b]' : 'bg-orange-400 border-primary'}`} />
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 overflow-hidden border-none shadow-2xl rounded-2xl mt-2" align="end">
                <div className="bg-white dark:bg-gray-900">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Notifications
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="bg-orange-100 text-primary border-none text-[10px] h-4">
                          {unreadCount} New
                        </Badge>
                      )}
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {mergedNotifications.length > 0 ? (
                      mergedNotifications.slice(0, 5).map((notif) => {
                        const Icon = ICON_MAP[notif.icon] || Bell;
                        return (
                          <div key={notif.id} className="p-4 flex items-start gap-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 transition-colors">
                            <div className="mt-1 p-2 rounded-full bg-gray-100 text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{notif.title}</p>
                               <p className="text-xs text-gray-500 line-clamp-1">{notif.message}</p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center gap-2">
                        <BellOff className="h-10 w-10 text-gray-200" />
                        <p className="text-xs text-gray-400 font-medium">All caught up!</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 text-center">
                    <Link to="/food/user/notifications" className="text-xs font-bold text-gray-400">View All</Link>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        </div>
      </div>

      {/* Sticky Search Bar and Veg Toggle */}
      <div id="home-header-search-row" className={`relative sticky z-[60] px-1 pb-2 transition-all duration-300 pointer-events-none mt-2 sm:mt-3 ${isCategoryStuck ? 'top-0 pt-2 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-2xl' : 'top-2 pt-2 bg-transparent'}`}>
        <div className="flex items-center gap-2.5 w-[96%] mx-auto pointer-events-auto">
          {/* Search Bar */}
          <div
            className="relative bg-white/70 dark:bg-[#1a1a1a]/70 backdrop-blur-md rounded-2xl flex items-center px-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-white/50 dark:border-white/10 cursor-pointer active:scale-[0.98] transition-all duration-300 flex-1 h-11"
            onClick={handleSearchFocus}
          >
            <Search className="h-[18px] w-[18px] text-primary mr-2 shrink-0" strokeWidth={2.5} />
            
            <div className="flex-1 overflow-hidden relative h-5">
              <AnimatePresence mode="wait">
                <motion.span
                  key={placeholderIndex}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 text-[13px] font-bold text-gray-400 truncate flex items-center"
                >
                  {placeholders?.[placeholderIndex] || 'Search'}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 pl-2">
              <div className="h-5 w-[1px] bg-gray-200" />
              <Mic 
                className="h-5 w-5 text-primary" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoiceSearchClick?.();
                }}
              />
            </div>
          </div>

          {/* Veg Toggle (Stacked Pill Switch) */}
          <div 
            className="flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform duration-300 shrink-0 px-2 bg-white/70 dark:bg-[#1a1a1a]/70 backdrop-blur-md rounded-2xl py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-white/50 dark:border-white/10"
            onClick={() => handleVegModeChange?.(!vegMode)}
          >
            <div className="text-[9px] font-black leading-tight text-gray-700 dark:text-gray-200 tracking-wider text-center drop-shadow-sm">
              VEG<br/>MODE
            </div>
            <div className={`mt-0.5 w-[30px] h-[16px] rounded-full relative transition-colors duration-300 border border-white/20 ${vegMode ? 'bg-green-600' : 'bg-[#bcc0c5]/50'}`}>
              <div className={`absolute top-[1px] w-[12px] h-[12px] rounded-full bg-white shadow-sm transition-transform duration-300 ${vegMode ? 'translate-x-[15px]' : 'translate-x-[1px]'}`} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
