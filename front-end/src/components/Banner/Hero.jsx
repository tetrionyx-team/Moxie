import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { API_URL, BACKEND_URL } from "../../config";
import "./Hero.css";

// Fallback project videos to ensure seamless looping video slider
import clip1 from "../../assets/videos/moxie_clip_3.mp4";
import clip2 from "../../assets/videos/moxie_watch_clip_4.mp4";
import clip3 from "../../assets/videos/moxie_clip_2.mp4";
import clip4 from "../../assets/videos/moxie_car_clip_2.mp4";
import clip5 from "../../assets/videos/moxie_car_toy_clip.mp4";

const API_ORIGIN = BACKEND_URL;

const DEFAULT_BANNERS = [
  { id: "fallback-1", mediaUrl: clip1, isVideo: true },
  { id: "fallback-2", mediaUrl: clip2, isVideo: true },
  { id: "fallback-3", mediaUrl: clip3, isVideo: true },
  { id: "fallback-4", mediaUrl: clip4, isVideo: true },
  { id: "fallback-5", mediaUrl: clip5, isVideo: true },
];

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
  const navigate = useNavigate();
  const [banners, setBanners] = useState(DEFAULT_BANNERS);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // Fetch backend dynamic banners if available
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_URL}/banners/`, {
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch banners");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        const validBanners = list
          .filter((b) => b && b.is_active !== false && (b.image || b.media))
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

        if (validBanners.length > 0) {
          setBanners(validBanners);
          setCurrentSlide(0);
        }
      })
      .catch((err) => {
        // Silently use DEFAULT_BANNERS
        console.warn("Could not load dynamic banners, using local defaults:", err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Next Slide Handler (Loops to first video on last slide)
  const handleNext = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // Previous Slide Handler (Loops to last video on first slide)
  const handlePrevious = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrentSlide((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  }, [banners.length]);

  // Autoplay & reset currentTime whenever currentSlide changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy or media unplayable fallback
        });
      }
    }
  }, [currentSlide]);

  // Image-only fallback timer (Only runs if active slide is an image, not a video)
  useEffect(() => {
    if (banners.length <= 1) return;
    const activeBanner = banners[currentSlide];
    if (activeBanner && !activeBanner.isVideo) {
      const timer = setTimeout(() => {
        handleNext();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide, banners, handleNext]);

  const handleVideoEnded = () => {
    handleNext();
  };

  const handleVideoError = () => {
    console.error("Banner video failed to load, advancing to next slide");
    handleNext();
  };

  const handleBannerClick = () => {
    navigate("/products");
  };

  const handlePrevClick = (e) => {
    e.stopPropagation();
    handlePrevious();
  };

  const handleNextClick = (e) => {
    e.stopPropagation();
    handleNext();
  };

  // Touch / swipe handling for mobile devices
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrevious();
    }
  };

  if (loading || !banners || banners.length === 0) {
    return null;
  }

  const activeBanner = banners[currentSlide] || banners[0];
  if (!activeBanner || !activeBanner.mediaUrl) {
    return null;
  }

  const hasMultiple = banners.length > 1;

  return (
    <section className="moxie-hero-banner-section" aria-label="Featured Banner">
      <div
        className="moxie-hero-banner-container"
        onClick={handleBannerClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            handleBannerClick();
          }
        }}
        aria-label="View all products catalog"
      >
        {activeBanner.isVideo ? (
          <video
            ref={videoRef}
            key={currentSlide}
            className="moxie-banner-media"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnded}
            onError={handleVideoError}
          >
            <source src={activeBanner.mediaUrl} type="video/mp4" />
          </video>
        ) : (
          <img
            key={currentSlide}
            src={activeBanner.mediaUrl}
            alt="Moxie Featured Banner"
            className="moxie-banner-media"
            loading="eager"
          />
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              className="moxie-banner-nav-btn prev-btn"
              onClick={handlePrevClick}
              aria-label="Previous banner"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={20} strokeWidth={2} />
            </button>

            <button
              type="button"
              className="moxie-banner-nav-btn next-btn"
              onClick={handleNextClick}
              aria-label="Next banner"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={20} strokeWidth={2} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
