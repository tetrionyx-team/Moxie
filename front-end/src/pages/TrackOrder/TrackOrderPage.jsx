import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  LuSearch,
  LuPackage,
  LuTruck,
  LuArrowRight,
  LuCircleCheck,
} from "react-icons/lu";
import "./TrackOrderPage.css";

export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryOrder =
    searchParams.get("tracking") ||
    searchParams.get("tracking_number") ||
    searchParams.get("trackingNumber") ||
    searchParams.get("tracking_id") ||
    searchParams.get("trackingId") ||
    searchParams.get("order") ||
    searchParams.get("order_id") ||
    searchParams.get("orderId") ||
    searchParams.get("awb") ||
    searchParams.get("id") ||
    searchParams.get("q") ||
    "";

  const [trackingCode, setTrackingCode] = useState(queryOrder);
  const [courierService, setCourierService] = useState(searchParams.get("courier") || "ALL");
  const [errorMsg, setErrorMsg] = useState("");

  // Sync and auto-navigate if URL query param is present on direct access
  useEffect(() => {
    if (queryOrder) {
      const clean = queryOrder.trim();
      if (clean) {
        const encodedId = encodeURIComponent(clean);
        const courierParam = courierService !== "ALL" ? `?courier=${courierService}` : "";
        navigate(`/track-order/live/${encodedId}${courierParam}`, { replace: true });
      }
    }
  }, [queryOrder, courierService, navigate]);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    const clean = trackingCode.trim();
    if (!clean) {
      setErrorMsg("Please enter your Order ID, ST Courier AWB, or India Post Consignment Number.");
      return;
    }
    setErrorMsg("");

    // Navigate to Page 3: Live Tracking Detail Page
    const encodedId = encodeURIComponent(clean);
    const courierParam = courierService !== "ALL" ? `?courier=${courierService}` : "";
    navigate(`/track-order/live/${encodedId}${courierParam}`);
  };

  return (
    <div className="moxie-track-search-page">
      {/* 1. Dark Navy Luxury Hero Section */}
      <section className="track-hero-section">
        <div className="track-hero-inner">
          <div className="track-hero-content">
            <span className="hero-gold-badge">✧ MOXIE DELIVERY</span>
            <h1 className="hero-main-title">Track Your Order</h1>
            <p className="hero-subtitle">
              From our store to your doorstep — follow every step of your MOXIE order.
            </p>
          </div>

          <div className="track-hero-box-visual" aria-hidden="true">
            <div className="luxury-box-card">
              <span className="box-brand-logo">MOXIE</span>
              <span className="box-tagline">WEAR YOUR MOOD</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Overlapping Centered Search Card */}
      <div className="track-search-container">
        <div className="track-search-card">
          <div className="search-card-header">
            <h2 className="search-card-title">Find Your Shipment</h2>
            <p className="search-card-sub">
              Enter your Order ID, ST Courier AWB, or India Post Consignment Number
            </p>
          </div>

          <form onSubmit={handleTrackSubmit} className="track-search-form">
            <div className="search-input-wrapper">
              <LuSearch className="search-input-icon" />
              <input
                type="text"
                className="search-text-input"
                placeholder="Enter Order ID (MOX-0004), ST Courier AWB, or India Post Consignment Number"
                value={trackingCode}
                onChange={(e) => {
                  setTrackingCode(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                aria-label="Order ID or Tracking Number"
              />
            </div>

            {errorMsg && <p className="track-input-error">{errorMsg}</p>}

            <button type="submit" className="btn-track-submit">
              <span>Track Order</span>
              <LuArrowRight className="btn-arrow-icon" />
            </button>
          </form>

          {/* Courier Partner Filter Selector */}
          <div className="courier-select-row">
            <span className="courier-select-label">Courier Service</span>
            <div className="courier-pills-wrap">
              {[
                { id: "ALL", label: "Auto Detect" },
                { id: "ST_COURIER", label: "ST Courier" },
                { id: "INDIA_POST", label: "India Post" },
              ].map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={`courier-pill-btn ${
                    courierService === c.id ? "active" : ""
                  }`}
                  onClick={() => setCourierService(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. How It Works - 3 Process Cards */}
        <section className="track-how-it-works">
          <div className="section-divider-title">
            <span className="divider-line" />
            <span className="divider-text">How It Works</span>
            <span className="divider-line" />
          </div>

          <div className="process-cards-grid">
            <div className="process-card">
              <div className="process-icon-circle">
                <LuPackage size={26} />
              </div>
              <h3 className="process-card-title">Order Confirmed</h3>
              <p className="process-card-desc">
                Once your order is confirmed, you can track its preparation.
              </p>
            </div>

            <div className="process-card">
              <div className="process-icon-circle">
                <LuTruck size={26} />
              </div>
              <h3 className="process-card-title">Shipped</h3>
              <p className="process-card-desc">
                Your courier and tracking number appear after dispatch.
              </p>
            </div>

            <div className="process-card">
              <div className="process-icon-circle">
                <LuCircleCheck size={26} />
              </div>
              <h3 className="process-card-title">Delivered</h3>
              <p className="process-card-desc">
                Follow your shipment until it safely reaches you.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Luxury Bottom Feature Banner */}
        <div className="more-than-package-banner">
          <div className="banner-left-copy">
            <h3 className="package-banner-title">More Than A Package</h3>
            <p className="package-banner-sub">It's a feeling on the way.</p>
            <span className="moxie-signature-font">Moxie</span>
          </div>

          <div className="banner-box-render" aria-hidden="true">
            <div className="banner-3d-box">
              <span className="banner-box-logo">MOXIE</span>
              <span className="banner-box-sub">WEAR YOUR MOOD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
