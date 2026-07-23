export const getImageUrl = (url) => {
  if (!url) return "";
  if (typeof url !== "string") {
    return url.url || url.secure_url || url.imageUrl || url.image || url.src || "";
  }
  
  // Translate legacy Cloudinary URLs to local server uploads paths
  let processedUrl = url;
  if (processedUrl.includes("res.cloudinary.com")) {
    const match = processedUrl.match(/\/image\/upload\/(?:v\d+\/)?(.+)$/i);
    if (match && match[1]) {
      processedUrl = `/uploads/${match[1]}`;
    }
  }

  // If it's already an absolute URL (http, https, data URI, blob), return as is
  if (processedUrl.startsWith("http") || processedUrl.startsWith("data:") || processedUrl.startsWith("blob:")) {
    return processedUrl;
  }
  
  let baseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  
  // Remove /api/v1 from baseUrl if it exists because we want to hit the fast Nginx /uploads/ location
  if (baseUrl.endsWith("/api/v1")) {
    baseUrl = baseUrl.substring(0, baseUrl.length - 7);
  }
  
  // Clean up path to ensure it hits /uploads/ directly
  let path = processedUrl.startsWith("/") ? processedUrl : `/${processedUrl}`;
  if (path.startsWith("/api/v1/uploads")) {
    path = path.substring(7); // remove /api/v1
  } else if (!path.startsWith("/uploads")) {
    path = `/uploads${path}`;
  }
  
  return `${baseUrl}${path}`;
};
