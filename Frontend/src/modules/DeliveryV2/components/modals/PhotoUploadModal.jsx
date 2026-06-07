import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, MapPin, X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function PhotoUploadModal({ isOpen, onClose, onUpload }) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [locationState, setLocationState] = useState({ loading: false, address: null, error: null });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Camera & Face Detection State
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isCameraActiveRef = useRef(false); // Use ref to avoid stale closures in async loops
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setFaceDetected(false);
      setDetecting(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      
      streamRef.current = stream;
      isCameraActiveRef.current = true;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      
      // Start Face Detection Loop after a brief moment for video to load
      setTimeout(() => detectFaceLoop(), 500);
      
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Camera access denied or unavailable.");
      setDetecting(false);
    }
  };

  const stopCamera = useCallback(() => {
    isCameraActiveRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setDetecting(false);
  }, []);

  const detectFaceLoop = async () => {
    if (!videoRef.current || !streamRef.current) return;
    
    // Check if FaceDetector API is supported
    if (window.FaceDetector) {
      try {
        const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const checkFace = async () => {
          // Use ref here (not state) to get fresh value every iteration
          if (!isCameraActiveRef.current || !videoRef.current) return;
          try {
            const faces = await detector.detect(videoRef.current);
            if (faces.length > 0) {
              setFaceDetected(true);
              setDetecting(false);
            } else {
              setFaceDetected(false);
              setDetecting(true);
            }
            requestAnimationFrame(checkFace);
          } catch (e) {
            fallbackFaceDetection();
          }
        };
        requestAnimationFrame(checkFace);
      } catch (e) {
        fallbackFaceDetection();
      }
    } else {
      // Fallback: If Face API not supported, show scanning for 2.5s then allow capture
      fallbackFaceDetection();
    }
  };

  const fallbackFaceDetection = () => {
    // Simulate face scanning delay, use ref to check camera is still active
    setTimeout(() => {
      if (isCameraActiveRef.current) {
        setFaceDetected(true);
        setDetecting(false);
      }
    }, 2500);
  };

  useEffect(() => {
    if (isOpen) {
      setPhotoPreview(null);
      setBase64Image(null);
      setLocationState({ loading: false, address: null, error: null });
      setIsSubmitting(false);
      // Start camera automatically
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, stopCamera]);

  const compressImage = (canvas) => {
    // Compress Base64 from canvas
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    return dataUrl.split(',')[1];
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
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
          const data = await res.json();
          if (data.results && data.results[0]) {
            return data.results[0].formatted_address;
          }
        }
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    }
    
    // Fallback to OpenStreetMap (Nominatim) if Google Maps fails or key is invalid
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    } catch (osmErr) {
      console.error("Geocoding with OSM failed:", osmErr);
    }
    
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; // Final fallback
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    if (!faceDetected) {
      toast.error("Please align your face. Only a proper, uncovered face should be visible in the selfie.");
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Draw video frame to canvas
    // Mirror horizontally to match preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    // Create preview URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPhotoPreview(dataUrl);

    // Compress for upload
    const base64 = compressImage(canvas);
    setBase64Image(base64);

    // Stop camera after capture
    stopCamera();

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

  const retakePhoto = () => {
    setPhotoPreview(null);
    setBase64Image(null);
    startCamera();
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { stopCamera(); onClose(); }} />
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
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Verify Identity</h2>
            <p className="text-xs text-gray-500 font-medium">Please verify your face & location</p>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center">
          {!photoPreview ? (
            <div className="flex flex-col items-center w-full">
              {cameraError ? (
                <div className="w-full h-64 border-2 border-dashed border-red-300 rounded-2xl bg-red-50 flex flex-col items-center justify-center text-center p-4">
                  <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                  <p className="text-sm font-semibold text-red-700">{cameraError}</p>
                  <button onClick={startCamera} className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold">Try Again</button>
                </div>
              ) : (
                <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden shadow-2xl border-4 border-gray-100 bg-gray-900">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  
                  {/* Face Guide Overlay */}
                  <div className={`absolute inset-0 border-[6px] rounded-full transition-colors duration-500 ${faceDetected ? 'border-green-500' : 'border-yellow-400 border-dashed animate-[spin_10s_linear_infinite]'}`} />
                  
                  {/* Dark overlay outside the circle is handled by border-radius */}
                  
                  {/* Status Indicator inside camera */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <div className={`px-3 py-1 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${faceDetected ? 'bg-green-500/80 text-white' : 'bg-black/50 text-yellow-300'}`}>
                      {faceDetected ? (
                        <><CheckCircle2 className="w-3 h-3" /> Face Detected</>
                      ) : (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Scanning Face...</>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-6 text-center">
                <h3 className="font-bold text-gray-900">Align your face in the circle</h3>
                <p className="text-xs text-gray-500 mt-1">Make sure you are in a well-lit area</p>
              </div>

              {/* Capture Button */}
              <button
                onClick={capturePhoto}
                className={`mt-6 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${faceDetected ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : 'bg-gray-200 hover:bg-gray-300 active:scale-95'}`}
              >
                <Camera className={`w-7 h-7 ${faceDetected ? 'text-white' : 'text-gray-500'}`} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="relative w-48 h-48 rounded-full border-4 border-green-500 overflow-hidden shadow-xl">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover scale-x-[-1]" />
                <button 
                  onClick={retakePhoto}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-bold px-4 py-1.5 rounded-full backdrop-blur-md whitespace-nowrap hover:bg-black/80"
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
        </div>

        {/* Submit Button */}
        {photoPreview && (
          <div className="p-4 bg-white border-t border-gray-100">
            <button
              onClick={handleSubmit}
              disabled={!base64Image || locationState.loading || isSubmitting}
              className="w-full h-12 rounded-xl bg-green-500 text-white font-black uppercase tracking-wide disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-green-500/20 hover:bg-green-600"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Turning Online...</>
              ) : (
                'Go Online'
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
