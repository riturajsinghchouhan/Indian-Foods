import { useState, useEffect } from "react";
import { Info, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { adminAPI } from "@food/api";

export default function ToggleManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toggles, setToggles] = useState({
    onlinePaymentOnly: false,
    maxCodAmount: 0,
    maintenanceMode: false,
    customerRegistration: true,
    restaurantRegistration: true,
    deliveryRegistration: true,
  });

  useEffect(() => {
    fetchBusinessSettings();
  }, []);

  const fetchBusinessSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getBusinessSettings();
      const settings = response?.data?.data || response?.data;

      if (settings) {
        setToggles((prev) => ({
          ...prev,
          onlinePaymentOnly: settings.onlinePaymentOnly || false,
          maxCodAmount: settings.maxCodAmount || 0,
          maintenanceMode: settings.maintenanceMode || false,
          customerRegistration: settings.customerRegistration !== false,
          restaurantRegistration: settings.restaurantRegistration !== false,
          deliveryRegistration: settings.deliveryRegistration !== false,
        }));
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load toggle settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChange = (field) => {
    setToggles((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleInputChange = (field, value) => {
    setToggles((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const dataToSend = {
        onlinePaymentOnly: toggles.onlinePaymentOnly,
        maxCodAmount: Number(toggles.maxCodAmount) || 0,
        maintenanceMode: toggles.maintenanceMode,
        customerRegistration: toggles.customerRegistration,
        restaurantRegistration: toggles.restaurantRegistration,
        deliveryRegistration: toggles.deliveryRegistration,
      };

      await adminAPI.updateBusinessSettings(dataToSend);
      toast.success("Toggle settings saved successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save toggle settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Toggle Management</h1>
          <p className="text-xs lg:text-sm text-slate-500 mt-1">
            Enable or disable system modules and features dynamically.
          </p>
        </div>

        {/* Note card (top-right) */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3 max-w-md">
          <div className="mt-0.5">
            <Info className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xs lg:text-sm text-slate-700">
            <p className="font-semibold text-amber-700 mb-0.5">Note</p>
            <p>Don&apos;t forget to click the &quot;Save Changes&quot; button below to save changes.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-4 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">System Features</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Online Payment Only Toggle */}
              <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Online Payment Only</p>
                  <p className="text-xs text-slate-500 mt-0.5">Disable Cash on Delivery globally</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('onlinePaymentOnly')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    toggles.onlinePaymentOnly ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      toggles.onlinePaymentOnly ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Max COD Amount Input */}
              {!toggles.onlinePaymentOnly && (
                <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Max COD Amount</p>
                    <p className="text-xs text-slate-500 mt-0.5">Disable COD if order exceeds this amount (0 for no limit)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={toggles.maxCodAmount}
                      onChange={(e) => handleInputChange('maxCodAmount', e.target.value)}
                      className="w-24 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Maintenance Mode Toggle */}
              <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Maintenance Mode</p>
                  <p className="text-xs text-slate-500 mt-0.5">Suspend all customer ordering temporarily</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('maintenanceMode')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    toggles.maintenanceMode ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      toggles.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Customer Registration */}
              <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Customer Registration</p>
                  <p className="text-xs text-slate-500 mt-0.5">Allow new customers to sign up</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('customerRegistration')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    toggles.customerRegistration ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      toggles.customerRegistration ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Restaurant Registration */}
              <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Restaurant Registration</p>
                  <p className="text-xs text-slate-500 mt-0.5">Allow new restaurants to join</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('restaurantRegistration')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    toggles.restaurantRegistration ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      toggles.restaurantRegistration ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Delivery Registration */}
              <div className="flex items-center justify-between border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Delivery Partner Registration</p>
                  <p className="text-xs text-slate-500 mt-0.5">Allow new delivery riders to join</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleChange('deliveryRegistration')}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    toggles.deliveryRegistration ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      toggles.deliveryRegistration ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              
            </div>
          </div>

          {/* Save Button Section */}
          <div className="px-4 py-4 border-t border-slate-100">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
