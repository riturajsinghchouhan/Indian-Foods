export const getImageUrl = (url) => {
  if (!url) return "";
  if (typeof url !== "string") {
    return url.url || url.secure_url || url.imageUrl || url.image || url.src || "";
  }
  
  // If it's already an absolute URL (http, https, data URI, blob), return as is
  if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  
  // If it already includes /api/v1/uploads or /uploads
  if (url.startsWith("/api/v1/uploads") || url.startsWith("api/v1/uploads") || url.startsWith("/uploads") || url.startsWith("uploads")) {
    return url.startsWith("/") ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  }
  
  // It's just a filename (e.g. img_da2686d0.webp)
  return `${baseUrl}/api/v1/uploads/${url}`;
};
