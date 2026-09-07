import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { apiFetch } from "../api/apiConfig";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check current session on app startup
  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/me/");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setProfile(data.profile || null);
          setIsLoggedIn(true);
        } else {
          setUser(null);
          setProfile(null);
          setIsLoggedIn(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsLoggedIn(false);
      }
    } catch {
      setUser(null);
      setProfile(null);
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Email + Password Login
  const login = async (email, password) => {
    const res = await apiFetch("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email: (email || "").trim(), password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.error || data.detail || "Invalid email address or password.";
      throw new Error(errorMsg);
    }

    if (data.user) {
      setUser(data.user);
      setProfile(data.profile || null);
      setIsLoggedIn(true);
    }
    return data;
  };

  // Customer Registration
  const register = async (registerData) => {
    let payload = registerData;
    if (typeof registerData === "string") {
      // Backwards compatibility with register(name, email, password)
      payload = { name: registerData };
    }

    const res = await apiFetch("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.error || data.detail || (typeof data === "object" ? Object.values(data).flat().join(" ") : "Registration failed.");
      throw new Error(errorMsg);
    }

    if (data.user) {
      setUser(data.user);
      setProfile(data.profile || null);
      setIsLoggedIn(true);
    }
    return data;
  };

  // Google Sign-In
  const googleLogin = async (idToken) => {
    const res = await apiFetch("/auth/google/", {
      method: "POST",
      body: JSON.stringify({ credential: idToken }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.error || data.detail || "Google sign-in failed.";
      throw new Error(errorMsg);
    }

    if (data.user) {
      setUser(data.user);
      setProfile(data.profile || null);
      setIsLoggedIn(true);
    }
    return data;
  };

  // Manual Logout
  const logout = async () => {
    try {
      await apiFetch("/auth/logout/", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setProfile(null);
      setIsLoggedIn(false);
    }
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
        googleLogin,
        logout,
        refreshUser: checkAuthStatus,
        setIsLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
