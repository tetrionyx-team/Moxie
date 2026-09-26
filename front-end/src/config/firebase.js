import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Create React App environment variables for Firebase Auth
const apiKey = process.env.REACT_APP_FIREBASE_API_KEY || "";
const authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "moxie-101.firebaseapp.com";
const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || "moxie-101";
const appId = process.env.REACT_APP_FIREBASE_APP_ID || "";

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  appId,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let app = null;
let authInstance = null;
let googleProviderInstance = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    googleProviderInstance = new GoogleAuthProvider();
    googleProviderInstance.setCustomParameters({
      prompt: "select_account",
    });
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export const auth = authInstance;
export const googleProvider = googleProviderInstance;
export default app;

