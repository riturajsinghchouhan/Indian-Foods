import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../../../../services/api/index.js';
import { Loader2, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import io from 'socket.io-client';

const MenuBulkUpload = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [menuData, setMenuData] = useState([]);
  const [progress, setProgress] = useState(0);
  const [totalQueued, setTotalQueued] = useState(0);
  const [completedImages, setCompletedImages] = useState(0);

  useEffect(() => {
    fetchRestaurants();
    
    // Connect to Socket.io for real-time progress
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl, { transports: ['websocket'] });
    
    // Admin room might need to be joined, assuming it broadcasts to 'admin' room
    socket.on('connect', () => {
      // Assuming socket has a way to join admin, or it receives admin broadcasts
      socket.emit('joinRoom', 'admin'); 
    });

    socket.on('menuImageGenerated', (data) => {
      if (data.restaurantId === selectedRestaurant) {
        setCompletedImages(prev => prev + 1);
        
        // Update menu data in state
        setMenuData(prevMenu => {
          const newMenu = [...prevMenu];
          if (newMenu[data.sectionIndex] && newMenu[data.sectionIndex].items[data.itemIndex]) {
            newMenu[data.sectionIndex].items[data.itemIndex].image = data.imageUrl;
          }
          return newMenu;
        });
        
        toast.success(`Image generated for ${data.itemName}`);
      }
    });

    return () => socket.disconnect();
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const res = await adminAPI.getApprovedRestaurants({ limit: 1000 });
      if (res?.data?.success) {
        setRestaurants(res.data.data.restaurants || res.data.restaurants || []);
      }
    } catch (err) {
      toast.error('Failed to fetch restaurants');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedRestaurant) return toast.error('Please select a restaurant first');
    if (!file) return toast.error('Please select an Excel or CSV file');

    setIsUploading(true);
    try {
      const res = await adminAPI.uploadMenuBulk(selectedRestaurant, file);
      if (res?.data?.success) {
        toast.success(res.data.message);
        setMenuData(res.data.menu);
        setTotalQueued(res.data.queuedJobsCount);
        setCompletedImages(0);
        setProgress(0);
      } else {
        toast.error(res?.data?.message || 'Failed to upload menu');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegenerate = async (sectionIndex, itemIndex, itemId) => {
    try {
      const res = await adminAPI.regenerateMenuItemImage(selectedRestaurant, sectionIndex, itemIndex, itemId);
      if (res?.data?.success) {
        toast.success('Queued for regeneration');
        // Temporarily clear image to show loading state
        setMenuData(prevMenu => {
          const newMenu = [...prevMenu];
          newMenu[sectionIndex].items[itemIndex].image = ''; 
          return newMenu;
        });
      }
    } catch (err) {
      toast.error('Failed to regenerate image');
    }
  };

  useEffect(() => {
    if (totalQueued > 0) {
      setProgress(Math.round((completedImages / totalQueued) * 100));
    }
  }, [completedImages, totalQueued]);

  const handleDownloadTemplate = () => {
    const headers = "Name,Description,Price,Category Name,Food Type (Veg/Non-Veg),Preparation Time,Is Available (TRUE/FALSE),Image URL,Variants (Name:Price, ...)";
    const row1 = 'Chicken Dum Biryani,Authentic slow-cooked chicken,350,Biryani,Non-Veg,30 mins,TRUE,,"Half:180, Full:350"';
    const row2 = "Paneer Tikka,Grilled cottage cheese cubes,280,Starters,Veg,20 mins,TRUE,,";
    const row3 = "Paneer Pizza,Cheesy paneer loaded pizza,349,Pizza,Veg,20 mins,TRUE,https://picsum.photos/301,";
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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Bulk Menu Upload</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Upload Excel/CSV and Auto-Generate Images using AI</p>
        </div>
        <button 
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-green-600" /> Download Template
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Restaurant Selection */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Select Restaurant</label>
            <select 
              value={selectedRestaurant} 
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="w-full h-12 rounded-xl bg-gray-50 border-gray-200 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 px-4"
            >
              <option value="">-- Choose Restaurant --</option>
              {restaurants.map(r => (
                <option key={r._id} value={r._id}>{r.restaurantName}</option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Upload File</label>
            <div className="relative">
              <input 
                type="file" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-full h-12 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 text-sm font-semibold text-gray-500 group hover:border-blue-500 hover:bg-blue-50/50 transition-colors">
                <UploadCloud className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
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
            {isUploading ? 'Processing & Uploading...' : 'Upload & Start AI Generation'}
          </button>
        </div>
      </div>

      {/* Progress & Results Section */}
      <AnimatePresence>
        {menuData.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6"
          >
            {/* Progress Bar */}
            {totalQueued > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-blue-600">AI Image Generation Progress</span>
                  <span className="text-gray-500">{completedImages} / {totalQueued} Generated ({progress}%)</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            )}

            {/* Menu Items Grid */}
            <div className="space-y-8 mt-8">
              {menuData.map((section, sIdx) => (
                <div key={section.name} className="space-y-4">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight border-b pb-2">{section.name}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.items.map((item, iIdx) => (
                      <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        
                        {/* Image or Loading Skeleton */}
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-200 shrink-0 relative flex flex-col items-center justify-center">
                          {item.image ? (
                            <>
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              <button 
                                onClick={() => handleRegenerate(sIdx, iIdx, item.id)}
                                className="absolute bottom-1 right-1 w-6 h-6 bg-black/60 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black transition-colors"
                                title="Regenerate Image"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                              <span className="text-[9px] font-bold uppercase tracking-widest text-center">AI<br/>Generating</span>
                            </div>
                          )}
                        </div>

                        {/* Details */}
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
