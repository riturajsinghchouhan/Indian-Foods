import React, { useState, useEffect, useRef } from 'react';
import api from '@food/api/axios';
import { getGoogleMapsApiKey } from '@food/utils/googleMapsApiKey';
import { Loader } from '@googlemaps/js-api-loader';
import { Loader2, MapPin, Clock, Package, CheckCircle2, Navigation, ShoppingBag, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { getRestaurantAvailabilityStatus } from '../../utils/restaurantAvailability';

export default function StatusMonitor() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('statusMonitorTab') || 'restaurants';
  }); // 'restaurants' or 'delivery'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState({ restaurants: [], deliveryPartners: [] });
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/food/admin/live-monitor/status');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load live monitor status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('statusMonitorTab', tab);
    setSelectedItem(null);
  };

  const isRestaurantOpen = (restaurant) => {
    const status = getRestaurantAvailabilityStatus(restaurant);
    return status.isOpen;
  };

  const getList = () => {
    let list = activeTab === 'restaurants' ? data.restaurants : data.deliveryPartners;

    if (searchTerm.trim()) {
      const lowerQuery = searchTerm.toLowerCase();
      list = list.filter(item => {
        if (activeTab === 'restaurants') {
          return item.restaurantName?.toLowerCase().includes(lowerQuery) || item.ownerName?.toLowerCase().includes(lowerQuery);
        } else {
          return item.name?.toLowerCase().includes(lowerQuery) || item.phone?.includes(lowerQuery);
        }
      });
    }

    // Sort online to the top
    if (activeTab === 'restaurants') {
      list = [...list].sort((a, b) => {
        const aOpen = isRestaurantOpen(a);
        const bOpen = isRestaurantOpen(b);
        if (aOpen === bOpen) return 0;
        return aOpen ? -1 : 1;
      });
    } else {
      list = [...list].sort((a, b) => {
        const aOnline = a.availabilityStatus === 'online';
        const bOnline = b.availabilityStatus === 'online';
        const aFree = aOnline && !a.currentOrder;
        const bFree = bOnline && !b.currentOrder;

        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;

        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;

        return 0;
      });
    }
    return list;
  };

  const list = getList();

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Live Status Monitor</h1>
        <div className="bg-white p-1 rounded-lg shadow-sm inline-flex border border-gray-200">
          <button
            onClick={() => handleTabChange('restaurants')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'restaurants' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Restaurants ({data.restaurants.length})
          </button>
          <button
            onClick={() => handleTabChange('delivery')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'delivery' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Delivery Partners ({data.deliveryPartners.length})
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left Panel: List */}
        <div className="w-1/3 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-semibold text-gray-700 mb-2">All {activeTab === 'restaurants' ? 'Restaurants' : 'Partners'}</h2>
            <input 
              type="text" 
              placeholder={`Search ${activeTab === 'restaurants' ? 'restaurants' : 'partners'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading && list.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : list.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No {activeTab === 'restaurants' ? 'restaurants' : 'delivery partners'} online
              </div>
            ) : (
              <ul className="space-y-2">
                {list.map((item) => (
                  <li
                    key={item._id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      selectedItem?._id === item._id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {activeTab === 'restaurants' ? (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                          {item.logo ? <img src={item.logo} className="w-full h-full object-cover" alt="" /> : <ShoppingBag className="w-5 h-5 m-auto text-gray-400 mt-2.5" />}
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                          {item.profilePhoto ? <img src={item.profilePhoto} className="w-full h-full object-cover" alt="" /> : <Truck className="w-5 h-5 m-auto text-gray-400 mt-2.5" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {activeTab === 'restaurants' ? item.restaurantName : item.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {activeTab === 'restaurants' ? [item.area || item.location?.area, item.city || item.location?.city].filter(Boolean).join(', ') : item.phone}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {activeTab === 'restaurants' ? (
                          <span className={`w-2.5 h-2.5 rounded-full ${isRestaurantOpen(item) ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></span>
                        ) : (
                          <span className={`w-2.5 h-2.5 rounded-full ${item.availabilityStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Panel: Details */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {!selectedItem ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Navigation className="w-12 h-12 mb-4 text-gray-300" />
              <p>Select an item from the list to view live details</p>
            </div>
          ) : activeTab === 'restaurants' ? (
            <RestaurantDetails restaurant={selectedItem} />
          ) : (
            <DeliveryPartnerDetails partner={selectedItem} onRefresh={fetchStatus} />
          )}
        </div>
      </div>
    </div>
  );
}

function RestaurantDetails({ restaurant }) {
  const { stats } = restaurant;
  const isOpen = getRestaurantAvailabilityStatus(restaurant).isOpen;

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
        <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shadow-sm">
          {restaurant.logo ? <img src={restaurant.logo} className="w-full h-full object-cover" alt="" /> : <ShoppingBag className="w-8 h-8 m-auto text-gray-400 mt-6" />}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">{restaurant.restaurantName}</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${isOpen ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
              {isOpen ? 'Online' : 'Offline'}
            </span>
          </div>
          <p className="text-gray-500 flex items-center gap-1 mt-1">
            <MapPin className="w-4 h-4" />
            {[restaurant.addressLine1 || restaurant.location?.addressLine1, restaurant.area || restaurant.location?.area, restaurant.city || restaurant.location?.city].filter(Boolean).join(', ')}
          </p>
          {(restaurant.ownerName || restaurant.ownerPhone) && (
             <p className="text-sm text-gray-600 mt-2">
               <strong>Owner:</strong> {restaurant.ownerName} • {restaurant.ownerPhone}
             </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <Package className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-xs text-blue-600 font-medium">Total</p>
          <p className="text-2xl font-bold text-blue-700">{stats.totalOrders || 0}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <Clock className="w-5 h-5 text-orange-500 mb-2" />
          <p className="text-xs text-orange-600 font-medium">Active</p>
          <p className="text-2xl font-bold text-orange-700">{stats.activeOrders || 0}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-xs text-green-600 font-medium">Delivered</p>
          <p className="text-2xl font-bold text-green-700">{stats.deliveredOrders || 0}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="w-5 h-5 flex items-center justify-center text-red-500 mb-2 font-bold text-lg">X</span>
          <p className="text-xs text-red-600 font-medium">Cancelled</p>
          <p className="text-2xl font-bold text-red-700">{stats.cancelledOrders || 0}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className="w-5 h-5 flex items-center justify-center text-purple-500 mb-2 font-bold text-lg">₹</span>
          <p className="text-xs text-purple-600 font-medium">Revenue</p>
          <p className="text-2xl font-bold text-purple-700">₹{stats.revenue?.toFixed(0) || 0}</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          Working Hours
        </h3>
        {restaurant.outletTimings?.timings && restaurant.outletTimings.timings.length > 0 ? (
          <div className="grid grid-cols-2 gap-y-3">
            {restaurant.outletTimings.timings.map((schedule, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {schedule.day} {schedule.isOpen ? '' : '(Closed)'}
                </span>
                <span className={`text-sm ${schedule.isOpen ? 'text-gray-500' : 'text-red-400'}`}>
                  {schedule.isOpen ? `${schedule.openingTime} - ${schedule.closingTime}` : 'Closed'}
                </span>
              </div>
            ))}
          </div>
        ) : restaurant.openDays && restaurant.openDays.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700">
              <span className="text-gray-500 font-normal">Timings:</span> {restaurant.openingTime} - {restaurant.closingTime}
            </p>
            <p className="text-sm font-medium text-gray-700 mt-1">
              <span className="text-gray-500 font-normal">Open Days:</span> {restaurant.openDays.join(', ')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No schedule defined (Always Open)</p>
        )}
      </div>
    </div>
  );
}



function DeliveryPartnerDetails({ partner, onRefresh }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const handleToggleStatus = async () => {
    try {
      setTogglingStatus(true);
      const newStatus = partner.availabilityStatus === 'online' ? 'offline' : 'online';
      const res = await api.patch(`/food/admin/delivery/${partner._id}/availability`, { status: newStatus });
      if (res.data?.success) {
        toast.success(`Partner marked ${newStatus}`);
        onRefresh();
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleAssignOrder = async () => {
    if (!assignOrderId.trim()) {
      toast.error('Please enter an Order ID');
      return;
    }
    try {
      setAssigning(true);
      const res = await api.post(`/food/admin/orders/${assignOrderId.trim()}/assign-delivery`, { deliveryPartnerId: partner._id });
      if (res.data?.success) {
        toast.success('Order assigned successfully');
        setAssignOrderId('');
        onRefresh();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign order');
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    setShowMap(false);
  }, [partner]);

  useEffect(() => {
    if (!showMap) return;
    let isMounted = true;
    const initMap = async () => {
      try {
        const apiKey = await getGoogleMapsApiKey();
        
        let google = window.google;
        if (!google) {
          if (apiKey) {
            const loader = new Loader({
              apiKey: apiKey,
              version: "weekly",
              libraries: ["geometry"]
            });
            google = await loader.load();
          }
        }

        if (google && isMounted && mapRef.current) {
          const lat = partner.lastLat || 20.5937;
          const lng = partner.lastLng || 78.9629;
          const position = { lat, lng };

          if (!mapInstanceRef.current) {
            mapInstanceRef.current = new google.maps.Map(mapRef.current, {
              center: position,
              zoom: partner.lastLat ? 15 : 5,
              mapTypeControl: false,
              streetViewControl: false,
            });
          } else {
            mapInstanceRef.current.setCenter(position);
            mapInstanceRef.current.setZoom(partner.lastLat ? 15 : 5);
          }

          if (partner.lastLat && partner.lastLng) {
            if (!markerRef.current) {
              markerRef.current = new google.maps.Marker({
                position,
                map: mapInstanceRef.current,
                title: partner.name,
              });
            } else {
              markerRef.current.setPosition(position);
            }
          }
          setMapLoading(false);
        }
      } catch (err) {
        console.error("Error loading map:", err);
        if (isMounted) setMapLoading(false);
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, [partner, showMap]);

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 flex-shrink-0">
        <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden shadow-sm">
          {partner.profilePhoto ? <img src={partner.profilePhoto} className="w-full h-full object-cover" alt="" /> : <Truck className="w-8 h-8 m-auto text-gray-400 mt-4" />}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {partner.name}
                <span className={`w-2.5 h-2.5 rounded-full ${partner.availabilityStatus === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`}></span>
              </h2>
              <p className="text-gray-500">{partner.phone}</p>
              <p className="text-sm text-gray-400">Vehicle: {partner.vehicleType} ({partner.vehicleNumber})</p>
            </div>
            <button 
              onClick={handleToggleStatus}
              disabled={togglingStatus}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${partner.availabilityStatus === 'online' ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'}`}
            >
              {togglingStatus ? 'Updating...' : `Mark ${partner.availabilityStatus === 'online' ? 'Offline' : 'Online'}`}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex-shrink-0">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2 text-sm">
          <Package className="w-4 h-4" />
          Manual Assign Order
        </h3>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Order ID (e.g. 10001)"
            value={assignOrderId}
            onChange={(e) => setAssignOrderId(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:border-blue-400"
          />
          <button 
            onClick={handleAssignOrder}
            disabled={assigning}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>

      {partner.shiftStartPic && (
        <div className="mb-6 bg-green-50/50 border border-green-100 rounded-xl p-4 flex gap-4 items-center flex-shrink-0">
          <div className="w-20 h-20 shrink-0 rounded-xl border-2 border-green-400 overflow-hidden shadow-sm bg-gray-100">
            <img src={partner.shiftStartPic} alt="Shift Verification" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Shift Verified</p>
            <p className="text-sm font-bold text-gray-800 mb-0.5">
              Started at {new Date(partner.shiftStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            {partner.shiftStartAddress && (
              <p className="text-xs text-gray-500 line-clamp-2">
                {partner.shiftStartAddress}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6 flex-shrink-0">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex flex-col items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-500 mb-2" />
          <p className="text-sm text-green-600 font-medium">Delivered Today</p>
          <p className="text-2xl font-bold text-green-700">{partner.deliveredToday || 0}</p>
        </div>
        <div className={`border rounded-xl p-4 flex flex-col items-center justify-center ${partner.currentOrder ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
          <Package className={`w-6 h-6 mb-2 ${partner.currentOrder ? 'text-orange-500' : 'text-gray-400'}`} />
          <p className={`text-sm font-medium ${partner.currentOrder ? 'text-orange-600' : 'text-gray-500'}`}>Current Status</p>
          <p className={`text-lg font-bold ${partner.currentOrder ? 'text-orange-700' : 'text-gray-600'}`}>
            {partner.currentOrder ? `Has Active Order` : 'Free'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="flex flex-col h-full overflow-y-auto pr-2">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-500" />
            Today's Orders
          </h3>
          {partner.todayOrders && partner.todayOrders.length > 0 ? (
            <div className="space-y-3 pb-4">
              {partner.todayOrders.map((order, idx) => (
                <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-bold text-gray-800">{order.orderId}</span>
                      <p className="text-xs text-gray-500">{new Date(order.time).toLocaleTimeString()}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'delivered' ? 'bg-green-50 text-green-600' :
                      order.status === 'cancelled_by_admin' || order.status === 'cancelled_by_user' || order.status === 'cancelled_by_restaurant' ? 'bg-red-50 text-red-600' :
                      'bg-orange-50 text-orange-600'
                    }`}>
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Restaurant</p>
                      <p className="text-sm text-gray-700 truncate">{order.restaurantName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Customer</p>
                      <p className="text-sm text-gray-700 truncate">{order.userName}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-100">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No orders assigned today</p>
            </div>
          )}
        </div>

        <div className="h-full min-h-[16rem] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative">
          {!showMap ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 mb-6 max-w-xs">
                Click below to view the live location on the map. This helps save map API usage when not needed.
              </p>
              <button
                onClick={() => setShowMap(true)}
                className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Track Location
              </button>
            </div>
          ) : (
            <>
              <div ref={mapRef} className="absolute inset-0 w-full h-full" />
              
              {mapLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              {!mapLoading && (!partner.lastLat || !partner.lastLng) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm">
                  <div className="text-center bg-white p-4 rounded-lg shadow-sm">
                    <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Location not available</p>
                  </div>
                </div>
              )}
              
              {partner.lastLocationAt && (
                <div className="absolute bottom-4 left-4 bg-white px-3 py-1.5 rounded-md shadow-md text-xs font-medium text-gray-600 z-10 border border-gray-200">
                  Updated: {new Date(partner.lastLocationAt).toLocaleTimeString()}
                </div>
              )}
              
              <button
                onClick={() => setShowMap(false)}
                className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-md shadow-lg text-xs font-medium text-gray-700 z-[1000] border border-gray-200 hover:bg-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="text-red-500 font-bold">X</span> Close Map
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
