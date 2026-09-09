import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Safe environment variable reader supporting Vite (import.meta.env) and React Scripts (process.env)
const getEnv = (key, fallback = "") => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process.env) {
      if (process.env[key]) return process.env[key];
      const reactKey = key.replace("VITE_", "REACT_APP_");
      if (process.env[reactKey]) return process.env[reactKey];
    }
  } catch {}
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "AIzaSyD35t-BadYAVIyEE5tStSm6oGrXjqQ9fMQ"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "moxie-101.firebaseapp.com"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "moxie-101"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "moxie-101.firebasestorage.app"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "322169112784"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "1:322169112784:web:1522057f9897861a1376d5"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-MK3VEJ6Q88"),
};

// Validate configuration safely
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error("Firebase configuration is missing.");
}

// Initialize Firebase only once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export default app;
