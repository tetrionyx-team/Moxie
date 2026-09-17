import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../context/DataContext";
import "./WatchShowcase.css";

// Project fallback image
import placeholderImg from "../../assets/images/offer.png";

/**
 * Format remaining milliseconds into structured countdown display parts
 */
function getCountdownParts(msRemaining) {
  if (msRemaining <= 0) {
    return null;
  }
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num) => String(num).padStart(2, "0");
  const isEndsSoon = totalSeconds <= 6 * 3600; // Under 6 hours

  return {
    days: pad(days),
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
    totalDays: days,
    isEndsSoon,
  };
}

export default function WatchShowcase() {
  const { featuredProducts = [], featuredServerTime, loading = false } = useData() || {};

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

        // Image priority: showcase_image -> display_image -> product.image -> fallback
        const displayImage =
          item.showcase_image ||
          item.display_image ||
          p.image ||
          placeholderImg;

        // Feature badge text
        let defaultBadge = "";
        let badgeIcon = "";
        if (item.feature_type === "HOT_SALE") {
          defaultBadge = "HOT SALE";
          badgeIcon = "🔥 ";
        } else if (item.feature_type === "TRENDING") {
          defaultBadge = "TRENDING";
          badgeIcon = "⚡ ";
        } else if (item.feature_type === "OFFER") {
          defaultBadge = "LIMITED OFFER";
          badgeIcon = "🏷 ";
        }

        const rawBadgeText = item.badge_text ? item.badge_text.trim() : defaultBadge;
        const badgeWithIcon = rawBadgeText.startsWith("🔥") || rawBadgeText.startsWith("⚡") || rawBadgeText.startsWith("🏷")
          ? rawBadgeText
          : `${badgeIcon}${rawBadgeText}`;

        // Countdown calculations based on backend end_date
        let countdown = null;
        if (item.end_date) {
          const endMs = new Date(item.end_date).getTime();
          if (!isNaN(endMs)) {
            const msRemaining = endMs - nowMs;
            countdown = getCountdownParts(msRemaining);
          }
        }

        return {
          id: item.id,
          productId: p.id,
          slug: p.slug || String(p.id),
          name: p.name,
          sellingPrice,
          originalPrice: discountPercent > 0 ? originalPrice : null,
          discountPercent,
          image: displayImage,
          badgeText: rawBadgeText,
          badgeWithIcon,
          featureType: item.feature_type || "OFFER",
          countdown,
          hasEndDate: Boolean(item.end_date),
        };
      });
  }, [featuredProducts, nowMs]);

  // Loading skeleton state
  if (loading && (!featuredProducts || featuredProducts.length === 0)) {
    return (
      <section className="moxie-featured-picks-section" aria-label="Limited Time Picks Loading">
        <div className="moxie-featured-picks-container">
          <header className="moxie-picks-header">
            <span className="moxie-picks-pill">LIMITED MOXIE EDIT</span>
            <h2 className="moxie-picks-title">Limited Time Picks</h2>
            <p className="moxie-picks-subtitle">
              Few pieces. Exclusive prices. Available for a limited time.
            </p>
          </header>
          <div className="moxie-picks-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="moxie-promo-item skeleton-item" aria-hidden="true">
                <div className="moxie-promo-stage skeleton-box" />
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-price" />
                <div className="skeleton-line skeleton-timer" />
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
          <span className="moxie-picks-pill">LIMITED MOXIE EDIT</span>
          <h2 className="moxie-picks-title">Limited Time Picks</h2>
          <p className="moxie-picks-subtitle">
            Few pieces. Exclusive prices. Available for a limited time.
          </p>
        </header>

        {/* Floating Promotional Showcase Grid (No Big Outer Box / Card) */}
        <div className={`moxie-picks-grid count-${Math.min(activeItems.length, 4)}`}>
          {activeItems.map((item) => {
            const productRoute = `/product/${item.slug || item.productId}`;

            return (
              <Link
                key={item.id}
                to={productRoute}
                className="moxie-promo-item"
                aria-label={`View ${item.name} details`}
              >
                {/* Top Floating Badges Row (Feature Badge on Left, Discount Pill on Right) */}
                <div className="moxie-promo-badges">
                  {item.badgeText && (
                    <span className={`moxie-promo-badge feature-badge ${item.featureType.toLowerCase()}`}>
                      {item.badgeWithIcon}
                    </span>
                  )}
                  {item.discountPercent > 0 && (
                    <span className="moxie-promo-badge discount-badge">
                      {item.discountPercent}% OFF
                    </span>
                  )}
                </div>

                {/* Subtle Luxury Floating Stage with Soft Glow & Pedestal */}
                <div className="moxie-promo-stage">
                  {/* Decorative Sparkle Stars */}
                  <span className="moxie-stage-sparkle sparkle-top-left" aria-hidden="true">✦</span>
                  <span className="moxie-stage-sparkle sparkle-mid-left" aria-hidden="true">✦</span>
                  <span className="moxie-stage-sparkle sparkle-top-right" aria-hidden="true">✦</span>
                  <span className="moxie-stage-sparkle sparkle-mid-right" aria-hidden="true">✦</span>

                  {/* Centered Product Image */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="moxie-promo-img"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = placeholderImg;
                    }}
                  />

                  {/* 3D Gold Luxury Stage Pedestal Disc Base */}
                  <div className="moxie-promo-pedestal" aria-hidden="true">
                    <div className="pedestal-top-disc" />
                    <div className="pedestal-rim-glow" />
                  </div>
                </div>

                {/* Product Name */}
                <h3 className="moxie-promo-name" title={item.name}>
                  {item.name}
                </h3>

                {/* Pricing: Selling Price Large & Bold, Original Price Struck-through */}
                <div className="moxie-promo-pricing">
                  <span className="moxie-promo-price-current">
                    ₹{item.sellingPrice.toLocaleString("en-IN")}
                  </span>
                  {item.originalPrice && (
                    <span className="moxie-promo-price-original">
                      ₹{item.originalPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>

                {/* Premium Live Countdown Box */}
                {item.hasEndDate && item.countdown && (
                  <div className={`moxie-promo-countdown-box ${item.countdown.isEndsSoon ? "ends-soon" : ""}`}>
                    <div className="moxie-countdown-header">
                      <span className="countdown-decor-line" />
                      <span className="countdown-hourglass-icon">⏳</span>
                      <span className="countdown-header-title">
                        {item.countdown.isEndsSoon ? "ENDING SOON" : "OFFER ENDS IN"}
                      </span>
                      <span className="countdown-hourglass-icon">⏳</span>
                      <span className="countdown-decor-line" />
                    </div>

                    <div className="moxie-countdown-cells">
                      {item.countdown.totalDays > 0 && (
                        <>
                          <div className="countdown-cell">
                            <span className="countdown-digit">{item.countdown.days}</span>
                            <span className="countdown-label">DAYS</span>
                          </div>
                          <span className="countdown-colon">:</span>
                        </>
                      )}
                      <div className="countdown-cell">
                        <span className="countdown-digit">{item.countdown.hours}</span>
                        <span className="countdown-label">HOURS</span>
                      </div>
                      <span className="countdown-colon">:</span>
                      <div className="countdown-cell">
                        <span className="countdown-digit">{item.countdown.minutes}</span>
                        <span className="countdown-label">MINUTES</span>
                      </div>
                      <span className="countdown-colon">:</span>
                      <div className="countdown-cell">
                        <span className="countdown-digit">{item.countdown.seconds}</span>
                        <span className="countdown-label">SECONDS</span>
                      </div>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
