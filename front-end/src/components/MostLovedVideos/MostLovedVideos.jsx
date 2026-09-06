import React, { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import "./MostLovedVideos.css";

// 5 MP4 Video Clips: 3 Watches + 2 Cars
import clip1 from "../../assets/videos/moxie_clip_3.mp4";
import clip2 from "../../assets/videos/moxie_watch_clip_4.mp4";
import clip3 from "../../assets/videos/moxie_clip_2.mp4";
import carClip2 from "../../assets/videos/moxie_car_clip_2.mp4";
import carToyClip from "../../assets/videos/moxie_car_toy_clip.mp4";

// Fallback Posters from project assets
import poster1 from "../../assets/images/recommended/watch_1_black_gold.jpeg";
import poster2 from "../../assets/images/recommended/watch_4_silver_blue.jpeg";
import poster3 from "../../assets/images/recommended/watch_2_two_tone.jpeg";
import poster4 from "../../assets/images/banners/banner_thar.jpg";
import poster5 from "../../assets/images/banners/banner_thar.jpg";

const VIDEO_COLLECTIONS = [
  {
    id: "moxie-watch-collection",
    badge: "NEW ARRIVAL",
    title: "MOXIE WATCH COLLECTION",
    subtitle: "Explore Latest Styles",
    path: "/products/watches",
    video: clip1,
    fallbackVideo: "/videos/moxie_clip_3.mp4",
    poster: poster1,
    type: "watch",
  },
  {
    id: "trending-watches",
    badge: "TRENDING",
    title: "TRENDING WATCHES",
    subtitle: "Discover The Collection",
    path: "/products/watches",
    video: clip2,
    fallbackVideo: "/videos/moxie_watch_clip_4.mp4",
    poster: poster2,
    type: "watch",
  },
  {
    id: "premium-picks",
    badge: "MOXIE PICK",
    title: "PREMIUM PICKS",
    subtitle: "Explore Moxie Watches",
    path: "/products/watches",
    video: clip3,
    fallbackVideo: "/videos/moxie_clip_2.mp4",
    poster: poster3,
    type: "watch",
  },
  {
    id: "moxie-car-collection",
    badge: "NEW DROP",
    title: "MOXIE CAR COLLECTION",
    subtitle: "EXPLORE PREMIUM MODELS",
    path: "/products/die-cast-cars",
    video: carClip2,
    fallbackVideo: "/videos/moxie_car_clip_2.mp4",
    poster: poster4,
    type: "car",
  },
  {
    id: "die-cast-collection",
    badge: "COLLECTOR PICK",
    title: "DIE-CAST COLLECTION",
    subtitle: "DISCOVER COLLECTOR MODELS",
    path: "/products/die-cast-cars",
    video: carToyClip,
    fallbackVideo: "/videos/moxie_car_toy_clip.mp4",
    poster: poster5,
    type: "car",
  },
];

export default function MostLovedVideos() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const videoRefs = useRef([]);

  // Calculate visible cards based on viewport width
  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width <= 600) {
        setVisibleCount(1);
      } else if (width <= 992) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  const maxIndex = Math.max(0, VIDEO_COLLECTIONS.length - visibleCount);

  // Keep index in safe range when resizing
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  // Ensure all 5 videos are always running continuously
  useEffect(() => {
    const playAllVideos = () => {
      videoRefs.current.forEach((video) => {
        if (video) {
          video.muted = true;
          video.playsInline = true;
          if (video.paused) {
            const promise = video.play();
            if (promise !== undefined) {
              promise.catch(() => {
                // Autoplay policy waiting for user interaction or natural resume
              });
            }
          }
        }
      });
    };

    playAllVideos();

    window.addEventListener("scroll", playAllVideos, { passive: true });
    window.addEventListener("touchmove", playAllVideos, { passive: true });

    return () => {
      window.removeEventListener("scroll", playAllVideos);
      window.removeEventListener("touchmove", playAllVideos);
    };
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  return (
    <section
      className="most-loved-section"
      aria-label="Most Loved Moxie Collections Video Showcase"
    >
      <div className="most-loved-container">
        {/* Section Header */}
        <header className="most-loved-header">
          <div className="most-loved-header-left">
            <h2 className="most-loved-title">MOST LOVED COLLECTIONS</h2>
            <p className="most-loved-subtitle">
              Latest &amp; Trending Moxie Collections
            </p>
          </div>

          <div className="most-loved-controls" aria-label="Collection navigation">
            <button
              type="button"
              className="most-loved-control-btn"
              onClick={handlePrev}
              aria-label="Previous collections"
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="most-loved-control-btn"
              onClick={handleNext}
              aria-label="Next collections"
            >
              <FiChevronRight />
            </button>
          </div>
        </header>

        {/* 5 Video Cards Carousel Slider */}
        <div className="most-loved-slider-window">
          <div
            className="most-loved-track"
            style={{
              "--current-idx": currentIndex,
              "--visible-count": visibleCount,
            }}
          >
            {VIDEO_COLLECTIONS.map((item, index) => (
              <article key={item.id} className="most-loved-card">
                {/* Video Preview Box */}
                <Link
                  to={item.path}
                  className="most-loved-video-wrapper"
                  aria-label={item.title}
                >
                  <span className="most-loved-badge">{item.badge}</span>

                  <video
                    ref={(el) => (videoRefs.current[index] = el)}
                    className={`most-loved-video ${item.type === "car" ? "car-video" : ""}`}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster={item.poster}
                    onError={(e) => {
                      if (e.target.currentSrc !== item.fallbackVideo) {
                        e.target.src = item.fallbackVideo;
                        e.target.play().catch(() => {});
                      }
                    }}
                  >
                    <source src={item.video} type="video/mp4" />
                    <source src={item.fallbackVideo} type="video/mp4" />
                  </video>

                  <div className="most-loved-overlay" />
                </Link>

                {/* Card Bottom: Info on Left, Arrow on Right */}
                <div className="most-loved-card-bottom">
                  <div className="most-loved-card-info">
                    <Link to={item.path} className="most-loved-card-title">
                      {item.title}
                    </Link>
                    <Link to={item.path} className="most-loved-card-link">
                      {item.subtitle}
                    </Link>
                  </div>

                  <Link
                    to={item.path}
                    className="most-loved-arrow-btn"
                    aria-label={`Explore ${item.title}`}
                  >
                    <FiArrowRight />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
