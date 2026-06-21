import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../../../../services/api/index.js';
import { Loader2, UploadCloud, FileSpreadsheet, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const MenuBulkUpload = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [menuData, setMenuData] = useState([]);
  const [totalQueued, setTotalQueued] = useState(0);

  // Polling ref to track interval
  const pollRef = useRef(null);

  useEffect(() => {
    fetchRestaurants();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await adminAPI.getApprovedRestaurants({ limit: 1000 });
      if (res?.data?.success) {
        setRestaurants(res.data.data?.restaurants || res.data.restaurants || []);
      }
    } catch {
      toast.error('Failed to fetch restaurants');
    }
  };

  /**
   * Poll the backend every 5s for updated image URLs.
   * When all pending items have images, stop polling.
   */
  const startPolling = useCallback((restaurantId) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await adminAPI.getMenuItemsStatus(restaurantId);
        if (!res?.data?.success) return;

        const statusMap = res.data.data; // { itemId: imageUrl }

        setMenuData(prev => {
          let anyPending = false;
          const updated = prev.map(section => ({
            ...section,
            items: section.items.map(item => {
              const newUrl = statusMap[item.id];
              if (newUrl && !item.image) {
                // Image just arrived!
                return { ...item, image: newUrl, imageFailed: false };
              }
              if (!item.image && !newUrl) {
                anyPending = true;
              }
              return item;
            })
          }));

          // If nothing is pending anymore, stop polling
          if (!anyPending && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }

          return updated;
        });
      } catch {
        // Silently ignore poll errors
      }
    }, 5000);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedRestaurant) return toast.error('Please select a restaurant first');
    if (!file) return toast.error('Please select an Excel or CSV file');

    setIsUploading(true);
    setMenuData([]);
    setTotalQueued(0);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    try {
      const res = await adminAPI.uploadMenuBulk(selectedRestaurant, file);
      if (res?.data?.success) {
        toast.success(res.data.message);
        setMenuData(res.data.menu || []);
        setTotalQueued(res.data.queuedJobsCount || 0);

        // Start polling if there are images to generate
        if (res.data.queuedJobsCount > 0) {
          startPolling(selectedRestaurant);
        }
      } else {
        toast.error(res?.data?.message || 'Failed to upload menu');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegenerate = async (itemId, sectionIndex, itemIndex) => {
    // Clear image to show loading
    setMenuData(prev =>
      prev.map(section => ({
        ...section,
        items: section.items.map(item =>
          item.id === itemId ? { ...item, image: '', imageFailed: false } : item
        )
      }))
    );

    try {
      const res = await adminAPI.regenerateMenuItemImage(selectedRestaurant, sectionIndex, itemIndex, itemId);
      if (res?.data?.success) {
        toast.success('Regenerating image...');
        // Start polling to pick up the new image
        startPolling(selectedRestaurant);
      }
    } catch {
      toast.error('Failed to regenerate');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'Name,Description,Price,Category Name,Food Type (Veg/Non-Veg),Preparation Time,Is Available (TRUE/FALSE),"Variants (Name:Price, ...)","Add-ons (Name:Price, ...)"';
    const row1 = 'Chicken Dum Biryani,Authentic slow-cooked chicken,350,Biryani,Non-Veg,30 mins,TRUE,"Half:180, Full:350","Raita:30, Extra Masala:20"';
    const row2 = 'Paneer Tikka,Grilled cottage cheese cubes,280,Starters,Veg,20 mins,TRUE,,"Mint Chutney:10"';
    const row3 = 'Paneer Pizza,Cheesy paneer loaded pizza,349,Pizza,Veg,20 mins,TRUE,,';
    const csvContent = `${headers}\n${row1}\n${row2}\n${row3}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample-menu-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats from current menu state
  const allItems = menuData.flatMap(s => s.items);
  const doneCount = allItems.filter(i => !!i.image).length;
  const pendingCount = allItems.filter(i => !i.image && !i.imageFailed).length;
  const failedCount = allItems.filter(i => i.imageFailed).length;
  const progress = totalQueued > 0 ? Math.round((doneCount / (doneCount + pendingCount + failedCount)) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Bulk Menu Upload</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Upload Excel/CSV — Images auto-generated by FLUX.1 AI</p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-600" /> Download Template
        </button>
      </div>

      {/* Upload Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Select Restaurant</label>
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 px-4"
            >
              <option value="">-- Choose Restaurant --</option>
              {restaurants.map(r => (
                <option key={r._id} value={r._id}>{r.restaurantName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Upload File</label>
            <div className="relative">
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-12 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 hover:border-blue-500 hover:bg-blue-50/50 transition-colors">
                <UploadCloud className="w-5 h-5 text-gray-400" />
                {file ? file.name : 'Drag & Drop or Click to Select File'}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={isUploading || !file || !selectedRestaurant}
            className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
            {isUploading ? 'Processing...' : 'Upload & Start AI Generation'}
          </button>
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {menuData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6"
          >
            {/* Progress */}
            {totalQueued > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-blue-600">AI Image Generation Progress</span>
                  <span className="text-gray-500">{doneCount} / {doneCount + pendingCount + failedCount} done ({progress}%)</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> {doneCount} Done</span>
                  {pendingCount > 0 && <span className="flex items-center gap-1 text-blue-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {pendingCount} Generating</span>}
                  {failedCount > 0 && <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="w-3.5 h-3.5" /> {failedCount} Failed</span>}
                </div>
              </div>
            )}

            {/* Menu Grid */}
            <div className="space-y-8 mt-4">
              {menuData.map((section, sIdx) => (
                <div key={section.name} className="space-y-4">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight border-b pb-2">{section.name}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.items.map((item, iIdx) => (
                      <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-200 shrink-0 relative flex flex-col items-center justify-center">
                          {item.image ? (
                            <>
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              <button
                                onClick={() => handleRegenerate(item.id, sIdx, iIdx)}
                                className="absolute bottom-1 right-1 w-6 h-6 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black transition-colors"
                                title="Regenerate"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            </>
                          ) : item.imageFailed ? (
                            <div className="flex flex-col items-center justify-center gap-1 p-2">
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                              <span className="text-[8px] font-bold uppercase text-red-500">Failed</span>
                              <button onClick={() => handleRegenerate(item.id, sIdx, iIdx)} className="text-[8px] font-black uppercase bg-red-100 text-red-600 px-2 py-0.5 rounded-full hover:bg-red-200">Retry</button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400 gap-1.5">
                              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                              <span className="text-[9px] font-bold uppercase tracking-widest text-center leading-tight">AI<br />Generating</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-3 h-3 border-2 flex items-center justify-center ${item.type === 'veg' ? 'border-green-600' : 'border-red-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                            </span>
                            <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-2">{item.description}</p>
                          <div className="font-black text-sm text-gray-900">₹{item.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuBulkUpload;
