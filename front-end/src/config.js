/**
 * Global Configuration for Moxie Frontend
 * Dynamically resolves Backend URL and API base endpoint based on execution environment.
 * Supports both Vite (VITE_) and React Scripts (REACT_APP_) environment variables.
 */

const getEnv = (key, fallback = "") => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process.env) {
      if (process.env[key]) return process.env[key];
      const reactKey = key.startsWith("VITE_") ? key.replace("VITE_", "REACT_APP_") : key;
      if (process.env[reactKey]) return process.env[reactKey];
      const viteKey = key.startsWith("REACT_APP_") ? key.replace("REACT_APP_", "VITE_") : key;
      if (process.env[viteKey]) return process.env[viteKey];
    }
  } catch {}
  return fallback;
};

const isLocalhost = Boolean(
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]")
);

export const BACKEND_URL = (
  isLocalhost
    ? (getEnv("VITE_LOCAL_BACKEND_URL") || getEnv("REACT_APP_LOCAL_BACKEND_URL") || "http://127.0.0.1:8000")
    : (getEnv("VITE_BACKEND_URL") || getEnv("REACT_APP_BACKEND_URL") || getEnv("VITE_API_BASE_URL") || getEnv("REACT_APP_API_URL") || "http://127.0.0.1:8000")
).replace(/\/+$/, "");

export const API_URL = (
  isLocalhost
    ? `${BACKEND_URL}/api`
    : (getEnv("VITE_API_BASE_URL") || getEnv("REACT_APP_API_URL") || `${BACKEND_URL}/api`)
).replace(/\/+$/, "");

export const WHATSAPP_NUMBER = getEnv("REACT_APP_WHATSAPP_NUMBER", "917871327802");

export const ENABLE_GOOGLE_AUTH =
  (getEnv("REACT_APP_ENABLE_GOOGLE_AUTH", "true")).toLowerCase() !== "false" &&
  (getEnv("VITE_ENABLE_GOOGLE_AUTH", "true")).toLowerCase() !== "false";

