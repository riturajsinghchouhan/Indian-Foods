import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Star, Clock, IndianRupee, Heart } from "lucide-react";
import OptimizedImage from "@food/components/OptimizedImage";

const WEBVIEW_SESSION_CACHE_BUSTER = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const RestaurantImageCarousel = React.memo(({ restaurant, priority = false, backendOrigin = "" }) => {
  const webviewSessionKeyRef = useRef(WEBVIEW_SESSION_CACHE_BUSTER);
  const imageElementRef = useRef(null);

  const withCacheBuster = useCallback((url) => {
    if (typeof url !== "string" || !url) return "";
    if (/^data:/i.test(url) || /^blob:/i.test(url)) return url;

    const isRelative = !/^(https?:|\/\/|data:|blob:)/i.test(url.trim());
    const resolvedUrl = (backendOrigin && isRelative)
      ? `${backendOrigin.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`
      : url;

    const hasSignedParams =
      /[?&](X-Amz-|Signature=|Expires=|AWSAccessKeyId=|GoogleAccessId=|token=|sig=|se=|sp=|sv=)/i.test(resolvedUrl);
    if (hasSignedParams) return resolvedUrl;

    try {
      const parsed = new URL(resolvedUrl, window.location.origin);
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
      const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
      const isSameHost = currentHost && parsed.hostname === currentHost;

      if (isLocalHost || isSameHost) {
        parsed.searchParams.set("_wv", webviewSessionKeyRef.current);
      }
      return parsed.toString();
    } catch {
      return resolvedUrl;
    }
  }, [backendOrigin]);

  const images = React.useMemo(() => {
    const sourceImages = Array.isArray(restaurant.images) && restaurant.images.length > 0
      ? restaurant.images
      : [restaurant.image];

    const validImages = sourceImages
      .filter((img) => typeof img === "string")
      .map((img) => img.trim())
      .filter(Boolean);

    const seen = new Set();
    const uniqueImages = [];
    
    validImages.forEach((img) => {
      let sig = img;
      try {
        let pathParts = new URL(img).pathname.split('/');
        sig = pathParts[pathParts.length - 1]; // Use just the filename
      } catch (e) {
        sig = img;
      }
      
      if (!seen.has(sig)) {
        seen.add(sig);
        uniqueImages.push(img);
      }
    });

    return uniqueImages.map((img) => withCacheBuster(img));
  }, [restaurant.images, restaurant.image, withCacheBuster]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const bannerItems = React.useMemo(() => {
    const items = [];
    
    if (restaurant.menu?.sections && Array.isArray(restaurant.menu.sections)) {
      restaurant.menu.sections.forEach(sec => {
        if (Array.isArray(sec.items)) items.push(...sec.items);
      });
    }

    if (items.length === 0) {
      if (Array.isArray(restaurant.popularItems) && restaurant.popularItems.length > 0) {
        items.push(...restaurant.popularItems);
      } else if (Array.isArray(restaurant.menuItems) && restaurant.menuItems.length > 0) {
        items.push(...restaurant.menuItems);
      }
    }
    
    if (items.length === 0 && restaurant.featuredDish) {
      items.push({
        name: restaurant.featuredDish,
        price: restaurant.featuredPrice || 0,
        originalPrice: restaurant.featuredPrice || 0
      });
    }
    
    const discountedItems = items.map((item) => {
      let priceNum = Number(item.price || item.originalPrice || 0);
      
      if (typeof item.price === 'string') {
        const parsed = parseFloat(item.price.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsed)) priceNum = parsed;
      }
      
      let discountedPrice = null;
      let dText = 'SPECIAL OFFER';
      
      const specificDiscount = Array.isArray(restaurant.itemDiscounts) 
        ? restaurant.itemDiscounts.find(d => String(d.itemId) === String(item.id || item._id || item.menuItemId)) 
        : null;
        
      if (specificDiscount) {
          const discountVal = Number(specificDiscount.discountValue) || 0;
          const isFlat = String(specificDiscount.discountType || '').toUpperCase() === 'FLAT';
          if (!isFlat) {
              discountedPrice = priceNum * (1 - discountVal / 100);
              dText = `${discountVal}% OFF`;
          } else {
              discountedPrice = Math.max(0, priceNum - discountVal);
              dText = `FLAT ₹${discountVal} OFF`;
          }
      } else if (restaurant.discount > 0) {
        discountedPrice = priceNum * (1 - restaurant.discount / 100);
        dText = `${restaurant.discount}% OFF`;
      } else {
        const matchingRule = (restaurant.discountRules || []).find(rule => {
          const val = Number(rule.conditionValue);
          if (rule.conditionType === 'PRICE_ABOVE' && priceNum > val) return true;
          if (rule.conditionType === 'PRICE_BELOW' && priceNum < val) return true;
          return false;
        });
        if (matchingRule) {
           const discountVal = matchingRule.discountValue || 0;
           discountedPrice = priceNum * (1 - discountVal / 100);
           dText = `${discountVal}% OFF`;
        }
      }
      
      return {
        name: item.name,
        price: priceNum,
        discountedPrice: discountedPrice,
        dText: dText
      };
    }).filter(item => item.discountedPrice !== null && item.discountedPrice < item.price);
    
    return discountedItems.slice(0, 5);
  }, [restaurant]);

  useEffect(() => {
    if (bannerItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentItemIndex((prev) => (prev + 1) % bannerItems.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [bannerItems.length]);

  // Auto-slide for restaurant images
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [images.length]);

  const [loadedBySrc, setLoadedBySrc] = useState({});
  const [, setAttemptedSrcs] = useState({});
  const [showShimmer, setShowShimmer] = useState(true);
  const [lastGoodSrc, setLastGoodSrc] = useState("");


  const safeIndex = images.length > 0 ? (currentIndex % images.length + images.length) % images.length : 0;
  const renderSrc = images[safeIndex] || lastGoodSrc;

  useEffect(() => {
    setCurrentIndex(0);
    setLoadedBySrc({});
    setAttemptedSrcs({});
    setShowShimmer(images.length > 0);
  }, [restaurant?.id, restaurant?.slug, restaurant?.updatedAt, images]);

  useEffect(() => {
    setLastGoodSrc("");
  }, [restaurant?.id, restaurant?.slug]);

  useEffect(() => {
    if (!renderSrc) return;
    const imgEl = imageElementRef.current;
    if (!imgEl) return;

    setShowShimmer(true);
    const shimmerTimeout = setTimeout(() => {
      setShowShimmer(false);
    }, 2500);

    if (imgEl.complete) {
      if (imgEl.naturalWidth > 0) {
        setLoadedBySrc((prev) => (prev[renderSrc] ? prev : { ...prev, [renderSrc]: true }));
        setLastGoodSrc(renderSrc);
        setShowShimmer(false);
      } else {
        setAttemptedSrcs((prev) => ({ ...prev, [renderSrc]: true }));
      }
    }
    return () => clearTimeout(shimmerTimeout);
  }, [renderSrc]);



  return (
    <div 
      className="relative w-full h-[180px] sm:h-[190px] overflow-hidden bg-gray-100 dark:bg-gray-800"
    >
      <OptimizedImage
        ref={imageElementRef}
        src={renderSrc}
        alt={restaurant.name}
        placeholderType="shop"
        priority={priority}
        className={`w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-700 ${
          loadedBySrc[renderSrc] ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => {
          setLoadedBySrc((prev) => ({ ...prev, [renderSrc]: true }));
          setLastGoodSrc(renderSrc);
          setShowShimmer(false);
        }}
      />
      
      {showShimmer && !loadedBySrc[renderSrc] && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer" />
      )}


      
      {/* Discount Badge if any */}
      {restaurant.discount > 0 && (
        <div className="absolute top-3 left-0 px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-500 text-white text-[10px] sm:text-xs font-bold rounded-r-lg shadow-md uppercase tracking-wide flex items-center gap-1.5 z-10">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.864 2.227l8.909 8.91a2.182 2.182 0 010 3.085l-7.364 7.364a2.182 2.182 0 01-3.085 0l-8.91-8.91A2.182 2.182 0 012 11.137V4.41A2.182 2.182 0 014.182 2.23h6.727a2.182 2.182 0 011.955-.003z"/></svg>
          {restaurant.discount}% OFF ON ALL MEALS
        </div>
      )}

      {/* Sliding Green Banner for Items */}
      {bannerItems.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-[#1b4332] via-[#2d6a4f]/95 to-transparent pl-3 pr-6 py-2.5 z-[15]">
          <div className="w-full relative overflow-hidden h-[42px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentItemIndex}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col justify-center w-full"
              >
                <div className="flex items-center w-full">
                  <span className="text-[10px] font-bold tracking-[0.08em] text-white/90 uppercase line-clamp-1 drop-shadow-sm">
                    {bannerItems[currentItemIndex].dText}
                  </span>
                </div>
                <div className="h-[1px] w-[85%] bg-white/20 my-[4px]" />
                <div className="flex items-center justify-between w-[95%]">
                  <span className="font-extrabold text-white text-sm tracking-wide line-clamp-1 truncate mr-3 drop-shadow-md">
                    {bannerItems[currentItemIndex].name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {bannerItems[currentItemIndex].discountedPrice && bannerItems[currentItemIndex].discountedPrice < bannerItems[currentItemIndex].price ? (
                      <>
                        <span className="text-[11px] text-white/70 line-through font-medium drop-shadow-sm">₹{Math.round(bannerItems[currentItemIndex].price)}</span>
                        <span className="font-black text-white text-sm drop-shadow-md">₹{Math.round(bannerItems[currentItemIndex].discountedPrice)}</span>
                      </>
                    ) : (
                      <span className="font-black text-white text-sm drop-shadow-md">₹{Math.round(bannerItems[currentItemIndex].price)}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
});

const RestaurantCard = ({ 
  restaurant, 
  isFavorite, 
  onFavoriteClick, 
  onClick, 
  backendOrigin 
}) => {
  return (
    <motion.div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 group relative cursor-pointer transform hover:-translate-y-1 active:scale-95"
    >
      <div className="relative">
        <RestaurantImageCarousel restaurant={restaurant} backendOrigin={backendOrigin} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteClick(restaurant.id);
          }}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-sm hover:bg-red-50 hover:shadow-md hover:scale-110 transition-all duration-300 z-10"
        >
          <Heart
            className={`w-4 h-4 transition-colors duration-300 ${
              isFavorite ? "fill-red-500 text-red-500 border-none" : "text-gray-400 stroke-[2.5]"
            }`}
          />
        </button>
      </div>

      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <h3 className="text-[15px] sm:text-[17px] font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors duration-200 flex-1 tracking-tight">
            {restaurant.name}
          </h3>
          <div className="flex items-center gap-1 bg-[#8CC63F] text-white px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold shadow-sm flex-shrink-0">
            <span>{restaurant.rating || "4.2"}</span>
            <Star className="w-2.5 h-2.5 fill-current" />
          </div>
        </div>

        <p className="text-[11px] sm:text-[13px] text-gray-500 mb-2.5 line-clamp-1 font-medium">
          {restaurant.cuisine || "North Indian, Chinese"}
        </p>

        <div className="flex items-center justify-between pt-2.5 border-t border-gray-100/80">
          <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] sm:text-xs font-semibold">{restaurant.deliveryTime || "25-30 min"}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
            <IndianRupee className="w-3 h-3 text-primary" />
            <span className="text-[10px] sm:text-xs font-semibold">{restaurant.avgPrice || "₹200 for one"}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(RestaurantCard);
