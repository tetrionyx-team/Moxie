/**
 * Profile Service API Client
 * Manages user profile information via Django REST API /api/customer/profile/.
 * Django PostgreSQL database is the Single Source of Truth.
 */

import { apiFetch } from "../api/apiConfig";

// Default generic user avatar placeholder
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80";

export const profileService = {
  fetchProfile: async (email) => {
    try {
      const url = email ? `/customer/profile/?email=${encodeURIComponent(email)}` : "/customer/profile/";
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        const profile = {
          ...data,
          avatar: data.avatar || DEFAULT_AVATAR,
        };
        if (email) {
          try {
            localStorage.setItem(`moxie_profile_${email}`, JSON.stringify(profile));
          } catch {}
        }
        return profile;
      }
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        // Check cached profile
        if (email) {
          try {
            const cached = localStorage.getItem(`moxie_profile_${email}`);
            if (cached) return JSON.parse(cached);
          } catch {}
        }
        return null;
      }
    } catch (e) {
      console.warn("Failed to fetch customer profile:", e);
      if (email) {
        try {
          const cached = localStorage.getItem(`moxie_profile_${email}`);
          if (cached) return JSON.parse(cached);
        } catch {}
      }
    }

    return null;
  },

  updateProfile: async (email, data) => {
    const payload = {
      ...data,
      email: email || data?.email || "",
    };

    const res = await apiFetch("/customer/profile/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const resData = await res.json();
      const updated = {
        ...(resData.profile || resData),
        avatar: (resData.profile && resData.profile.avatar) || data.avatar || DEFAULT_AVATAR,
      };
      const userEmail = email || updated.email;
      if (userEmail) {
        try {
          localStorage.setItem(`moxie_profile_${userEmail}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    }

    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.detail || "Failed to update profile.");
  },
};
