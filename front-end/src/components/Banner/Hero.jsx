import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import "./Hero.css";
import Banner from "../../assets/images/banner2.png";
import BannerVideo from "../../assets/Video/banner_video.mp4";

import { BACKEND_URL } from "../../config";

const API_ORIGIN = BACKEND_URL;

const getBannerImageUrl = (image) => {
  if (!image) return Banner;

  try {
    return new URL(image, API_ORIGIN).href;
  } catch {
    return image;
  }
};
const slides = [
  {
    type: "image",
    tag: "NEW ARRIVALS",
    title: (
      <>
        SMARTER CHOICES,
        <br />
        <span>BETTER LIFE</span>
      </>
    ),
    description: "Top quality gadgets and lifestyle products curated just for you.",
    buttonText: "Shop Now →",
    image: Banner,
    link: "/products/watches",
    background: "#f5f5f7",
    duration: 5000,
    textColor: "#050505",
    spanColor: "#FDB101",
    descColor: "#555555",
    btnBackground: "#050505",
    btnTextColor: "#ffffff",
  },
  {
    type: "video",
    video: BannerVideo,
    link: "/products/watches",
    background: "#0c0c0c",
  },
  {
    type: "image",
    tag: "EXCLUSIVE OFFER",
    title: (
      <>
        PREMIUM TECH.
        <br />
        <span>BETTER LIFESTYLE.</span>
      </>
    ),
    description: "Shop premium watches, earbuds, shoes and everyday accessories at great prices.",
    buttonText: "Explore Deals →",
    image: Banner,
    link: "/products/deals",
    background: "#FDB101",
    duration: 5000,
    textColor: "#050505",
    spanColor: "#ffffff",
    descColor: "#1a1a1a",
    btnBackground: "#050505",
    btnTextColor: "#ffffff",
  },
  {
    type: "image",
    tag: "DISCOVER MORE",
    title: (
      <>
        PRODUCTS YOU'LL LOVE
        <br />
        <span>BEST QUALITY</span>
      </>
    ),
    description: "Upgrade your routine with our top trending tech accessories and everyday gear.",
    buttonText: "Explore Now →",
    image: Banner,
    link: "/products/accessories",
    background: "#111111",
    duration: 5000,
    textColor: "#ffffff",
    spanColor: "#FDB101",
    descColor: "#e2e8f0",
    btnBackground: "#ffffff",
    btnTextColor: "#0c0c0c",
  },
];

function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const videoRefs = useRef([]);

  useEffect(() => {
    fetch(`${API_ORIGIN}/api/banners/`)
      .then(res => res.json())
      .then(data => {
        const mappedSlides = data.map((b) => {
          let titleElement = b.title;
          const words = b.title.split(" ");
          if (words.length > 2) {
            const splitIndex = Math.ceil(words.length / 2);
            const line1 = words.slice(0, splitIndex).join(" ");
            const line2 = words.slice(splitIndex).join(" ");
            titleElement = (
              <>
                {line1}
                <br />
                <span>{line2}</span>
              </>
            );
          }

          return {
            type: b.display_order === 1 ? "video" : "image",
            tag: b.subtitle || "TRENDING TECH",
            title: titleElement,
            description: b.display_order === 1
              ? "Discover premium watches, smart accessories and everyday essentials designed for your lifestyle."
              : b.display_order === 3
              ? "Shop premium watches, earbuds, shoes and everyday accessories at great prices."
              : "Upgrade your routine with our top trending tech accessories and everyday gear.",
            buttonText: (b.button_text || "Shop Now") + " →",
            image: getBannerImageUrl(b.image),
            video: BannerVideo,
            link: b.button_link || "/products/watches",
            background: b.display_order === 1 ? "#0c0c0c" : b.display_order === 3 ? "#FDB101" : b.display_order === 4 ? "#111111" : "#f5f5f7",
            textColor: b.display_order === 1 || b.display_order === 4 ? "#ffffff" : "#000000",
            spanColor: b.display_order === 3 ? "#ffffff" : "#FDB101",
            descColor: b.display_order === 1 || b.display_order === 4 ? "#e2e8f0" : b.display_order === 3 ? "#1a1a1a" : "#555555",
            btnBackground: b.display_order === 1 || b.display_order === 4 ? "#ffffff" : "#000000",
            btnTextColor: b.display_order === 1 || b.display_order === 4 ? "#0c0c0c" : "#ffffff",
            duration: 5000,
          };
        });
        setBanners(mappedSlides);
      })
      .catch(err => {
        console.error("Error fetching banners:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const activeSlides = banners.length > 0 ? banners : slides;

  const nextSlide = useCallback(() => {
    if (activeSlides.length === 0) return;
    setCurrentSlide((prev) => (prev === activeSlides.length - 1 ? 0 : prev + 1));
  }, [activeSlides.length]);

  const prevSlide = useCallback(() => {
    if (activeSlides.length === 0) return;
    setCurrentSlide((prev) => (prev === 0 ? activeSlides.length - 1 : prev - 1));
  }, [activeSlides.length]);

  useEffect(() => {
    if (activeSlides.length === 0) return;
    const activeSlide = activeSlides[currentSlide];

    // Reset and pause all videos
    videoRefs.current.forEach((video) => {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    });

    if (activeSlide.type === "video") {
      // Play the active slide's video
      const activeVideo = videoRefs.current[currentSlide];
      if (activeVideo) {
        activeVideo.play().catch((err) => {
          console.log("Autoplay was prevented by browser:", err);
        });
      }
    } else {
      // Auto-advance for image slides after their configured duration
      const timer = setTimeout(() => {
        nextSlide();
      }, activeSlide.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [currentSlide, activeSlides, nextSlide]);

  if (loading) {
    return (
      <section className="hero">
        <div className="hero-container d-flex align-items-center justify-content-center" style={{ minHeight: "50vh" }}>
          <div className="spinner-border text-warning" role="status">
            <span className="visually-hidden">Loading banners...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="home-hero-section hero">
      <div className="hero-container hero-carousel">

          {/* Navigation Arrows */}
          <button className="slider-nav-btn prev" onClick={prevSlide} aria-label="Previous Slide">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <button className="slider-nav-btn next" onClick={nextSlide} aria-label="Next Slide">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          {/* Slides Track */}
          <div
            className="hero-slide-wrapper"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {activeSlides.map((slide, index) => (
              <div
                className={`hero-slide ${slide.type === "video" ? "video-slide" : ""}`}
                key={index}
                style={{
                  backgroundColor: slide.background,
                  "--slide-text-color": slide.textColor,
                  "--slide-span-color": slide.spanColor,
                  "--slide-desc-color": slide.descColor,
                  "--slide-btn-bg": slide.btnBackground,
                  "--slide-btn-color": slide.btnTextColor,
                }}
              >
                <div className="hero-slide-container">
                  {/* Left text content rendered only for non-video slides */}
                  {slide.type !== "video" && (
                    <div className="hero-content-left">
                      {slide.tag && <span className="hero-tag">{slide.tag}</span>}
                      {slide.title && <h1>{slide.title}</h1>}
                      {slide.description && <p>{slide.description}</p>}
                      {slide.buttonText && (
                        <Link to={slide.link || "/products/watches"} className="shop-btn" style={{ textDecoration: "none" }}>
                          {slide.buttonText}
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Media container */}
                  <div className="hero-media-right">
                    {slide.type === "video" ? (
                      <video
                        ref={(el) => (videoRefs.current[index] = el)}
                        className="hero-video"
                        src={slide.video}
                        muted
                        playsInline
                        loop={false}
                        onEnded={nextSlide}
                      />
                    ) : (
                      <img src={slide.image} alt="Banner Product" className="hero-image" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Indicator Dots */}
          <div className="slider-dots">
            {activeSlides.map((_, index) => (
              <button
                key={index}
                className={`slider-dot ${index === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

        </div>
      </section>
  );
}

export default Hero;
