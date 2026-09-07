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

    const defaultProfile = {
      name: email.split("@")[0].toUpperCase(),
      email: email,
      mobile: "",
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

