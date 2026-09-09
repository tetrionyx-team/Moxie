/**
 * Profile Service API Client
 * Manages user profile information.
 * Prepared for future integration with Python + Django REST API /api/profile/.
 */

import { apiFetch } from "../api/apiConfig";

// Default generic user avatar placeholder
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80";

export const profileService = {
  fetchProfile: async (email) => {
    try {
      const res = await apiFetch("/customer/profile/");
      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          avatar: data.avatar || DEFAULT_AVATAR,
        };
      }
    } catch {
      // Fallback below
    }

    if (!email) return null;

    try {
      const stored = localStorage.getItem(`moxie_profile_${email}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      // Ignore
    }

    // Check if user exists in moxie_users or moxie_current_user
    let fallbackName = email.split("@")[0].toUpperCase();
    let fallbackMobile = "";

    try {
      const currentUser = JSON.parse(localStorage.getItem("moxie_current_user") || "null");
      if (currentUser && currentUser.email && currentUser.email.toLowerCase() === email.toLowerCase()) {
        if (currentUser.name) fallbackName = currentUser.name;
        if (currentUser.mobile) fallbackMobile = currentUser.mobile;
      } else {
        const users = JSON.parse(localStorage.getItem("moxie_users") || "[]");
        const found = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        if (found) {
          if (found.name) fallbackName = found.name;
          if (found.mobile) fallbackMobile = found.mobile;
        }
      }
    } catch (e) {
      // Ignore
    }

    const defaultProfile = {
      name: fallbackName,
      email: email,
      mobile: fallbackMobile,
      avatar: DEFAULT_AVATAR,
      joinedDate: new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };

    try {
      localStorage.setItem(`moxie_profile_${email}`, JSON.stringify(defaultProfile));
    } catch {}
    return defaultProfile;
  },

  updateProfile: async (email, data) => {
    try {
      const res = await apiFetch("/customer/profile/", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const resData = await res.json();
        return {
          ...(resData.profile || resData),
          avatar: (resData.profile && resData.profile.avatar) || DEFAULT_AVATAR,
        };
      }
    } catch {
      // Fallback
    }

    if (!email) return null;

    const currentProfile = await profileService.fetchProfile(email);
    const updated = { ...currentProfile, ...data };

    try {
      localStorage.setItem(`moxie_profile_${email}`, JSON.stringify(updated));
    } catch {}
    return updated;
  },
};

