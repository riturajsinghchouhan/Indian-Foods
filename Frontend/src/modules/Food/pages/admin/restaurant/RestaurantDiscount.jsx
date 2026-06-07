import { useEffect, useState, useMemo } from "react";
import { adminAPI } from "@food/api";
import { toast } from "sonner";
import { Loader2, Search, Percent, Settings2, Plus, Trash2, X, ChevronRight, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog";
import { Button } from "@food/components/ui/button";

export default function RestaurantDiscount() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal state
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [itemDiscounts, setItemDiscounts] = useState([]);
  const [discountRules, setDiscountRules] = useState([]);
  const [activeTab, setActiveTab] = useState("global"); // global, items, rules

  useEffect(() => {
    let mounted = true;
    const fetchZones = async () => {
      try {
        setLoadingZones(true);
        const response = await adminAPI.getZones({ limit: 1000 });
        const list = response?.data?.data?.zones || response?.data?.zones || response?.data?.data || [];
        if (mounted) {
          setZones(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        console.error("DEBUG Failed to load zones:", error);
      } finally {
        if (mounted) setLoadingZones(false);
      }
    };
    fetchZones();
    return () => { mounted = false; };
  }, []);

  const fetchRestaurants = async () => {
    if (!selectedZone) {
      setRestaurants([]);
      return;
    }
    try {
      setLoadingRestaurants(true);
      const response = await adminAPI.getRestaurants({ zoneId: selectedZone, limit: 1000 });
      const list = response?.data?.data?.restaurants || response?.data?.restaurants || [];
      setRestaurants(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error("Failed to load restaurants");
    } finally {
      setLoadingRestaurants(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [selectedZone]);

  const openDiscountModal = async (restaurant) => {
    setSelectedRestaurant(restaurant);
    setGlobalDiscount(restaurant.discount || 0);
    setItemDiscounts(restaurant.itemDiscounts || []);
    setDiscountRules(restaurant.discountRules || []);
    setActiveTab("global");
    
    // Fetch Menu Items
    setLoadingMenu(true);
    try {
      const res = await adminAPI.getFoods({ restaurantId: restaurant.id || restaurant._id, limit: 1000 });
      const menuData = res?.data?.data?.foods || res?.data?.foods || res?.data?.data || [];
      // Data from getFoods is directly an array of items, we can optionally map categoryName to sectionName for consistency
      const allItems = menuData.map(i => ({ ...i, sectionName: i.categoryName || 'General' }));
      setMenu(allItems);
    } catch (error) {
      toast.error("Failed to load restaurant menu");
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleSaveDiscounts = async () => {
    try {
      setSaving(true);
      const id = selectedRestaurant.id || selectedRestaurant._id;
      const payload = {
        discount: Number(globalDiscount) || 0,
        itemDiscounts: itemDiscounts,
        discountRules: discountRules
      };
      const response = await adminAPI.updateRestaurant(id, payload);
      if (response?.data?.success || response?.status === 200) {
        toast.success("Discounts updated successfully");
        fetchRestaurants(); // refresh list
        setSelectedRestaurant(null); // close modal
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update discounts");
    } finally {
      setSaving(false);
    }
  };

  // Rule Helpers
  const addRule = () => {
    setDiscountRules([...discountRules, { conditionType: 'PRICE_ABOVE', conditionValue: '200', discountValue: 10, discountType: 'PERCENTAGE' }]);
  };
  
  const updateRule = (index, field, value) => {
    const newRules = [...discountRules];
    let parsedValue = value;
    if (field === 'discountValue' && value !== '') {
      parsedValue = Number(value);
    }
    newRules[index] = { ...newRules[index], [field]: parsedValue };
    setDiscountRules(newRules);
  };
  
  const removeRule = (index) => {
    setDiscountRules(discountRules.filter((_, i) => i !== index));
  };

  // Item Helpers
  const updateItemDiscount = (itemId, discountValue) => {
    const existing = itemDiscounts.find(i => i.itemId === itemId);
    if (!discountValue || discountValue === '0') {
      setItemDiscounts(itemDiscounts.filter(i => i.itemId !== itemId));
    } else {
      if (existing) {
        setItemDiscounts(itemDiscounts.map(i => i.itemId === itemId ? { ...i, discountValue: Number(discountValue) } : i));
      } else {
        setItemDiscounts([...itemDiscounts, { itemId, discountValue: Number(discountValue), discountType: 'PERCENTAGE' }]);
      }
    }
  };

  const filteredRestaurants = useMemo(() => {
    if (!searchQuery) return restaurants;
    const lowerQuery = searchQuery.toLowerCase();
    return restaurants.filter(r => 
      (r.restaurantName || "").toLowerCase().includes(lowerQuery) ||
      (r.ownerName || "").toLowerCase().includes(lowerQuery)
    );
  }, [restaurants, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Advanced Discounts Engine</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Set global discounts, item-specific markdowns, or create smart pricing rules (e.g., "15% off orders above ₹500").
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-64">
              <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Zone</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-blue-600 text-sm"
              >
                <option value="">-- Choose a Zone --</option>
                {loadingZones && <option value="" disabled>Loading zones...</option>}
                {zones.map((zone) => {
                  const id = String(zone?._id || zone?.id || "");
                  return (
                    <option key={id} value={id}>
                      {zone?.name || zone?.zoneName || zone?.serviceLocation || id}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      </div>

      {selectedZone && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              {filteredRestaurants.length} Restaurant{filteredRestaurants.length !== 1 ? 's' : ''} Found
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search restaurant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed">
              <thead className="border-b border-slate-200 bg-slate-100">
                <tr>
                  <th className="w-[30%] px-5 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">Restaurant</th>
                  <th className="w-[25%] px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">Owner</th>
                  <th className="w-[20%] px-4 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">Active Discounts</th>
                  <th className="w-[25%] px-5 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingRestaurants ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
                      <p className="mt-2 text-sm text-slate-500">Loading restaurants...</p>
                    </td>
                  </tr>
                ) : filteredRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <p className="text-lg font-semibold text-slate-700">No restaurants found</p>
                      <p className="mt-1 text-sm text-slate-500">Try selecting a different zone or adjust search.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRestaurants.map((restaurant) => {
                    const id = String(restaurant.id || restaurant._id);
                    const hasGlobal = (restaurant.discount || 0) > 0;
                    const hasItems = (restaurant.itemDiscounts || []).length > 0;
                    const hasRules = (restaurant.discountRules || []).length > 0;
                    
                    return (
                      <tr key={id} className="align-middle hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 overflow-hidden rounded-lg bg-slate-100 shrink-0">
                              {restaurant?.profileImage || restaurant?.logo ? (
                                <img src={restaurant.profileImage || restaurant.logo} alt={restaurant.restaurantName} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center font-bold text-slate-500">
                                  {String(restaurant?.restaurantName || "R").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="truncate text-sm font-semibold text-slate-900">{restaurant.restaurantName}</p>
                              <p className="text-xs text-slate-500">{restaurant.cuisines?.slice(0, 2).join(", ")}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-slate-800">{restaurant.ownerName || "N/A"}</p>
                          <p className="text-xs text-slate-500">{restaurant.ownerPhone}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col gap-1 items-center">
                            {hasGlobal && <span className="inline-flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200"><Percent className="w-3 h-3"/> Global {restaurant.discount}%</span>}
                            {hasItems && <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200"><Tag className="w-3 h-3"/> {restaurant.itemDiscounts.length} Items</span>}
                            {hasRules && <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200"><Settings2 className="w-3 h-3"/> {restaurant.discountRules.length} Rules</span>}
                            {!hasGlobal && !hasItems && !hasRules && <span className="text-xs text-slate-400">None</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button
                            variant="outline"
                            onClick={() => openDiscountModal(restaurant)}
                            className="bg-white hover:bg-slate-50"
                          >
                            Manage Discounts
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advanced Discount Modal */}
      <Dialog open={!!selectedRestaurant} onOpenChange={(open) => !open && setSelectedRestaurant(null)}>
        <DialogContent className="sm:max-w-[700px] h-[80vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl">
              Discounts for {selectedRestaurant?.restaurantName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-48 bg-slate-50 border-r border-slate-100 flex flex-col">
              <button 
                onClick={() => setActiveTab('global')}
                className={`text-left px-4 py-3 text-sm font-medium border-l-2 transition-colors ${activeTab === 'global' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}
              >
                Global Discount
              </button>
              <button 
                onClick={() => setActiveTab('items')}
                className={`text-left px-4 py-3 text-sm font-medium border-l-2 transition-colors ${activeTab === 'items' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}
              >
                Item Specific
              </button>
              <button 
                onClick={() => setActiveTab('rules')}
                className={`text-left px-4 py-3 text-sm font-medium border-l-2 transition-colors ${activeTab === 'rules' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}
              >
                Smart Rules
              </button>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              
              {/* GLOBAL TAB */}
              {activeTab === 'global' && (
                <div className="space-y-4 max-w-sm">
                  <h3 className="font-semibold text-slate-800">Flat Restaurant Discount</h3>
                  <p className="text-sm text-slate-500">This discount percentage will be applied to every single item in the restaurant unless overridden by an item-specific discount.</p>
                  
                  <div className="mt-4">
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Discount Percentage</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      />
                      <Percent className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}
              
              {/* ITEMS TAB */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-800">Item-Specific Discounts</h3>
                  <p className="text-sm text-slate-500">Set unique discounts for specific menu items. This overrides the global discount.</p>
                  
                  {loadingMenu ? (
                    <div className="py-10 text-center flex flex-col items-center">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                      <p className="text-sm text-slate-500">Loading menu...</p>
                    </div>
                  ) : menu.length === 0 ? (
                     <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
                       <p className="text-sm text-slate-500">No items found in this restaurant's menu.</p>
                     </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden mt-4">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 font-medium text-slate-600">Item Name</th>
                            <th className="px-4 py-3 font-medium text-slate-600 w-24">Price</th>
                            <th className="px-4 py-3 font-medium text-slate-600 w-32">Discount %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {menu.map(item => {
                            const itemId = item._id || item.id;
                            const current = itemDiscounts.find(i => i.itemId === itemId);
                            return (
                              <tr key={itemId} className="hover:bg-slate-50/50">
                                <td className="px-4 py-3">
                                  <p className="font-medium text-slate-900">{item.name}</p>
                                  <p className="text-[10px] text-slate-500 uppercase">{item.sectionName}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-600">₹{item.price}</td>
                                <td className="px-4 py-3">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      placeholder="0"
                                      value={current?.discountValue || ''}
                                      onChange={(e) => updateItemDiscount(itemId, e.target.value)}
                                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-600"
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              
              {/* RULES TAB */}
              {activeTab === 'rules' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800">Smart Pricing Rules</h3>
                      <p className="text-sm text-slate-500">Automatically apply discounts when an item matches a rule.</p>
                    </div>
                    <Button onClick={addRule} size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4" /> Add Rule
                    </Button>
                  </div>
                  
                  {discountRules.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl mt-4">
                       <Settings2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                       <p className="text-sm font-medium text-slate-700">No active rules</p>
                       <p className="text-xs text-slate-500 mt-1">Create a rule to dynamically discount items based on price.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-4">
                      {discountRules.map((rule, index) => (
                        <div key={index} className="flex flex-wrap gap-3 items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <span className="text-sm font-medium text-slate-500 w-12">If</span>
                          
                          <select 
                            value={rule.conditionType} 
                            onChange={(e) => updateRule(index, 'conditionType', e.target.value)}
                            className="bg-white border border-slate-300 rounded-md px-3 py-2 text-sm outline-none w-full sm:w-auto"
                          >
                            <option value="PRICE_ABOVE">Item Price is Above</option>
                            <option value="PRICE_BELOW">Item Price is Below</option>
                          </select>
                          
                          <div className="relative flex-1 min-w-[100px]">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">₹</span>
                            <input
                              type="number"
                              value={rule.conditionValue || ''}
                              onChange={(e) => updateRule(index, 'conditionValue', e.target.value)}
                              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md text-sm outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                            />
                          </div>
                          
                          <span className="text-sm font-medium text-slate-500">Apply</span>
                          
                          <div className="relative w-24 shrink-0">
                            <input
                              type="number"
                              value={rule.discountValue || ''}
                              onChange={(e) => updateRule(index, 'discountValue', e.target.value)}
                              className="w-full pl-3 pr-7 py-2 border border-slate-300 rounded-md text-sm outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                            />
                            <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          </div>
                          
                          <button onClick={() => removeRule(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSelectedRestaurant(null)} disabled={saving}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]" onClick={handleSaveDiscounts} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
