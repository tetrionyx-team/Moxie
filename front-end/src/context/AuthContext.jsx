import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../config/firebase";
import { apiFetch } from "../api/apiConfig";
import LoginSuccessPopup from "../components/auth/LoginSuccessPopup";

export const AuthContext = createContext();

const CURRENT_USER_STORAGE_KEY = "moxie_current_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [profile, setProfile] = useState(null);
  const [loginSuccessUser, setLoginSuccessUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return !!localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // App startup & page refresh session validation with Django backend (Single Source of Truth)
  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/me/");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const authUser = {
            id: data.user.id || data.user.email,
            name:
              data.user.name ||
              `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() ||
              data.user.email.split("@")[0],
            email: data.user.email,
            mobile: data.user.mobile || (data.profile && data.profile.mobile) || "",
            avatar: data.user.avatar || (data.profile && data.profile.avatar) || "",
            is_staff: !!data.user.is_staff,
          };
          setUser(authUser);
          setProfile(data.profile || null);
          setIsLoggedIn(true);
          try {
            localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(authUser));
          } catch {}
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Backend auth verification failed:", e);
    }

    // Backend returned 401/403/404 or unauthenticated: clear all auth states & stale storage
    setUser(null);
    setProfile(null);
    setIsLoggedIn(false);
    try {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      localStorage.removeItem("moxie_token");
    } catch {}

    // Sign out Firebase session if active
    if (auth && isFirebaseConfigured) {
      fbSignOut(auth).catch(() => {});
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Sync Firebase Auth session listener safely without bypassing Django verification
  useEffect(() => {
    if (!auth || !isFirebaseConfigured) return;
    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        (fbUser) => {
          // If Firebase signed out, ensure guest state
          if (!fbUser && isLoggedIn) {
            // Only clear if not in an active session check
          }
        },
        (error) => {
          console.warn("Firebase Auth session listener:", error.message);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase Auth initialization check:", e.message);
    }
  }, [isLoggedIn]);

  // Customer Registration (Standard Email/Password via Django Backend)
  const register = async (registerData) => {
    const name = (registerData.name || "").trim();
    const email = (registerData.email || "").trim().toLowerCase();
    const mobile = (registerData.mobile || "").trim().replace(/\D/g, "");
    const password = registerData.password || "";
    const confirmPassword = registerData.confirmPassword || registerData.confirm_password || "";

    // 1. Client-side field validation
    if (!name) throw new Error("Name is required.");
    if (!email) throw new Error("Email address is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email address.");
    if (!mobile || mobile.length !== 10) throw new Error("Please enter a valid 10-digit mobile number.");
    if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");
    if (password !== confirmPassword) throw new Error("Passwords do not match.");

    // 2. Pure Backend Registration (Django PostgreSQL Source of Truth)
    const res = await apiFetch("/auth/register/", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        mobile,
        password,
        confirm_password: confirmPassword,
        confirmPassword,
      }),
    });

    const backendData = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = backendData.error || backendData.detail || "Registration failed. Please check your details.";
      throw new Error(errorMsg);
    }

    return {
      success: true,
      message: backendData.message || "Your account has been created successfully.",
      user: backendData.user,
    };
  };

  // Customer Login (Standard Email/Password via Django Backend)
  const login = async (emailInput, passwordInput) => {
    const email = (emailInput || "").trim().toLowerCase();
    const password = passwordInput || "";

    if (!email) throw new Error("Email address is required.");
    if (!password) throw new Error("Password is required.");

    const res = await apiFetch("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(data.error || "Account not found. Please create a new account.");
      }
      if (res.status === 403) {
        throw new Error(data.error || "This account is inactive. Please contact support.");
      }
      if (res.status === 401) {
        throw new Error(data.error || "Incorrect password. Please try again.");
      }
      throw new Error(data.error || data.detail || "Authentication failed. Please check your credentials.");
    }

    if (!data.user) {
      throw new Error("Authentication failed. No user details returned.");
    }

    const authUser = {
      id: data.user.id || data.user.email,
      name:
        data.user.name ||
        `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() ||
        data.user.email.split("@")[0],
      email: data.user.email,
      mobile: data.user.mobile || (data.profile && data.profile.mobile) || "",
      avatar: data.user.avatar || (data.profile && data.profile.avatar) || "",
      is_staff: !!data.user.is_staff,
    };

    setUser(authUser);
    if (data.profile) setProfile(data.profile);
    setIsLoggedIn(true);

    try {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(authUser));
    } catch {}

    setLoginSuccessUser(authUser);
    return { success: true, user: authUser };
  };

  // Firebase Google Sign-In & Django Backend Authentication
  // action: 'login' (default) | 'register'
  const signInWithGoogle = async (action = "login") => {
    if (!auth) {
      console.error("Firebase Auth instance is not initialized.");
      throw new Error("Google sign-in is temporarily unavailable. Please try again later.");
    }

    let fbUser = null;
    let token = "";

    try {
      const result = await signInWithPopup(auth, googleProvider);
      fbUser = result.user;
      if (!fbUser) throw new Error("No user information received from Google.");
      token = await fbUser.getIdToken();
    } catch (error) {
      console.error("Firebase Google Auth Popup Error:", error);
      if (error.code === "auth/popup-closed-by-user") {
        throw new Error("Google sign-in was cancelled.");
      }
      if (error.code === "auth/popup-blocked") {
        throw new Error("Google sign-in popup was blocked by your browser. Please allow popups.");
      }
      if (error.code === "auth/network-request-failed") {
        throw new Error("Unable to connect. Please check your internet connection.");
      }
      if (error.code === "auth/unauthorized-domain") {
        throw new Error("Google sign-in is not available for this domain.");
      }
      throw new Error(error.message || "Unable to sign in with Google. Please try again.");
    }

    const email = (fbUser.email || "").trim().toLowerCase();
    const name = (fbUser.displayName || email.split("@")[0] || "User").trim();
    const photoURL = fbUser.photoURL || "";
    const firebaseUid = fbUser.uid;

    // Send verified Google identity to Django backend for customer verification
    const res = await apiFetch("/auth/google/", {
      method: "POST",
      body: JSON.stringify({
        action,
        credential: token,
        token,
        access_token: token,
        email,
        name,
        firebaseUid,
        avatar: photoURL,
      }),
    });

    const data = await res.json().catch(() => ({}));

    // If customer does NOT exist in Django or is inactive:
    if (!res.ok) {
      // Sign out from Firebase immediately so identity doesn't linger
      if (auth && isFirebaseConfigured) {
        await fbSignOut(auth).catch(() => {});
      }
      setUser(null);
      setProfile(null);
      setIsLoggedIn(false);
      try {
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      } catch {}

      if (res.status === 403) {
        throw new Error(data.error || "This account is inactive. Please contact support.");
      }
      throw new Error(data.error || "Google authentication failed. Please try again.");
    }

    if (!data.user) {
      if (auth && isFirebaseConfigured) {
        await fbSignOut(auth).catch(() => {});
      }
      throw new Error(data.error || "Google authentication failed. Please try again.");
    }

    const authUser = {
      id: data.user.id || firebaseUid,
      name: data.user.name || name,
      email: data.user.email || email,
      mobile: data.user.mobile || (data.profile && data.profile.mobile) || "",
      avatar: data.user.avatar || photoURL,
      firebaseUid,
      authProvider: "google",
      is_staff: !!data.user.is_staff,
    };

    setUser(authUser);
    if (data.profile) setProfile(data.profile);
    setIsLoggedIn(true);

    try {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(authUser));
    } catch {}

    setLoginSuccessUser({ ...authUser, isNewAccount: !!data.isNewUser });

    return {
      success: true,
      isNewUser: !!data.isNewUser,
      user: authUser,
    };
  };

  // Complete Registration for New Google User with required 10-digit mobile
  const completeGoogleRegistration = async ({ googleData, mobile, name: customName }) => {
    const cleanMobile = (mobile || "").trim().replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length !== 10) {
      throw new Error("Please enter a valid 10-digit mobile number.");
    }

    const email = (googleData.email || "").trim().toLowerCase();
    const name = (customName || googleData.name || email.split("@")[0] || "User").trim();
    const photoURL = googleData.photoURL || "";
    const firebaseUid = googleData.firebaseUid || "";
    const token = googleData.token || googleData.credential || "";

    const res = await apiFetch("/auth/google/", {
      method: "POST",
      body: JSON.stringify({
        action: "register",
        allow_create: true,
        credential: token,
        token,
        email,
        name,
        mobile: cleanMobile,
        firebaseUid,
        avatar: photoURL,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Registration failed. Please check your details.");
    }

    const newUser = {
      id: data?.user?.id || firebaseUid,
      name: data?.user?.name || name,
      email: data?.user?.email || email,
      mobile: data?.user?.mobile || cleanMobile,
      avatar: photoURL,
      firebaseUid,
      authProvider: "google",
    };

    setUser(newUser);
    if (data.profile) setProfile(data.profile);
    setIsLoggedIn(true);

    try {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(newUser));
    } catch {}

    return { success: true, user: newUser };
  };

  // Verify registered email for Forgot Password (Step 1)
  const verifyEmail = async (emailInput) => {
    const email = (emailInput || "").trim().toLowerCase();
    if (!email) throw new Error("Email address is required.");

    const res = await apiFetch("/auth/forgot-password/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "No account found with this email address.");
    }

    return { success: true, message: data.message || "Email verified." };
  };

  // Reset Password for exact matching customer (Step 2)
  const resetPassword = async (emailInput, newPassword, confirmPassword) => {
    const email = (emailInput || "").trim().toLowerCase();
    if (!email) throw new Error("Email address is required.");
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const res = await apiFetch("/auth/reset-password/", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: newPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Failed to reset password.");
    }

    return { success: true, message: data.message || "Password Changed Successfully" };
  };

  // Customer Logout (Flushes backend session, signs out Firebase, clears local storage)
  const logout = async () => {
    if (auth && isFirebaseConfigured) {
      try {
        await fbSignOut(auth);
      } catch {}
    }
    try {
      await apiFetch("/auth/logout/", { method: "POST" });
    } catch {}
    try {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      localStorage.removeItem("moxie_token");
    } catch {}
    setUser(null);
    setProfile(null);
    setIsLoggedIn(false);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedFields };
      try {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setProfile((prev) => (prev ? { ...prev, ...updatedFields } : updatedFields));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoggedIn,
        isLoading,
        login,
        register,
        verifyEmail,
        resetPassword,
        signInWithGoogle,
        completeGoogleRegistration,
        logout,
        updateUser,
        refreshUser: checkAuthStatus,
        setIsLoggedIn,
        loginSuccessUser,
        setLoginSuccessUser,
      }}
    >
      {children}
      {loginSuccessUser && (
        <LoginSuccessPopup
          user={loginSuccessUser}
          onComplete={() => setLoginSuccessUser(null)}
        />
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
