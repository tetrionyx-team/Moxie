import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../context/DataContext";
import ProductShelf from "../../components/Product/ProductShelf";
import "./Deals.css";

/**
 * Live Countdown timer component tied to actual backend end_date timestamp
 */
function LiveCountdown({ targetEndMs, nowMs }) {
  const msRemaining = Math.max(0, targetEndMs - nowMs);
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="countdown">
      <span>{pad(hours)}</span>:
      <span>{pad(minutes)}</span>:
      <span>{pad(seconds)}</span>
    </div>
  );
}

export default function Deals() {
  const {
    featuredProducts = [],
    featuredServerTime,
    loading = false,
    currentOffer,
  } = useData() || {};

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

  // Section-level timer tick every 1000ms
  const [nowMs, setNowMs] = useState(() => Date.now() + serverOffsetRef.current);

  useEffect(() => {
    const timerId = setInterval(() => {
      setNowMs(Date.now() + serverOffsetRef.current);
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  // Filter ONLY active, non-expired HOT_SALE Featured Products directly from backend
  const hotSaleItems = useMemo(() => {
    if (!Array.isArray(featuredProducts) || featuredProducts.length === 0) {
      return [];
    }

    return featuredProducts.filter((item) => {
      if (!item || !item.product) return false;
      if (item.feature_type !== "HOT_SALE") return false;
      if (item.is_active === false || item.product.is_active === false) return false;

      // Check start date (if scheduled in future, do not show yet)
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
    });
  }, [featuredProducts, nowMs]);

  // While loading and featuredProducts is empty, do not render fake deals
  if (loading && (!featuredProducts || featuredProducts.length === 0)) {
    return null;
  }

  // ZERO HOT SALE PRODUCTS = RENDER NOTHING (Hide entire section completely)
  if (!hotSaleItems || hotSaleItems.length === 0) {
    return null;
  }

  // Transform active Hot Sale items into ProductCard compatible products
  const hotSaleProducts = hotSaleItems.map((item) => {
    const p = item.product;
    const origPrice = parseFloat(p.price || 0);
    const discPrice =
      p.discount_price !== null && p.discount_price !== undefined
        ? parseFloat(p.discount_price)
        : null;

    let discountVal = p.discount || 0;
    if (discPrice !== null && !isNaN(discPrice) && origPrice > discPrice) {
      discountVal = Math.round(((origPrice - discPrice) / origPrice) * 100);
    }

    return {
      ...p,
      image: item.showcase_image || item.display_image || p.image,
      badge: item.badge_text || "HOT SALE",
      discount: discountVal,
    };
  });

  // Calculate earliest end_date for live countdown
  const itemsWithEndDates = hotSaleItems
    .map((item) => (item.end_date ? new Date(item.end_date).getTime() : null))
    .filter((ms) => ms !== null && !isNaN(ms) && ms > nowMs);

  const earliestEndMs = itemsWithEndDates.length > 0 ? Math.min(...itemsWithEndDates) : null;

  return (
    <main>
      <section className="deals-hero">
        <div className="page-shell">
          <div>
            <span className="eyebrow">{currentOffer ? "Active Promotion" : "Moxie mega sale"}</span>
            <h1>
              Big style.
              <br />
              <em>Smaller prices.</em>
            </h1>
            <p>{currentOffer?.offer_text || "Limited-time savings on everyday essentials."}</p>
            <Link to="/products">Shop every deal →</Link>
          </div>
          {earliestEndMs && (
            <div className="flash-card">
              <span>FLASH DEAL ENDS IN</span>
              <LiveCountdown targetEndMs={earliestEndMs} nowMs={nowMs} />
              <strong>
                {currentOffer
                  ? currentOffer.discount_type === "Percentage"
                    ? "Special % Savings"
                    : "Special Discounts"
                  : "Hot Sale Exclusive"}
              </strong>
            </div>
          )}
        </div>
      </section>
      <ProductShelf
        eyebrow="Hurry, selling fast"
        title="Flash Deals"
        products={hotSaleProducts}
      />
    </main>
  );
}
