/**
 * Global Configuration for Moxie Frontend
 * Dynamically resolves Backend URL and API base endpoint based on execution environment.
 * - When running on localhost, defaults to local Django server (http://127.0.0.1:8000).
 * - When deployed, uses REACT_APP_BACKEND_URL or REACT_APP_API_URL.
 */

const isLocalhost = Boolean(
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]")
);

export const BACKEND_URL = (
  isLocalhost
    ? (process.env.REACT_APP_LOCAL_BACKEND_URL || "http://127.0.0.1:8000")
    : (process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_LOCAL_BACKEND_URL || "http://127.0.0.1:8000")
).replace(/\/+$/, "");

export const API_URL = (
  isLocalhost
    ? `${BACKEND_URL}/api`
    : (process.env.REACT_APP_API_URL || `${BACKEND_URL}/api`)
).replace(/\/+$/, "");

export const WHATSAPP_NUMBER = process.env.REACT_APP_WHATSAPP_NUMBER || "917871327802";

