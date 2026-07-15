export const getImageUrl = (url) => {
  if (!url) return "";
  if (typeof url !== "string") {
    return url.url || url.secure_url || url.imageUrl || url.image || url.src || "";
  }
  
  // If it's already an absolute URL (http, https, data URI, blob), return as is
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  
  let baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  
  // Remove /api/v1 from baseUrl if it exists to prevent duplication
  if (baseUrl.endsWith("/api/v1")) {
    baseUrl = baseUrl.substring(0, baseUrl.length - 7);
  }
  
  // If it already includes /api/v1/uploads or /uploads
  if (url.startsWith("/api/v1/uploads") || url.startsWith("api/v1/uploads") || url.startsWith("/uploads") || url.startsWith("uploads")) {
    let path = url.startsWith("/") ? url : `/${url}`;
    if (path.startsWith("/uploads")) {
      path = `/api/v1${path}`;
    }
    return `${baseUrl}${path}`;
  }
  
  // It's just a filename or relative path (e.g. img_da2686d0.webp or indian_foods/...)
  return `${baseUrl}/api/v1/uploads/${url}`;
};
