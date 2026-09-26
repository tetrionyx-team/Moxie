/**
 * Profile Service API Client
 * Manages user profile information via Django REST API /api/customer/profile/.
 * Django PostgreSQL database is the Single Source of Truth.
 */

import { apiFetch } from "../api/apiConfig";

// Helper to filter out legacy/demo avatar placeholder URLs
const sanitizeAvatar = (avatar) => {
  if (!avatar || typeof avatar !== "string") return "";
  if (
    avatar.includes("images.unsplash.com/photo-1535713875002-d1d0cf377fde") ||
    avatar.includes("user-placeholder") ||
    avatar.includes("defaultProfile")
  ) {
    return "";
  }
  return avatar;
};

export const profileService = {
  fetchProfile: async (email) => {
    try {
      const url = email ? `/customer/profile/?email=${encodeURIComponent(email)}` : "/customer/profile/";
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        const profile = {
          ...data,
          avatar: sanitizeAvatar(data.avatar),
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
            if (cached) {
              const parsed = JSON.parse(cached);
              parsed.avatar = sanitizeAvatar(parsed.avatar);
              return parsed;
            }
          } catch {}
        }
        return null;
      }
    } catch (e) {
      console.warn("Failed to fetch customer profile:", e);
      if (email) {
        try {
          const cached = localStorage.getItem(`moxie_profile_${email}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            parsed.avatar = sanitizeAvatar(parsed.avatar);
            return parsed;
          }
        } catch {}
      }
    }

    return null;
  },

  updateProfile: async (email, data) => {
    const payload = {
      ...data,
      email: email || data?.email || "",
      avatar: sanitizeAvatar(data?.avatar),
    };

    const res = await apiFetch("/customer/profile/", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const resData = await res.json();
      const rawAvatar = (resData.profile && resData.profile.avatar) || data.avatar || "";
      const updated = {
        ...(resData.profile || resData),
        avatar: sanitizeAvatar(rawAvatar),
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
