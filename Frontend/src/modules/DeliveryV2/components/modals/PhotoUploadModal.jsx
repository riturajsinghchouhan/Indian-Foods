import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, MapPin, X, AlertTriangle, Loader2 } from 'lucide-react';

export function PhotoUploadModal({ isOpen, onClose, onUpload }) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [locationState, setLocationState] = useState({ loading: false, address: null, error: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPhotoPreview(null);
      setBase64Image(null);
      setLocationState({ loading: false, address: null, error: null });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 800; // Resize to max 800px

          if (width > height && width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          } else if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Get compressed Base64
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl.split(',')[1]); // return only base64 data
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const getAddressFromCoords = async (lat, lng) => {
    try {
      if (window.google && window.google.maps && window.google.maps.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results && response.results[0]) {
          return response.results[0].formatted_address;
        }
      } else {
        // Fallback HTTP request to Google Geocoding API if library isn't loaded
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
        const data = await res.json();
        if (data.results && data.results[0]) {
          return data.results[0].formatted_address;
        }
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; // fallback
  };

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    // Compress
    const base64 = await compressImage(file);
    setBase64Image(base64);

    // Fetch location
    setLocationState({ loading: true, address: null, error: null });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const address = await getAddressFromCoords(latitude, longitude);
        setLocationState({ loading: false, address, error: null });
      },
      (err) => {
        setLocationState({ loading: false, address: null, error: 'Location permission denied' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!base64Image) return;
    setIsSubmitting(true);
    await onUpload(base64Image, locationState.address);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full max-w-md bg-white sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Start Your Shift</h2>
            <p className="text-xs text-gray-500 font-medium">Please verify your identity & location</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {!photoPreview ? (
            <div className="flex flex-col items-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
                <span className="text-sm font-bold text-gray-700">Tap to take a live photo</span>
                <span className="text-xs text-gray-400 mt-1">Make sure your face is clearly visible</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-48 h-48 rounded-full border-4 border-green-500 overflow-hidden shadow-xl">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md whitespace-nowrap"
                >
                  Retake Photo
                </button>
              </div>

              {/* Location Status Box */}
              <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-100 mt-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${locationState.error ? 'bg-red-100' : 'bg-blue-100'}`}>
                    {locationState.error ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <MapPin className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Current Location</p>
                    {locationState.loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">Fetching location...</span>
                      </div>
                    ) : locationState.error ? (
                      <p className="text-sm font-semibold text-red-600">{locationState.error}</p>
                    ) : locationState.address ? (
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2">{locationState.address}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleCapture}
            className="hidden"
          />
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={!base64Image || locationState.loading || isSubmitting}
            className="w-full h-12 rounded-xl bg-green-500 text-white font-black uppercase tracking-wide disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Turning Online...</>
            ) : (
              'Go Online'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
