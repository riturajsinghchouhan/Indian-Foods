import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ConciergeBell } from 'lucide-react'
import { API_BASE_URL } from "@food/api/config"

const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "")

export const ShopPlaceholder = () => (
  <svg viewBox="0 0 100 100" className="w-[40%] h-[40%] max-w-[80px] max-h-[80px] text-[#cfcac2] dark:text-zinc-600" fill="currentColor">
    {/* Background clouds */}
    <path opacity="0.3" d="M15,40 Q15,35 20,35 Q25,32 30,35 Q35,35 35,40 Z" fill="currentColor" />
    <path opacity="0.3" d="M75,35 Q75,30 80,30 Q85,27 90,30 Q95,30 95,35 Z" fill="currentColor" />
    
    {/* Circular Sign with Fork and Spoon */}
    <circle cx="50" cy="30" r="16" fill="currentColor" opacity="0.1" />
    <circle cx="50" cy="30" r="16" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M46,22 L46,29 M43,22 L43,26 M49,22 L49,26 M43,26 Q46,30 49,26 M46,30 L46,38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M54,23 C51,23 51,28 54,29 C57,28 57,23 54,23 Z M54,29 L54,38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

    {/* Shop Building Outline */}
    <path d="M22,55 L78,55 L78,85 L22,85 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
    
    {/* Scalloped Awning */}
    <path d="M18,45 L82,45 L80,55 L20,55 Z" fill="currentColor" opacity="0.1" />
    <path d="M18,45 L82,45 L80,55 L20,55 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M20,55 Q23.75,60 27.5,55 Q31.25,60 35,55 Q38.75,60 42.5,55 Q46.25,60 50,55 Q53.75,60 57.5,55 Q61.25,60 65,55 Q68.75,60 72.5,55 Q76.25,60 80,55" fill="none" stroke="currentColor" strokeWidth="2" />
    
    {/* Door */}
    <rect x="30" y="65" width="16" height="20" fill="none" stroke="currentColor" strokeWidth="2" />
    {/* Window */}
    <rect x="52" y="65" width="20" height="12" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="52" y1="71" x2="72" y2="65" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    
    {/* Ground / Bushes */}
    <line x1="8" y1="85" x2="92" y2="85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path opacity="0.4" d="M12,85 Q12,75 18,75 Q24,72 26,85 Z" fill="currentColor" />
    <path opacity="0.4" d="M88,85 Q88,75 82,75 Q76,70 70,85 Z" fill="currentColor" />
  </svg>
)

export const FoodPlaceholder = () => (
  <svg viewBox="0 0 100 100" className="w-[40%] h-[40%] max-w-[80px] max-h-[80px] text-[#cfcac2] dark:text-zinc-600" fill="currentColor">
    {/* Circle Background */}
    <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.08" />
    {/* Cloche Dome */}
    <path d="M25,65 Q25,30 50,30 Q75,30 75,65 Z" fill="currentColor" opacity="0.5" />
    {/* Knob */}
    <circle cx="50" cy="25" r="5" fill="currentColor" opacity="0.7" />
    {/* Highlights */}
    <path d="M35,55 Q35,42 45,38" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    
    {/* Plate */}
    <rect x="20" y="66" width="60" height="7" rx="3.5" fill="currentColor" opacity="0.7" />
    <rect x="28" y="74" width="44" height="4" rx="2" fill="currentColor" opacity="0.5" />
  </svg>
)

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Lazy loading with Intersection Observer
 * - Responsive srcset for different screen sizes
 * - WebP/AVIF format support with fallback
 * - Blur placeholder (LQIP) for smooth loading
 * - Preloading for critical images
 * - Proper decoding and fetchpriority
 * - Error handling with fallback
 */
const OptimizedImage = React.memo(({
  src,
  alt,
  className = '',
  priority = false, // For above-the-fold images
  sizes = '100vw',
  objectFit = 'cover',
  placeholder = 'blur',
  placeholderType = 'food',
  blurDataURL,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isInView, setIsInView] = useState(priority) // Start visible if priority
  const imgRef = useRef(null)
  const observerRef = useRef(null)

  // Check if image URL supports optimization (external URLs)
  const supportsOptimization = (imageSrc) => {
    if (!imageSrc || typeof imageSrc !== 'string' || imageSrc === '') return false
    if (imageSrc.startsWith('data:') || imageSrc.startsWith('/')) return false
    // Don't proxy localhost
    if (/localhost|127\.0\.0\.1/i.test(imageSrc)) return false;
    // Native Cloudinary URLs can be optimized natively instead of via proxy
    if (/res\.cloudinary\.com/i.test(imageSrc)) return true;
    // Don't proxy signed URLs (Firebase, AWS, etc) as they break
    if (/[?&](X-Amz-|Signature=|Expires=|AWSAccessKeyId=|GoogleAccessId=|token=|sig=|se=|sp=|sv=|alt=)/i.test(imageSrc)) return false;
    // Check if it's an external URL (http/https)
    return /^https?:\/\//.test(imageSrc)
  }

  const getOptimizedUrl = (imageSrc, params) => {
    if (!imageSrc) return imageSrc;
    const { w, format, q = 80 } = params;
    
    // Native Cloudinary optimization (bypasses wsrv proxy for faster loading)
    if (/res\.cloudinary\.com/i.test(imageSrc) && /\/image\/upload\//i.test(imageSrc)) {
      const transforms = [];
      if (format === 'webp') transforms.push('f_webp');
      else if (format) transforms.push(`f_${format}`);
      else transforms.push('f_auto');
      transforms.push(`q_${q}`);
      if (w) transforms.push(`w_${w}`);
      
      const hasTransform = /\/image\/upload\/(?:f_|q_|w_|h_|c_|dpr_|g_)/i.test(imageSrc);
      if (!hasTransform) {
        return imageSrc.replace('/image/upload/', `/image/upload/${transforms.join(',')}/`);
      }
      return imageSrc; // Return as-is if already transformed
    }
    
    // Use wsrv.nl as a fallback for other generic URLs
    let proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(imageSrc)}&q=${q}&we=1`;
    if (w) proxyUrl += `&w=${w}`;
    if (format) proxyUrl += `&output=${format}`;
    return proxyUrl;
  }

  // Prepend backend origin for local VPS images
  const finalSrc = useMemo(() => {
    if (!src || typeof src !== 'string') return src;
    let computedSrc = src;
    if (computedSrc.startsWith("/cloudimages") || computedSrc.startsWith("/uploads")) {
      computedSrc = `${BACKEND_ORIGIN}${computedSrc}`
    } else if (computedSrc.startsWith("cloudimages") || computedSrc.startsWith("uploads")) {
      computedSrc = `${BACKEND_ORIGIN}/${computedSrc}`
    }
    return computedSrc;
  }, [src]);

  // Generate responsive srcset
  const srcSet = useMemo(() => {
    if (!supportsOptimization(finalSrc)) return undefined
    const sizesArr = [200, 400, 600, 800, 1200]
    return sizesArr
      .map(size => `${getOptimizedUrl(finalSrc, { w: size, q: 80 })} ${size}w`)
      .join(', ')
  }, [finalSrc])

  // Generate WebP srcset
  const webPSrcSet = useMemo(() => {
    if (!supportsOptimization(finalSrc)) return undefined
    
    if (/f_(jpg|png|gif)/i.test(finalSrc)) return undefined;

    const sizesArr = [200, 400, 600, 800, 1200]
    return sizesArr
      .map(size => `${getOptimizedUrl(finalSrc, { w: size, q: 80, format: 'webp' })} ${size}w`)
      .join(', ')
  }, [finalSrc])

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return

    if (!imgRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            if (observerRef.current && imgRef.current) {
              observerRef.current.unobserve(imgRef.current)
            }
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    )

    observerRef.current.observe(imgRef.current)

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current)
      }
    }
  }, [priority, isInView])

  const handleLoad = (e) => {
    setIsLoaded(true)
    if (onLoad) onLoad(e)
  }

  const handleError = (e) => {
    setHasError(true)
    if (onError) onError(e)
  }

  // Default blur placeholder (tiny gray square)
  const defaultBlurDataURL = blurDataURL || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2U1ZTdlYiIvPjwvc3ZnPg=='

  // Don't render if src is empty or null
  if (!src || src === '') {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
           <span className="text-xs text-gray-400 dark:text-gray-600">Image unavailable</span>
        </div>
      </div>
    )
  }

  const imageSrc = hasError ? 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle"%3EImage not found%3C/text%3E%3C/svg%3E' : finalSrc

  // Use optimized version for default src as well
  const optimizedSrc = supportsOptimization(finalSrc) && !hasError 
    ? getOptimizedUrl(finalSrc, { w: 800, q: 80, format: 'webp' }) 
    : imageSrc;

  return (
    <div className={`relative overflow-hidden ${className}`} ref={imgRef}>
      {/* Blur Placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: isLoaded ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          style={{
            backgroundImage: `url(${defaultBlurDataURL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Loading Skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-[#f7f5f2] dark:bg-zinc-800 flex flex-col items-center justify-center animate-pulse">
           {placeholderType === 'shop' ? <ShopPlaceholder /> : <FoodPlaceholder />}
        </div>
      )}

      {/* Actual Image */}
      {isInView && (
        <picture className="absolute inset-0 w-full h-full">
          {/* WebP source for modern browsers */}
          {webPSrcSet && (
            <source
              srcSet={webPSrcSet}
              sizes={sizes}
              type="image/webp"
            />
          )}

          {/* Fallback to original format */}
          <motion.img
            src={optimizedSrc}
            srcSet={srcSet}
            sizes={supportsOptimization(finalSrc) ? sizes : undefined}
            alt={alt}
            className={`w-full h-full ${objectFit === 'cover' ? 'object-cover' : objectFit === 'contain' ? 'object-contain' : ''} ${priority || isLoaded ? 'opacity-100' : 'opacity-0'} ${!priority && 'transition-opacity duration-300'}`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            onLoad={handleLoad}
            onError={handleError}
            {...props}
          />
        </picture>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-xs text-gray-400 dark:text-gray-600">Image unavailable</span>
        </div>
      )}
    </div>
  )
})

export default OptimizedImage
