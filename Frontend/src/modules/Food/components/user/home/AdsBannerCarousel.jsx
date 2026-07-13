import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Megaphone } from "lucide-react";

export default function AdsBannerCarousel({ banners = [], data = [] }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoSlideIntervalRef = useRef(null);

  const startAutoSlide = () => {
    if (autoSlideIntervalRef.current) clearInterval(autoSlideIntervalRef.current);
    if (banners.length <= 1) return;
    autoSlideIntervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
  };

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (autoSlideIntervalRef.current) clearInterval(autoSlideIntervalRef.current);
    };
  }, [banners.length]);

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];
  const currentData = data[currentIndex];

  const handleBannerClick = () => {
    const linkedRestaurants = currentData?.linkedRestaurants || [];
    if (linkedRestaurants.length > 0) {
      const firstRestaurant = linkedRestaurants[0];
      const restaurantSlug = firstRestaurant.slug || firstRestaurant.restaurantId || firstRestaurant._id;
      navigate(`/food/user/restaurants/${restaurantSlug}`);
    }
  };

  return (
    <div className="px-4 py-3 mb-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary animate-pulse" />
          Sponsored Ads
        </h2>
        {banners.length > 1 && (
          <div className="flex gap-1.5">
            {banners.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-gray-300 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div 
        className="relative w-full overflow-hidden h-[180px] sm:h-[220px] rounded-2xl shadow-md cursor-pointer group"
        onClick={handleBannerClick}
      >
        {/* Shimmer effect overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-2xl">
          <motion.div
            animate={{
              x: ['-200%', '200%'],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              repeatDelay: 5,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] w-[150%] h-full"
          />
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={currentIndex}
            src={currentBanner}
            alt={`Ad Banner ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
        
        {/* Subtle overlay for better contrast if image is too bright */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent z-[5]" />
      </div>
    </div>
  );
}
