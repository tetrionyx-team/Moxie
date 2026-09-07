import { BACKEND_URL as GLOBAL_BACKEND_URL, API_URL as GLOBAL_API_URL } from "../config";

// Base API URL (e.g., process.env.REACT_APP_API_URL or http://127.0.0.1:8000/api)
export const API_BASE_URL = (
  GLOBAL_API_URL ||
  "http://127.0.0.1:8000/api"
).replace(/\/+$/, "");

// Backend root origin (e.g., process.env.REACT_APP_BACKEND_URL or http://127.0.0.1:8000)
export const API_ORIGIN = (
  GLOBAL_BACKEND_URL ||
  API_BASE_URL.replace(/\/api\/?$/, "") ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

/**
 * Get CSRF Token from cookie
 */
export const getCsrfToken = () => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
};

/**
 * Fetch CSRF token from Django API
 */
export const fetchCsrfToken = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/csrf/`, {
      method: "GET",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      return data.csrfToken || getCsrfToken();
    }
  } catch (err) {
    // Non-fatal
  }
  return getCsrfToken();
};

/**
 * Authenticated API Fetch Wrapper with session credentials and CSRF
 */
export const apiFetch = async (endpoint, options = {}) => {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...options.headers };

  if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (method !== "GET" && method !== "HEAD") {
    let csrf = getCsrfToken();
    if (!csrf) {
      csrf = await fetchCsrfToken();
    }
    if (csrf) {
      headers["X-CSRFToken"] = csrf;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  return response;
};

/**
 * Format image URL from Django DRF.
 * Handles relative media paths (/media/...), localhost URLs, and absolute URLs.
 */
export const getImageUrl = (image) => {
  if (!image) return null;

  let cleanImage = image;
  if (typeof cleanImage === "string") {
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

