import { BACKEND_URL as GLOBAL_BACKEND_URL, API_URL as GLOBAL_API_URL } from "../config";

// Base API URL (e.g., https://moxie-backend-9bar.onrender.com/api or http://127.0.0.1:8000/api)
export const API_BASE_URL = (
  GLOBAL_API_URL ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

// Backend root origin (e.g., https://moxie-backend-9bar.onrender.com or http://127.0.0.1:8000)
export const API_ORIGIN = (
  GLOBAL_BACKEND_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  API_BASE_URL.replace(/\/api\/?$/, "") ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/**
 * Format image URL from Django DRF.
 * Handles relative media paths (/media/...), localhost URLs, and absolute URLs.
 */
export const getImageUrl = (image) => {
  if (!image) return null;

  let cleanImage = image;
  if (typeof cleanImage === "string") {
    // Rewrite any hardcoded localhost URLs returned by DRF serializer to current API_ORIGIN
    cleanImage = cleanImage
      .replace(/^http:\/\/127\.0\.0\.1:8000/, API_ORIGIN)
      .replace(/^http:\/\/localhost:8000/, API_ORIGIN);

    if (cleanImage.startsWith("http://") || cleanImage.startsWith("https://")) {
      return cleanImage;
    }
  }

  try {
    return new URL(cleanImage, API_ORIGIN).href;
  } catch {
    return cleanImage;
  }
};
