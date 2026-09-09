import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { signInWithPopup, signOut as fbSignOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../config/firebase";
import { apiFetch } from "../api/apiConfig";
import LoginSuccessPopup from "../components/auth/LoginSuccessPopup";

export const AuthContext = createContext();

const USERS_STORAGE_KEY = "moxie_users";
const CURRENT_USER_STORAGE_KEY = "moxie_current_user";

// Seed initial users if storage is empty so demo accounts work seamlessly
const SEED_USERS = [
  {
    id: 1,
    name: "Harish Raja",
    email: "harish@example.com",
    mobile: "9876543210",
    password: "password123",
  },
  {
    id: 2,
    name: "Harish Raja",
    email: "harish@gmail.com",
    mobile: "9876543211",
    password: "password123",
  },
];

const getStoredUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read moxie_users from storage:", e);
  }
  // Initialize with seed users
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(SEED_USERS));
  } catch {}
  return SEED_USERS;
};

const saveStoredUsers = (users) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error("Failed to save moxie_users:", e);
  }
};

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

  // Check current session on app startup
  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/auth/me/");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          const authUser = {
            id: data.user.id || data.user.email,
            name: data.user.name || `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() || data.user.email.split("@")[0],
            email: data.user.email,
            mobile: data.user.mobile || (data.profile && data.profile.mobile) || "",
            avatar: data.user.avatar || (data.profile && data.profile.avatar) || "",
          };
          setUser(authUser);
          setProfile(data.profile || null);
          setIsLoggedIn(true);
          try {
            localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(authUser));
          } catch {}
          return;
        }
      }
    } catch {
      // Backend not reached or unauthenticated
    }

    // Fallback to local storage persistence
    try {
      const savedUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setIsLoggedIn(true);
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

  // Sync with Firebase Auth state on refresh without creating duplicates
  useEffect(() => {
    if (!auth || !isFirebaseConfigured) return;
    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        async (fbUser) => {
          if (fbUser && !user) {
            const email = (fbUser.email || "").trim().toLowerCase();
            const users = getStoredUsers();
            const found = users.find(
              (u) =>
                (u.email && u.email.trim().toLowerCase() === email) ||
                (u.firebaseUid && u.firebaseUid === fbUser.uid)
            );
            if (found) {
              const authUser = {
                id: found.id || fbUser.uid,
                name: found.name || fbUser.displayName || email.split("@")[0],
                email: found.email || email,
                mobile: found.mobile || "",
                avatar: found.avatar || found.image || fbUser.photoURL || "",
                firebaseUid: fbUser.uid,
                authProvider: "google",
              };
              setUser(authUser);
              setIsLoggedIn(true);
              try {
                localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(authUser));
              } catch {}
            }
          }
        },
        (error) => {
          // Log config/API key issue silently to console without breaking app initialization
          console.warn("Firebase Auth session listener:", error.message);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn("Firebase Auth initialization check:", e.message);
    }
  }, [user]);

  // Customer Registration (Standard Email/Password)
  const register = async (registerData) => {
    const name = (registerData.name || "").trim();
    const email = (registerData.email || "").trim().toLowerCase();
    const mobile = (registerData.mobile || "").trim().replace(/\D/g, "");
    const password = registerData.password || "";
    const confirmPassword = registerData.confirmPassword || "";

    // 1. Validate fields
    if (!name) throw new Error("Name is required.");
    if (!email) throw new Error("Email address is required.");
    if (!mobile || mobile.length !== 10) throw new Error("Please enter a valid 10-digit mobile number.");
    if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");
    if (password !== confirmPassword) throw new Error("Passwords do not match.");

    // 2. Prevent duplicate accounts in local storage
    const users = getStoredUsers();
    const existingEmail = users.find((u) => u.email && u.email.trim().toLowerCase() === email);
    if (existingEmail) {
      throw new Error("An account already exists with this email. Please sign in.");
    }

    const existingMobile = users.find((u) => {
      const uMobile = (u.mobile || "").trim().replace(/\D/g, "");
      return uMobile && uMobile === mobile;
    });
    if (existingMobile) {
      throw new Error("An account already exists with this mobile number. Please sign in.");
    }

    // 3. Register via backend API if available
    let backendData = null;
    try {
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

      backendData = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorMsg = backendData.error || backendData.detail || "Registration failed. Please check your details.";
        throw new Error(errorMsg);
      }
    } catch (err) {
      if (err.message && (err.message.includes("already exists") || err.message.includes("valid") || err.message.includes("match"))) {
        throw err;
      }
    }

    // 4. Save new user to local moxie_users list
    const newUser = {
      id: backendData?.user?.id || Date.now(),
      name,
      email,
      mobile,
      password,
    };
    const updatedUsers = [...users, newUser];
    saveStoredUsers(updatedUsers);

    // Initialize customer profile
    try {
      const profileData = {
        name,
        email,
        mobile,
        joinedDate: new Date().toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
      localStorage.setItem(`moxie_profile_${email}`, JSON.stringify(profileData));
    } catch {}

    // Important: Do NOT auto-login. The user must sign in after registration.
    return {
      success: true,
      message: "Your account has been created successfully.",
      user: newUser,
    };
  };

  // Email + Password Login
  const login = async (emailInput, passwordInput) => {
    const email = (emailInput || "").trim().toLowerCase();
    const password = passwordInput || "";

    if (!email) throw new Error("Email address is required.");
    if (!password) throw new Error("Password is required.");

    let apiUser = null;
    let apiError = null;

    try {
      const res = await apiFetch("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        apiUser = {
          id: data.user.id || data.user.email,
          name: data.user.name || `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() || data.user.email.split("@")[0],
          email: data.user.email,
          mobile: data.user.mobile || (data.profile && data.profile.mobile) || "",
          avatar: data.user.avatar || (data.profile && data.profile.avatar) || "",
        };
        if (data.profile) setProfile(data.profile);
      } else {
        apiError = data.error || data.detail || null;
      }
    } catch (e) {
      // Backend unavailable or network error
    }

    if (apiError) {
      throw new Error(apiError);
    }

    if (apiUser) {
      setUser(apiUser);
      setIsLoggedIn(true);
      try {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(apiUser));
      } catch {}
      setLoginSuccessUser(apiUser);
      return { success: true, user: apiUser };
    }

    // Local storage verification fallback
    const users = getStoredUsers();
    const foundUser = users.find((u) => u.email && u.email.trim().toLowerCase() === email);

    if (!foundUser) {
      throw new Error("No account found with this email.");
    }

    if (foundUser.password !== password) {
      throw new Error("Incorrect password. Please try again.");
    }

    const authenticatedUser = {
      id: foundUser.id || Date.now(),
      name: foundUser.name,
      email: foundUser.email,
      mobile: foundUser.mobile || "",
      avatar: foundUser.avatar || foundUser.image || "",
    };

    setUser(authenticatedUser);
    setIsLoggedIn(true);
    try {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(authenticatedUser));
    } catch {}
    setLoginSuccessUser(authenticatedUser);

    return { success: true, user: authenticatedUser };
  };

  // Shared Firebase Google Authentication Function
  const signInWithGoogle = async () => {
    if (!auth) {
      console.error("Firebase Auth instance is not initialized.");
      throw new Error("Google sign-in is temporarily unavailable. Please try again later.");
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      if (!fbUser) throw new Error("No user information received from Google.");

      const email = (fbUser.email || "").trim().toLowerCase();
      const name = (fbUser.displayName || email.split("@")[0] || "User").trim();
      const photoURL = fbUser.photoURL || "";
      const firebaseUid = fbUser.uid;
      const token = await fbUser.getIdToken();

      // Check backend login
      let backendUser = null;
      try {
        const res = await apiFetch("/auth/google/", {
          method: "POST",
          body: JSON.stringify({
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
        if (res.ok && data.user) {
          backendUser = {
            id: data.user.id || firebaseUid,
            name: data.user.name || name,
            email: data.user.email || email,
            mobile: data.user.mobile || (data.profile && data.profile.mobile) || "",
            avatar: data.user.avatar || photoURL,
            firebaseUid,
            authProvider: "google",
          };
          if (data.profile) setProfile(data.profile);
        }
      } catch {}

      // Check local storage existing customer by email or firebaseUid
      const users = getStoredUsers();
      const existingCustomer = users.find(
        (u) =>
          (u.email && u.email.trim().toLowerCase() === email) ||
          (u.firebaseUid && u.firebaseUid === firebaseUid)
      );

      // CASE A: Existing customer (or backend returned existing customer with mobile)
      if (existingCustomer || (backendUser && backendUser.mobile)) {
        const authUser = {
          id: (existingCustomer && existingCustomer.id) || (backendUser && backendUser.id) || firebaseUid,
          name: (existingCustomer && existingCustomer.name) || (backendUser && backendUser.name) || name,
          email: email,
          mobile: (existingCustomer && existingCustomer.mobile) || (backendUser && backendUser.mobile) || "",
          avatar: (existingCustomer && (existingCustomer.avatar || existingCustomer.image)) || photoURL,
          firebaseUid,
          authProvider: "google",
        };

        setUser(authUser);
        setIsLoggedIn(true);
        try {
          localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(authUser));
        } catch {}
        setLoginSuccessUser(authUser);

        return {
          success: true,
          isNewUser: false,
          user: authUser,
        };
      }

      // CASE B: New Google customer (Mobile is optional, create account immediately)
      const newCustomer = {
        id: (backendUser && backendUser.id) || firebaseUid || Date.now(),
        name: (backendUser && backendUser.name) || name,
        email: email,
        mobile: (backendUser && backendUser.mobile) || "",
        avatar: photoURL,
        image: photoURL,
        firebaseUid,
        authProvider: "google",
      };

      const updatedUsers = [...users, newCustomer];
      saveStoredUsers(updatedUsers);

      // Initialize customer profile
      try {
        const profileData = {
          name,
          email,
          mobile: (backendUser && backendUser.mobile) || "",
          avatar: photoURL,
          joinedDate: new Date().toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        };
        localStorage.setItem(`moxie_profile_${email}`, JSON.stringify(profileData));
      } catch {}

      setUser(newCustomer);
      setIsLoggedIn(true);
      try {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(newCustomer));
      } catch {}

      // Trigger "Welcome to Moxie" popup
      setLoginSuccessUser({ ...newCustomer, isNewAccount: true });

      return {
        success: true,
        isNewUser: true,
        user: newCustomer,
      };
    } catch (error) {
      console.error("Firebase Google Auth Error:", error);

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

      throw new Error("Unable to sign in with Google. Please try again.");
    }
  };

  // Complete Registration for New Google User (Requires 10-digit mobile)
  const completeGoogleRegistration = async ({ googleData, mobile, name: customName }) => {
    const cleanMobile = (mobile || "").trim().replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length !== 10) {
      throw new Error("Please enter a valid 10-digit mobile number.");
    }

    const email = (googleData.email || "").trim().toLowerCase();
    const name = (customName || googleData.name || email.split("@")[0] || "User").trim();
    const photoURL = googleData.photoURL || "";
    const firebaseUid = googleData.firebaseUid || Date.now();

    // Check duplicate mobile across registered accounts
    const users = getStoredUsers();
    const duplicateMobile = users.find((u) => {
      const uMobile = (u.mobile || "").trim().replace(/\D/g, "");
      return uMobile && uMobile === cleanMobile;
    });
    if (duplicateMobile) {
      throw new Error("An account already exists with this mobile number.");
    }

    // Call backend registration if available
    try {
      await apiFetch("/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          mobile: cleanMobile,
          firebaseUid,
          authProvider: "google",
        }),
      });
    } catch {}

    const newUser = {
      id: firebaseUid || Date.now(),
      name,
      email,
      mobile: cleanMobile,
      avatar: photoURL,
      image: photoURL,
      firebaseUid,
      authProvider: "google",
    };

    const updatedUsers = [...users, newUser];
    saveStoredUsers(updatedUsers);

    // Initialize customer profile
    try {
      const profileData = {
        name,
        email,
        mobile: cleanMobile,
        avatar: photoURL,
        joinedDate: new Date().toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
      localStorage.setItem(`moxie_profile_${email}`, JSON.stringify(profileData));
    } catch {}

    setUser(newUser);
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

    try {
      const res = await apiFetch("/auth/forgot-password/", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.found) {
        return { success: true, message: "Email verified." };
      } else if (!res.ok && data.error) {
        throw new Error(data.error);
      }
    } catch (e) {
      if (e.message && e.message.includes("No account found")) {
        throw e;
      }
    }

    const users = getStoredUsers();
    const found = users.find((u) => u.email && u.email.trim().toLowerCase() === email);
    if (!found) {
      throw new Error("No account found with this email address.");
    }

    return { success: true, message: "Email verified." };
  };

  // Reset Password for exact matching user (Step 2)
  const resetPassword = async (emailInput, newPassword, confirmPassword) => {
    const email = (emailInput || "").trim().toLowerCase();
    if (!email) throw new Error("Email address is required.");
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    if (newPassword !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    try {
      const res = await apiFetch("/auth/reset-password/", {
        method: "POST",
        body: JSON.stringify({
          email,
          new_password: newPassword,
          newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && data.error) {
        throw new Error(data.error);
      }
    } catch (e) {
      if (e.message && (e.message.includes("No account") || e.message.includes("match"))) {
        throw e;
      }
    }

    const users = getStoredUsers();
    let userUpdated = false;
    const updatedUsers = users.map((u) => {
      if (u.email && u.email.trim().toLowerCase() === email) {
        userUpdated = true;
        return { ...u, password: newPassword };
      }
      return u;
    });

    if (!userUpdated) {
      throw new Error("No account found with this email address.");
    }

    saveStoredUsers(updatedUsers);

    try {
      const savedUser = JSON.parse(localStorage.getItem(CURRENT_USER_STORAGE_KEY) || "null");
      if (savedUser && savedUser.email && savedUser.email.toLowerCase() === email) {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(savedUser));
      }
    } catch {}

    return { success: true, message: "Password Changed Successfully" };
  };

  // Manual Logout (clears session, executes Firebase signOut)
  const logout = async () => {
    try {
      if (auth && isFirebaseConfigured) {
        await fbSignOut(auth);
      }
    } catch {}
    try {
      await apiFetch("/auth/logout/", { method: "POST" });
    } catch {}
    try {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    } catch {}
    setUser(null);
    setProfile(null);
    setIsLoggedIn(false);
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
