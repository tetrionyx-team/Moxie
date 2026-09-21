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
        let countdown = { days: "02", hours: "23", minutes: "15", seconds: "30" };
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

  const handleAddToCartClick = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (addToCart && item.product) {
      const defaultVariant =
        Array.isArray(item.product.variants) && item.product.variants.length > 0
          ? item.product.variants[0]
          : null;

      addToCart(
        {
          ...item.product,
          price: item.sellingPrice,
          original_price: item.originalPrice,
          selectedVariant: defaultVariant,
          variant_id: defaultVariant?.id || item.product.variant_id,
        },
        1
      );
      if (toast) toast(`${item.name} added to cart`);
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
    <section className="moxie-featured-picks-section" aria-label="Limited Time Featured Products">
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

        {/* Minimal Modern White Card Grid (3 Columns Desktop) */}
        <div className="moxie-picks-grid">
          {activeItems.map((item) => {
            const productRoute = `/product/${item.slug || item.productId}`;
            const isWished = isInWishlist ? isInWishlist(item.productId) : false;

            return (
              <article key={item.id} className="moxie-promo-card">
                {/* Full-Width Image Area with Overlaid Badges */}
                <div className="moxie-card-media-wrap">
                  {/* Dynamic Discount Badge (Top-Left) */}
                  {item.discountPercent > 0 ? (
                    <span className="moxie-card-discount-badge">
                      {item.discountPercent}% OFF
                    </span>
                  ) : (
                    <span className="moxie-card-discount-badge">SPECIAL</span>
                  )}

                  {/* Wishlist Button (Top-Right) */}
                  <button
                    type="button"
                    className={`moxie-card-heart-btn ${isWished ? "active" : ""}`}
                    onClick={(e) => handleWishlistClick(e, item)}
                    aria-label={isWished ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}
                  >
                    {isWished ? (
                      <FaHeart className="moxie-heart-icon filled" />
                    ) : (
                      <FiHeart className="moxie-heart-icon" />
                    )}
                  </button>

                  {/* Product Image Clickable Link */}
                  <Link
                    to={productRoute}
                    className="moxie-card-img-link"
                    aria-label={`View ${item.name} details`}
                  >
                    <img
                      src={item.image}
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

                {/* Card Content Details */}
                <div className="moxie-card-body">
                  {/* Product Title */}
                  <h3 className="moxie-card-title">
                    <Link to={productRoute} title={item.name}>
                      {item.name}
                    </Link>
                  </h3>

                  {/* Pricing */}
                  <div className="moxie-card-pricing">
                    <span className="moxie-card-price-current">
                      ₹{item.sellingPrice.toLocaleString("en-IN")}
                    </span>
                    {item.originalPrice && (
                      <span className="moxie-card-price-original">
                        ₹{item.originalPrice.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>

                  {/* 4-Box Minimal Countdown */}
                  <div className="moxie-card-countdown" aria-label="Offer countdown timer">
                    <div className="moxie-countdown-box">
                      <span className="moxie-countdown-num">{item.countdown.days}</span>
                      <span className="moxie-countdown-lbl">DAYS</span>
                    </div>
                    <div className="moxie-countdown-box">
                      <span className="moxie-countdown-num">{item.countdown.hours}</span>
                      <span className="moxie-countdown-lbl">HOURS</span>
                    </div>
                    <div className="moxie-countdown-box">
                      <span className="moxie-countdown-num">{item.countdown.minutes}</span>
                      <span className="moxie-countdown-lbl">MINUTES</span>
                    </div>
                    <div className="moxie-countdown-box">
                      <span className="moxie-countdown-num">{item.countdown.seconds}</span>
                      <span className="moxie-countdown-lbl">SECONDS</span>
                    </div>
                  </div>

                  {/* Full-Width Add To Cart Button */}
                  <button
                    type="button"
                    className="moxie-card-cart-btn"
                    onClick={(e) => handleAddToCartClick(e, item)}
                    aria-label={`Add ${item.name} to Cart`}
                  >
                    <FiShoppingCart className="moxie-cart-icon" />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

