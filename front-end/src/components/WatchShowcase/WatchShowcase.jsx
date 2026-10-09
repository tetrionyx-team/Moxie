import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import { Link } from "react-router-dom";
import { FiHeart, FiShoppingCart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { useData } from "../../context/DataContext";
import { CartContext } from "../../context/CartContext";
import { WishlistContext } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";
import "./WatchShowcase.css";

import { resolveMediaUrl, getProductImageUrl, NEUTRAL_PLACEHOLDER } from "../../utils/productImage";

// Apple / iOS style emoji helper with fallback
function IosEmoji({ emoji, size = 16, className = "" }) {
  const [imgError, setImgError] = useState(false);
  if (!emoji) return null;
  if (imgError) {
    return <span className={`native-emoji ${className}`} style={{ fontSize: `${size}px`, lineHeight: 1 }}>{emoji}</span>;
  }
  const src = `https://emojicdn.elk.sh/${encodeURIComponent(emoji)}?style=apple`;
  return (
    <img
      src={src}
      alt={emoji}
      className={`ios-emoji-img ${className}`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setImgError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  );
}

/**
 * Format remaining milliseconds into structured countdown display parts (Days, Hours, Minutes, Seconds)
 */
function getCountdownParts(msRemaining) {
  if (msRemaining <= 0) {
    return {
      days: "00",
      hours: "00",
      minutes: "00",
      seconds: "00",
    };
  }
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num) => String(num).padStart(2, "0");

  return {
    days: pad(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
  };
}

/**
 * Individual Interactive Showcase Product Card
 */
function WatchShowcaseCard({ item, isWished, onToggleWishlist, onAddToCart }) {
  const p = useMemo(() => item.product || {}, [item.product]);
  const variants = useMemo(() => (Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : []), [p.variants]);
  
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const activeVariant = variants[selectedVariantIdx] || null;

  // Extract all gallery images for the product / active variant
  const allImages = useMemo(() => {
    const list = [];
    if (activeVariant) {
      if (Array.isArray(activeVariant.images) && activeVariant.images.length > 0) {
        activeVariant.images.forEach((img) => {
          const u = resolveMediaUrl(img.image || img.image_url || img.url || img);
          if (u) list.push(u);
        });
      }
    }
    if (list.length === 0 && item.image) {
      list.push(item.image);
    }
    if (list.length === 0) {
      const u = getProductImageUrl(p);
      if (u) list.push(u);
    }
    return list.length > 0 ? list : [NEUTRAL_PLACEHOLDER];
  }, [activeVariant, item.image, p]);

  const currentImage = allImages[activeImageIdx % allImages.length] || item.image || NEUTRAL_PLACEHOLDER;

  const handlePrevImg = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  };

  const handleNextImg = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  };

  const activeColorName = activeVariant?.color_name || p.color_name || "Silver Blue";

  // Price calculation based on active variant if available
  const variantPrice = activeVariant ? parseFloat(activeVariant.price || 0) : item.sellingPrice;
  const variantDiscPrice = activeVariant && activeVariant.discount_price ? parseFloat(activeVariant.discount_price) : null;
  const sellingPrice = variantDiscPrice && variantDiscPrice > 0 ? variantDiscPrice : variantPrice;
  const originalPrice = variantDiscPrice && variantDiscPrice > 0 && variantPrice > variantDiscPrice ? variantPrice : item.originalPrice;
  const discountPercent = originalPrice && originalPrice > sellingPrice ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : item.discountPercent;

  const rawRating = p.rating ?? p.average_rating ?? p.ratings ?? 0;
  const ratingVal = Number(rawRating) > 0 ? Number(rawRating).toFixed(1) : "0";
  const reviewsCount = Number(p.reviews_count ?? p.total_reviews ?? p.num_reviews ?? 0);

  const productRoute = `/product/${item.slug || item.productId}`;

  return (
    <article className="moxie-promo-card luxury-showcase-card">
      {/* 1. Full-Width Image Area with Interactive Elements */}
      <div className="moxie-card-media-wrap">
        {/* Dynamic Discount / Hot Sale Badge (Top-Left) */}
        <div className="moxie-card-top-badge">
          <IosEmoji emoji="🔥" size={13} />
          <span>{discountPercent > 0 ? `${discountPercent}% OFF` : (item.badgeText || "25% OFF")}</span>
        </div>

        {/* Wishlist Button (Top-Right) */}
        <button
          type="button"
          className={`moxie-card-heart-btn ${isWished ? "active" : ""}`}
          onClick={(e) => onToggleWishlist(e, item)}
          aria-label={isWished ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}
        >
          {isWished ? (
            <FaHeart className="moxie-heart-icon filled" />
          ) : (
            <FiHeart className="moxie-heart-icon" />
          )}
        </button>

        {/* Image Carousel Arrows */}
        {allImages.length > 1 && (
          <>
            <button
              type="button"
              className="moxie-carousel-arrow left"
              onClick={handlePrevImg}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              className="moxie-carousel-arrow right"
              onClick={handleNextImg}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}

        {/* Bottom Pagination Dots */}
        <div className="moxie-carousel-dots">
          {(allImages.length > 1 ? allImages : [1, 2, 3, 4]).slice(0, 4).map((_, dotIdx) => (
            <span
              key={dotIdx}
              className={`moxie-carousel-dot ${dotIdx === (activeImageIdx % 4) ? "active" : ""}`}
            />
          ))}
        </div>

        {/* Bottom-Right Expand Icon Button */}
        <Link to={productRoute} className="moxie-expand-btn" aria-label="Expand product">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9"/>
            <polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        </Link>

        {/* Product Image Link */}
        <Link to={productRoute} className="moxie-card-img-link" aria-label={`View ${item.name} details`}>
          <img
            src={currentImage}
            alt={item.name}
            className="moxie-card-img"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = NEUTRAL_PLACEHOLDER;
            }}
          />
        </Link>
      </div>

      {/* 2. Card Content Details */}
      <div className="moxie-card-body">
        {/* Title & Rating Row */}
        <div className="moxie-card-title-rating-row">
          <div className="moxie-card-title-group">
            <h3 className="moxie-card-title">
              <Link to={productRoute} title={item.name}>
                {item.name}
              </Link>
            </h3>
            <p className="moxie-card-subtitle">
              {p.description ? p.description.slice(0, 36) + (p.description.length > 36 ? "..." : "") : "Premium Chrono Series Watch"}
            </p>
          </div>
          <div className="moxie-card-rating-pill">
            <span className="rating-star">⭐</span>
            <strong className="rating-score">{ratingVal}</strong>
            <span className="rating-count">({reviewsCount})</span>
          </div>
        </div>

        {/* Pricing & Free Shipping Row */}
        <div className="moxie-card-pricing-shipping-row">
          <div className="moxie-card-price-stack">
            <span className="moxie-card-price-current">
              ₹{sellingPrice.toLocaleString("en-IN")}
            </span>
            {originalPrice && (
              <span className="moxie-card-price-original">
                ₹{originalPrice.toLocaleString("en-IN")}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="moxie-discount-pill-tag">
                {discountPercent}% OFF
              </span>
            )}
          </div>
          <div className="moxie-shipping-tag">
            <IosEmoji emoji="🚚" size={13} />
            <span>Free Shipping</span>
          </div>
        </div>

        {/* Offer Ends In Timer Strip */}
        <div className="moxie-offer-ends-strip" aria-label="Offer countdown timer">
          <div className="offer-ends-label">
            <span className="clock-blue-icon">🕒</span>
            <span>Offer ends in</span>
          </div>
          <div className="offer-timer-boxes">
            <div className="offer-time-cell">
              <span className="time-val">{item.countdown.days}</span>
              <span className="time-lbl">DAYS</span>
            </div>
            <div className="offer-time-cell">
              <span className="time-val">{item.countdown.hours}</span>
              <span className="time-lbl">HOURS</span>
            </div>
            <div className="offer-time-cell">
              <span className="time-val">{item.countdown.minutes}</span>
              <span className="time-lbl">MINUTES</span>
            </div>
            <div className="offer-time-cell">
              <span className="time-val">{item.countdown.seconds}</span>
              <span className="time-lbl">SECONDS</span>
            </div>
          </div>
        </div>

        {/* Color Swatches */}
        <div className="moxie-color-qty-row">
          <div className="moxie-color-section">
            <div className="moxie-color-heading">
              Color: <span>{activeColorName}</span>
            </div>
            <div className="moxie-color-swatches-row">
              {variants.length > 0 ? (
                variants.slice(0, 5).map((v, vIdx) => {
                  const isActive = vIdx === selectedVariantIdx;
                  const swatchImg = v.images && v.images[0] ? resolveMediaUrl(v.images[0].image || v.images[0].url || v.images[0]) : null;
                  return (
                    <button
                      key={v.id || vIdx}
                      type="button"
                      className={`moxie-swatch-slot ${isActive ? "active" : ""}`}
                      style={v.color_code ? { backgroundColor: v.color_code } : {}}
                      onClick={() => {
                        setSelectedVariantIdx(vIdx);
                        setActiveImageIdx(0);
                      }}
                      title={v.color_name}
                    >
                      {swatchImg && <img src={swatchImg} alt="" className="swatch-img-mini" />}
                    </button>
                  );
                })
              ) : (
                <>
                  <div className="moxie-swatch-slot active" style={{ backgroundColor: "#2563eb" }} />
                  <div className="moxie-swatch-slot" style={{ backgroundColor: "#0f172a" }} />
                  <div className="moxie-swatch-slot" style={{ backgroundColor: "#d97706" }} />
                  <div className="moxie-swatch-slot" style={{ backgroundColor: "#059669" }} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Add To Cart Full Width Button */}
        <button
          type="button"
          className="moxie-card-cart-btn"
          onClick={(e) => onAddToCart(e, item, activeVariant, 1)}
          aria-label={`Add ${item.name} to Cart`}
        >
          <span className="moxie-cart-btn-content">
            <FiShoppingCart className="moxie-cart-icon" />
            <span>Add to Cart</span>
          </span>
          <span className="moxie-cart-arrow-circle">➔</span>
        </button>

        {/* Trust Badges Strip */}
        <div className="moxie-trust-badges-strip">
          <div className="trust-cell">
            <div className="trust-icon-wrap blue">
              <IosEmoji emoji="🚚" size={13} />
            </div>
            <div className="trust-text">
              <strong>Free Shipping</strong>
              <small>Across India</small>
            </div>
          </div>

          <div className="trust-cell">
            <div className="trust-icon-wrap blue-shield">
              <IosEmoji emoji="🛡️" size={13} />
            </div>
            <div className="trust-text">
              <strong>1 Year Warranty</strong>
              <small>Official Brand</small>
            </div>
          </div>

          <div className="trust-cell">
            <div className="trust-icon-wrap amber">
              <IosEmoji emoji="📦" size={13} />
            </div>
            <div className="trust-text">
              <strong>Easy Returns</strong>
              <small>7 Days</small>
            </div>
          </div>

          <div className="trust-cell">
            <div className="trust-icon-wrap pink">
              <IosEmoji emoji="🎧" size={13} />
            </div>
            <div className="trust-text">
              <strong>24/7 Support</strong>
              <small>We're here to help</small>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function WatchShowcase() {
  const { featuredProducts = [], featuredServerTime, loading = false } = useData() || {};
  const { addToCart } = useContext(CartContext) || {};
  const { toggleWishlist, isInWishlist } = useContext(WishlistContext) || {};
  const toast = useToast();

  // Server time offset calculation (serverTime - clientTime)
  const serverOffsetRef = useRef(0);
  useEffect(() => {
    if (featuredServerTime) {
      const serverMs = new Date(featuredServerTime).getTime();
      if (!isNaN(serverMs)) {
        serverOffsetRef.current = serverMs - Date.now();
      }
    }
  }, [featuredServerTime]);

  // Unified section-level timer tick every 1000ms
  const [nowMs, setNowMs] = useState(() => Date.now() + serverOffsetRef.current);

  useEffect(() => {
    const timerId = setInterval(() => {
      setNowMs(Date.now() + serverOffsetRef.current);
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  // Filter and process active, non-expired featured products directly from backend
  const activeItems = useMemo(() => {
    if (!Array.isArray(featuredProducts) || featuredProducts.length === 0) {
      return [];
    }

    return featuredProducts
      .filter((item) => {
        if (!item || !item.product || item.is_active === false) return false;
        if (item.product.is_active === false) return false;

        // Check start date (if scheduled in future, hide)
        if (item.start_date) {
          const startMs = new Date(item.start_date).getTime();
          if (!isNaN(startMs) && startMs > nowMs) {
            return false;
          }
        }

        // Check end date (if expired, auto hide)
        if (item.end_date) {
          const endMs = new Date(item.end_date).getTime();
          if (!isNaN(endMs) && endMs <= nowMs) {
            return false;
          }
        }

        return true;
      })
      .map((item) => {
        const p = item.product;
        const originalPrice = parseFloat(p.price || 0);
        const discountPrice =
          p.discount_price !== null && p.discount_price !== undefined
            ? parseFloat(p.discount_price)
            : null;

        // Effective selling price
        const sellingPrice =
          discountPrice !== null && !isNaN(discountPrice) && discountPrice > 0
            ? discountPrice
            : originalPrice;

        // Discount percentage calculation: ((originalPrice - discountPrice) / originalPrice) * 100
        let discountPercent = 0;
        if (discountPrice !== null && !isNaN(discountPrice) && originalPrice > discountPrice) {
          discountPercent = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
        }

        // Image priority: showcase_image -> display_image -> getProductImageUrl(p)
        const displayImage =
          resolveMediaUrl(item.showcase_image) ||
          resolveMediaUrl(item.display_image) ||
          getProductImageUrl(p);

        // Countdown calculations based on backend end_date (or default 24h cycle if none)
        let countdown = { days: "00", hours: "23", minutes: "58", seconds: "57" };
        if (item.end_date) {
          const endMs = new Date(item.end_date).getTime();
          if (!isNaN(endMs)) {
            const msRemaining = endMs - nowMs;
            countdown = getCountdownParts(msRemaining);
          }
        }

        return {
          id: item.id,
          product: p,
          productId: p.id,
          slug: p.slug || String(p.id),
          name: p.name,
          badgeText: item.badge_text || "",
          sellingPrice,
          originalPrice: discountPercent > 0 ? originalPrice : null,
          discountPercent,
          image: displayImage,
          countdown,
        };
      });
  }, [featuredProducts, nowMs]);

  const handleWishlistClick = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (toggleWishlist && item.product) {
      toggleWishlist(item.product);
      const isWished = isInWishlist ? isInWishlist(item.product.id) : false;
      if (toast) toast(isWished ? "Removed from wishlist" : "Saved to wishlist");
    }
  };

  const handleAddToCartClick = (e, item, activeVariant, selectedQty = 1) => {
    e.preventDefault();
    e.stopPropagation();
    if (addToCart && item.product) {
      const defaultVariant =
        activeVariant ||
        (Array.isArray(item.product.variants) && item.product.variants.length > 0
          ? item.product.variants[0]
          : null);

      addToCart(
        {
          ...item.product,
          price: item.sellingPrice,
          original_price: item.originalPrice,
          selectedVariant: defaultVariant,
          variant_id: defaultVariant?.id || item.product.variant_id,
        },
        selectedQty
      );
      if (toast) toast(`${item.name} (${selectedQty}) added to cart`);
    }
  };

  // Loading skeleton state
  if (loading && (!featuredProducts || featuredProducts.length === 0)) {
    return (
      <section className="moxie-featured-picks-section" aria-label="Limited Time Picks Loading">
        <div className="moxie-featured-picks-container">
          <header className="moxie-picks-header">
            <span className="moxie-picks-pill">
              <span className="emoji moxie-picks-crown">👑</span> LIMITED MOXIE EDIT
            </span>
            <h2 className="moxie-picks-title">Limited Time Picks</h2>
            <p className="moxie-picks-subtitle">
              Few pieces. Exclusive prices. Available for a limited time.
            </p>
          </header>
          <div className="moxie-picks-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="moxie-promo-card skeleton-card" aria-hidden="true">
                <div className="skeleton-img" />
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-price" />
                <div className="skeleton-line skeleton-timer" />
                <div className="skeleton-line skeleton-btn" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // If no active featured products, hide the entire section
  if (!activeItems || activeItems.length === 0) {
    return null;
  }

  return (
    <section className="moxie-featured-picks-section" id="limited-time-picks" aria-label="Limited Time Featured Products">
      <div className="moxie-featured-picks-container">
        {/* Section Header */}
        <header className="moxie-picks-header">
          <span className="moxie-picks-pill">
            <span className="emoji moxie-picks-crown">👑</span> LIMITED MOXIE EDIT
          </span>
          <h2 className="moxie-picks-title">Limited Time Picks</h2>
          <p className="moxie-picks-subtitle">
            Few pieces. Exclusive prices. Available for a limited time.
          </p>
        </header>

        {/* Modern Luxury Showcase Card Grid */}
        <div className="moxie-picks-grid">
          {activeItems.map((item) => {
            const isWished = isInWishlist ? isInWishlist(item.productId) : false;
            return (
              <WatchShowcaseCard
                key={item.id}
                item={item}
                isWished={isWished}
                onToggleWishlist={handleWishlistClick}
                onAddToCart={handleAddToCartClick}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

