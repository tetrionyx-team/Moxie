/**
 * Global Configuration for Moxie Frontend
 * Dynamically resolves Backend URL and API base endpoint based on execution environment.
 * - When running on localhost (127.0.0.1 / localhost), points to local Django server (http://127.0.0.1:8000).
 * - When running on Netlify (moxie-dev.netlify.app), points to Render backend (https://moxie-backend-9bar.onrender.com).
 */

const isLocalhost = Boolean(
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
   window.location.hostname === "127.0.0.1" ||
   window.location.hostname === "[::1]")
);

export const BACKEND_URL = isLocalhost
  ? (process.env.REACT_APP_LOCAL_BACKEND_URL || "http://127.0.0.1:8000")
  : (process.env.REACT_APP_BACKEND_URL || "https://moxie-backend-9bar.onrender.com");

export const API_URL = `${BACKEND_URL}/api`;

export const WHATSAPP_NUMBER = process.env.REACT_APP_WHATSAPP_NUMBER || "";
