import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeroBannerSkeleton } from "@food/components/ui/loading-skeletons";

const AUTO_SLIDE_MS = 3500;
const FADE_MS = 1000;

export default function HeroBanner({
  images = [],
  bannersData = [],
  loading = false,
  shellRef,
}) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoSlideIntervalRef = useRef(null);
  const isSwiping = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);

  useEffect(() => {
    setCurrentIndex((previous) => {
      if (images.length === 0) return 0;
      return Math.min(previous, images.length - 1);
    });
  }, [images.length]);

  useEffect(() => {
    if (images.length === 0) return;
    const indices = [currentIndex, (currentIndex + 1) % images.length];
    indices.forEach((index) => {
      const src = images[index];
      if (!src) return;
      const img = new window.Image();
      img.src = src;
    });
  }, [images, currentIndex]);

  const startAutoSlide = useCallback(() => {
    if (autoSlideIntervalRef.current) {
      clearInterval(autoSlideIntervalRef.current);
    }
    if (images.length <= 1) return;

    autoSlideIntervalRef.current = setInterval(() => {
      if (document.hidden || isSwiping.current) return;
      setCurrentIndex((previous) => (previous + 1) % images.length);
    }, AUTO_SLIDE_MS);
  }, [images.length]);

  useEffect(() => {
    startAutoSlide();
    return () => {
      if (autoSlideIntervalRef.current) {
        clearInterval(autoSlideIntervalRef.current);
      }
    };
  }, [startAutoSlide]);

  const resetAutoSlide = useCallback(() => {
    startAutoSlide();
  }, [startAutoSlide]);

  const goToPrevious = useCallback(() => {
    if (images.length === 0) return;
    setCurrentIndex((previous) => (previous - 1 + images.length) % images.length);
    resetAutoSlide();
  }, [images.length, resetAutoSlide]);

  const goToNext = useCallback(() => {
    if (images.length === 0) return;
    setCurrentIndex((previous) => (previous + 1) % images.length);
    resetAutoSlide();
  }, [images.length, resetAutoSlide]);

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
    isSwiping.current = true;
  };

  const handleTouchMove = (event) => {
    touchEndX.current = event.touches[0].clientX;
    touchEndY.current = event.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current || images.length === 0) return;

    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = Math.abs(touchEndY.current - touchStartY.current);
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) goToPrevious();
      else goToNext();
    }

    setTimeout(() => {
      isSwiping.current = false;
    }, 300);

    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
  };

  const handleMouseDown = (event) => {
    touchStartX.current = event.clientX;
    touchStartY.current = event.clientY;
    isSwiping.current = true;
  };

  const handleMouseMove = (event) => {
    if (!isSwiping.current) return;
    touchEndX.current = event.clientX;
    touchEndY.current = event.clientY;
  };

  const handleMouseUp = () => {
    if (!isSwiping.current || images.length === 0) return;

    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = Math.abs(touchEndY.current - touchStartY.current);
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) goToPrevious();
      else goToNext();
    }

    isSwiping.current = false;
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchEndX.current = 0;
    touchEndY.current = 0;
  };

  if (loading) {
    return (
      <div className="px-4 py-2">
        <HeroBannerSkeleton className="w-full aspect-[21/9] rounded-2xl" />
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div
        ref={shellRef}
        data-home-hero-shell="true"
        className="relative w-full overflow-hidden rounded-2xl shadow-sm group cursor-pointer bg-white"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="relative z-0 w-full min-h-[220px] sm:min-h-[280px] lg:min-h-[320px] flex items-center justify-center bg-gray-50 dark:bg-[#111]">
          <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] w-[150%] h-full animate-explore-shine"
              style={{ animationDuration: "2.5s" }}
            />
          </div>
          {images.map((image, index) => (
            <div
              key={`${index}-${image}`}
              className="absolute inset-0 flex items-center justify-center ease-in-out"
              style={{
                opacity: currentIndex === index ? 1 : 0,
                zIndex: currentIndex === index ? 2 : 1,
                transition: `opacity ${FADE_MS}ms ease-in-out`,
                pointerEvents: "none",
              }}
            >
              <img
                src={image}
                alt={`Hero Banner ${index + 1}`}
                className="w-full h-auto max-h-[280px] sm:max-h-[350px] lg:max-h-[400px] object-contain"
                loading={index === currentIndex ? "eager" : "lazy"}
                fetchPriority={index === currentIndex ? "high" : "low"}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-1.5 pointer-events-none">
            {images.map((_, index) => (
              <span
                key={`dot-${index}`}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === currentIndex
                    ? "w-4 bg-white/90"
                    : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          className="absolute inset-0 z-20 h-full w-full border-0 p-0 bg-transparent text-left"
          onClick={() => {
            const bannerData = bannersData[currentIndex];
            const linkedRestaurants = bannerData?.linkedRestaurants || [];
            if (linkedRestaurants.length > 0) {
              const firstRestaurant = linkedRestaurants[0];
              const restaurantSlug =
                firstRestaurant.slug ||
                firstRestaurant.restaurantId ||
                firstRestaurant._id;
              navigate(`/restaurants/${restaurantSlug}`);
            }
          }}
          aria-label={`Open hero banner ${currentIndex + 1}`}
        />
      </div>
    </div>
  );
}
