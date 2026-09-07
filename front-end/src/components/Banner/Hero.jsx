import React, { useState, useEffect } from "react";
import { API_URL, BACKEND_URL } from "../../config";
import "./Hero.css";

const API_ORIGIN = BACKEND_URL;

const isVideoUrl = (url) => {
  if (!url) return false;
  const lower = String(url).toLowerCase();
  return (
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov") ||
    lower.endsWith(".m4v") ||
    lower.endsWith(".ogv") ||
    lower.includes("/video/") ||
    lower.includes(".mp4?")
  );
};

const getMediaUrl = (url) => {
  if (!url) return null;
  let cleanUrl = url;
  if (typeof cleanUrl === "string") {
    cleanUrl = cleanUrl
      .replace(/^http:\/\/127\.0\.0\.1:8000/, API_ORIGIN)
      .replace(/^http:\/\/localhost:8000/, API_ORIGIN);

    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      return cleanUrl;
    }
  }
  try {
    return new URL(cleanUrl, API_ORIGIN).href;
  } catch {
    return cleanUrl;
  }
};

export default function Hero() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API_URL}/banners/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch banners");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : (data?.results || []);
        const validBanners = list
          .filter((b) => b && (b.is_active !== false) && (b.image || b.media))
          .map((b) => {
            const rawMedia = b.image || b.media;
            const fullUrl = getMediaUrl(rawMedia);
            const isVideo = b.media_type === "video" || isVideoUrl(rawMedia);
            return {
              id: b.id,
              mediaUrl: fullUrl,
              isVideo: isVideo,
            };
          })
          .filter((b) => Boolean(b.mediaUrl));

        setBanners(validBanners);
      })
      .catch((err) => {
        console.warn("Could not load dynamic banners:", err);
        if (isMounted) setBanners([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-advance if multiple active banners exist
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (loading) {
    return null;
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  const activeBanner = banners[currentIndex] || banners[0];
  if (!activeBanner || !activeBanner.mediaUrl) {
    return null;
  }

  return (
    <section className="moxie-hero-banner-section" aria-label="Featured Banner">
      <div className="moxie-hero-banner-container">
        {activeBanner.isVideo ? (
          <video
            key={activeBanner.id || activeBanner.mediaUrl}
            src={activeBanner.mediaUrl}
            className="moxie-banner-media"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            key={activeBanner.id || activeBanner.mediaUrl}
            src={activeBanner.mediaUrl}
            alt="Moxie Featured Banner"
            className="moxie-banner-media"
            loading="eager"
          />
        )}
      </div>
    </section>
  );
}
