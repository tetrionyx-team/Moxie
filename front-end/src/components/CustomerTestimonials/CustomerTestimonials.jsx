import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, BACKEND_URL } from "../../config";
import { useData } from "../../context/DataContext";
import { getProductImageUrl } from "../../utils/productImage";
import "./CustomerTestimonials.css";

const getReviewImageUrl = (image) => {
  if (!image) return null;
  let cleanImage = image;
  if (typeof cleanImage === "string") {
    cleanImage = cleanImage
      .replace(/^http:\/\/127\.0\.0\.1:8000/, BACKEND_URL)
      .replace(/^http:\/\/localhost:8000/, BACKEND_URL);

    if (cleanImage.startsWith("http://") || cleanImage.startsWith("https://")) {
      return cleanImage;
    }
  }
  try {
    return new URL(cleanImage, BACKEND_URL).href;
  } catch {
    return cleanImage;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

/**
 * Reusable Star Rating Renderer
 */
const renderStars = (rating = 5) => {
  const numericRating = Number(rating) || 5;
  const filledCount = Math.min(Math.max(Math.round(numericRating), 1), 5);
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= filledCount;
    stars.push(
      <svg
        key={i}
        className={`moxie-star-icon ${isFilled ? "filled" : "empty"}`}
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <path
          d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
          fill={isFilled ? "#F59E0B" : "#CBD5E1"}
        />
      </svg>
    );
  }
  return stars;
};

/**
 * Reusable Compact Review Card Component (Multi-Image Gallery & No Title)
 */
export function ReviewCard({ item, products = [], onImageClick, className = "" }) {
  const navigate = useNavigate();

  const prod = useMemo(() => {
    let matchedProduct = null;
    if (item.productId && products.length > 0) {
      matchedProduct = products.find((p) => String(p.id) === String(item.productId));
    }
    if (!matchedProduct && item.productName && products.length > 0) {
      matchedProduct = products.find(
        (p) => p.name?.toLowerCase().trim() === item.productName.toLowerCase().trim()
      );
    }

    const name = item.productName || matchedProduct?.name || "Moxie Luxury Timepiece";
    const image = matchedProduct ? getProductImageUrl(matchedProduct) : getProductImageUrl(null);
    const link = matchedProduct ? `/products/${matchedProduct.id}` : (item.productId ? `/products/${item.productId}` : null);

    return { name, image, link };
  }, [item, products]);

  // Support multiple images or single fallback image
  const imagesList = useMemo(() => {
    if (Array.isArray(item.images) && item.images.length > 0) {
      return item.images;
    }
    if (item.image) {
      return [item.image];
    }
    return [];
  }, [item.images, item.image]);

  const hasImages = imagesList.length > 0;

  return (
    <article className={`moxie-review-card ${className}`.trim()}>
      {/* Customer Header Row: Avatar, Name, Verified Badge, Rating + Number, Date */}
      <div className="moxie-review-top-row">
        {/* Avatar */}
        {item.avatar ? (
          <img
            src={item.avatar}
            alt={item.name}
            className="moxie-review-avatar"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="moxie-review-avatar-initial" aria-hidden="true">
            {item.initial}
          </div>
        )}

        {/* Customer Info */}
        <div className="moxie-review-user-info">
          <div className="moxie-review-name-badge-row">
            <span className="moxie-review-user-name">{item.name}</span>
            {item.isVerified && (
              <span className="moxie-verified-pill" title="Verified Purchase">
                <svg
                  viewBox="0 0 16 16"
                  width="11"
                  height="11"
                  fill="currentColor"
                  aria-hidden="true"
                  className="moxie-verified-check-icon"
                >
                  <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                </svg>
                Verified Purchase
              </span>
            )}
          </div>

          {/* Star Rating + Number */}
          <div
            className="moxie-review-rating-row"
            aria-label={`${item.rating.toFixed(1)} out of 5 stars`}
          >
            <div className="moxie-review-stars">{renderStars(item.rating)}</div>
            <span className="moxie-review-rating-num">
              {item.rating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Top-Right Review Date */}
        {item.date && (
          <span className="moxie-review-date">{item.date}</span>
        )}
      </div>

      {/* Review Content Body (No Title) */}
      <div className="moxie-review-body">
        <p className="moxie-review-text">
          &ldquo;{item.text}&rdquo;
        </p>
      </div>

      {/* Optional Customer Uploaded Product Photos Gallery (Horizontal Scroll) */}
      {hasImages && (
        <div className="moxie-review-images-row">
          <div className="moxie-review-photos-scroll-track">
            {imagesList.map((imgUrl, imgIdx) => (
              <div
                key={imgIdx}
                className="moxie-review-thumbnail-wrap"
                onClick={() => onImageClick && onImageClick(imagesList, imgIdx)}
                role="button"
                tabIndex={0}
                title="Click to view larger photo"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (onImageClick) onImageClick(imagesList, imgIdx);
                  }
                }}
              >
                <img
                  src={imgUrl}
                  alt={`Customer review upload ${imgIdx + 1} for ${item.productName || "product"}`}
                  className="moxie-review-uploaded-img"
                  loading="lazy"
                />
                <div className="moxie-review-img-zoom-overlay">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Purchased Product Footer */}
      <div
        className={`moxie-review-product-footer ${prod.link ? "clickable" : ""}`}
        onClick={() => {
          if (prod.link) navigate(prod.link);
        }}
        role={prod.link ? "button" : undefined}
        tabIndex={prod.link ? 0 : undefined}
        title={prod.link ? `View ${prod.name}` : undefined}
        onKeyDown={(e) => {
          if (prod.link && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            navigate(prod.link);
          }
        }}
      >
        <img
          src={prod.image}
          alt={prod.name}
          className="moxie-review-prod-thumb"
          loading="lazy"
        />
        <div className="moxie-review-prod-meta">
          <span className="moxie-review-prod-label">Purchased:</span>
          <span className="moxie-review-prod-name">{prod.name}</span>
        </div>
        <div className="moxie-review-chevron" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </article>
  );
}

/**
 * Main CustomerTestimonials Section Component
 */
export default function CustomerTestimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [lightboxState, setLightboxState] = useState(null); // { images: [], activeIndex: 0 }
  const carouselTrackRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchEndXRef = useRef(0);

  // Access products from DataContext to link real products
  const dataContext = useData();
  const products = dataContext?.products || [];

  // Determine cards per view based on window width
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setCardsPerView(1);
      } else if (width < 1024) {
        setCardsPerView(2);
      } else {
        setCardsPerView(3);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch real reviews from existing backend API
  useEffect(() => {
    fetch(`${API_URL}/reviews/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch reviews");
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        if (list.length > 0) {
          const mapped = list.map((item, idx) => {
            const rawRating = Number(item.rating);
            const ratingVal = !isNaN(rawRating) && rawRating > 0 ? rawRating : 5;
            const name = (item.name || "Verified Customer").trim();
            const initial = name ? name.charAt(0).toUpperCase() : "M";

            // Parse multiple images array or fallback single image
            const parsedImages = Array.isArray(item.images) && item.images.length > 0
              ? item.images.map(getReviewImageUrl).filter(Boolean)
              : (item.image ? [getReviewImageUrl(item.image)].filter(Boolean) : []);

            return {
              id: item.id || `api-review-${idx}`,
              name: name,
              rating: ratingVal,
              title: item.title || "",
              text: item.text || item.comment || item.message || "",
              productName: item.product_name || (item.product && item.product.name) || "",
              productId: item.product_id || (typeof item.product === "number" ? item.product : item.product?.id) || null,
              isVerified: item.is_verified !== false,
              image: parsedImages[0] || null,
              images: parsedImages,
              avatar: item.avatar || item.customer_avatar || null,
              date: formatDate(item.created_at || item.date),
              initial: initial,
            };
          });
          setTestimonials(mapped);
        } else {
          setTestimonials([]);
        }
      })
      .catch(() => {
        setTestimonials([]);
      });
  }, []);

  // Zero-review state: hide entire section
  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  const reviewCount = testimonials.length;
  const shouldUseCarousel = reviewCount > 3;

  const maxIndex = Math.max(0, testimonials.length - cardsPerView);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
  };

  const totalPages = Math.ceil(testimonials.length / cardsPerView);
  const activePageIndex = Math.min(
    Math.floor(currentIndex / cardsPerView),
    totalPages - 1
  );

  const handleDotClick = (pageIdx) => {
    const targetIdx = Math.min(pageIdx * cardsPerView, maxIndex);
    setCurrentIndex(targetIdx);
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
      touchEndXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches.length > 0) {
      touchEndXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    const swipeThreshold = 45;
    if (diff > swipeThreshold) {
      handleNext();
    } else if (diff < -swipeThreshold) {
      handlePrev();
    }
    touchStartXRef.current = 0;
    touchEndXRef.current = 0;
  };

  const openLightbox = (images, initialIndex = 0) => {
    setLightboxState({
      images: Array.isArray(images) ? images : [images],
      activeIndex: initialIndex || 0,
    });
  };

  const handleLightboxPrev = () => {
    if (!lightboxState) return;
    setLightboxState((prev) => ({
      ...prev,
      activeIndex: (prev.activeIndex - 1 + prev.images.length) % prev.images.length,
    }));
  };

  const handleLightboxNext = () => {
    if (!lightboxState) return;
    setLightboxState((prev) => ({
      ...prev,
      activeIndex: (prev.activeIndex + 1) % prev.images.length,
    }));
  };

  return (
    <section
      className="moxie-reviews-section"
      aria-label="Customer Reviews"
      id="customer-reviews"
    >
      {/* Background Decorative Cream/Gold Corner Curves */}
      <div className="moxie-reviews-bg-curve top-left" aria-hidden="true" />
      <div className="moxie-reviews-bg-curve bottom-right" aria-hidden="true" />

      <div className="moxie-reviews-container">
        {/* Section Header */}
        <div className="moxie-reviews-header">
          <div className="moxie-reviews-star-badge" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="#C5A059"
              className="moxie-gold-star-icon"
            >
              <path d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2L12 0Z" />
            </svg>
          </div>
          <span className="moxie-reviews-overline">CUSTOMER REVIEWS</span>
          <h2 className="moxie-reviews-title">What Our Customers Say</h2>
          <p className="moxie-reviews-subtitle">
            Real reviews from verified Moxie customers.
          </p>
        </div>

        {/* Dynamic Layout: Static Centered (<= 3 reviews) vs Carousel (> 3 reviews) */}
        {!shouldUseCarousel ? (
          <div className={`moxie-reviews-static moxie-reviews-count-${reviewCount}`}>
            {testimonials.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`moxie-static-card-wrap moxie-static-count-${reviewCount}`}
              >
                <ReviewCard
                  item={item}
                  products={products}
                  onImageClick={(imgs, index) => openLightbox(imgs, index)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="moxie-reviews-carousel-wrapper">
            {/* Left Arrow */}
            {testimonials.length > cardsPerView && (
              <button
                type="button"
                className="moxie-carousel-arrow prev-arrow"
                onClick={handlePrev}
                aria-label="Previous reviews"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}

            {/* Cards Carousel Viewport */}
            <div
              className="moxie-carousel-viewport"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="moxie-carousel-track"
                ref={carouselTrackRef}
                style={{
                  transform: `translateX(-${(currentIndex * 100) / cardsPerView}%)`,
                }}
              >
                {testimonials.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="moxie-carousel-slide"
                    style={{ flex: `0 0 ${100 / cardsPerView}%` }}
                  >
                    <ReviewCard
                      item={item}
                      products={products}
                      onImageClick={(imgs, index) => openLightbox(imgs, index)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Arrow */}
            {testimonials.length > cardsPerView && (
              <button
                type="button"
                className="moxie-carousel-arrow next-arrow"
                onClick={handleNext}
                aria-label="Next reviews"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Pagination Dots (Only rendered when in Carousel mode and more than 1 page) */}
        {shouldUseCarousel && totalPages > 1 && (
          <div className="moxie-reviews-pagination" aria-label="Review pagination">
            {Array.from({ length: totalPages }).map((_, pageIdx) => (
              <button
                key={pageIdx}
                type="button"
                className={`moxie-pagination-dot ${
                  pageIdx === activePageIndex ? "active" : ""
                }`}
                onClick={() => handleDotClick(pageIdx)}
                aria-label={`Go to slide page ${pageIdx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal with Multi-Image Prev/Next Support */}
      {lightboxState && (
        <div
          className="moxie-review-lightbox-overlay"
          onClick={() => setLightboxState(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Customer review photo preview"
        >
          <div
            className="moxie-review-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="moxie-lightbox-close-btn"
              onClick={() => setLightboxState(null)}
              aria-label="Close image preview"
            >
              ✕
            </button>

            {/* Lightbox Image */}
            <img
              src={lightboxState.images[lightboxState.activeIndex]}
              alt={`Enlarged customer review upload ${lightboxState.activeIndex + 1}`}
              className="moxie-lightbox-img"
            />

            {/* Prev / Next controls when multiple images exist */}
            {lightboxState.images.length > 1 && (
              <>
                <button
                  type="button"
                  className="moxie-lightbox-nav-btn prev"
                  onClick={handleLightboxPrev}
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="moxie-lightbox-nav-btn next"
                  onClick={handleLightboxNext}
                  aria-label="Next photo"
                >
                  ›
                </button>
                <div className="moxie-lightbox-counter">
                  {lightboxState.activeIndex + 1} / {lightboxState.images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
