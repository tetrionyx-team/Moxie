import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { AppIcon, HomeIcon, ArrowLeftIcon } from "../../icons";
import fallbackLogo from "../../assets/logo/moxie.png";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { storeSettings } = useData() || {};

  const storeName = storeSettings?.store_name || storeSettings?.storeName || "Moxie";
  const storeLogo = storeSettings?.store_logo || storeSettings?.storeLogo || null;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <main className="moxie-notfound-page" role="main" aria-label="Page Not Found">
      {/* Decorative Watch Dial Background Rings */}
      <div className="notfound-dial-bg" aria-hidden="true">
        <div className="notfound-outer-ring" />
        <div className="notfound-inner-ring" />
      </div>

      <div className="moxie-notfound-content">
        {/* Brand Logo Header */}
        <div className="notfound-brand-box">
          <Link to="/" title={`Back to ${storeName} Home`}>
            {storeLogo ? (
              <img
                src={storeLogo}
                alt={storeName}
                className="notfound-store-logo"
              />
            ) : (
              <img
                src={fallbackLogo}
                alt={storeName}
                className="notfound-store-logo"
              />
            )}
          </Link>
        </div>

        {/* Status Pill Badge */}
        <div className="notfound-status-badge">
          <span>ERROR 404</span>
        </div>

        {/* 404 Display with Watch Motif Element */}
        <div className="notfound-hero-wrap">
          <div className="notfound-number-badge">
            <span className="digit">4</span>
            {/* CSS-Only Watch / Clockwork Motif */}
            <div className="notfound-clock-watch" aria-hidden="true" title="Clock Dial">
              <div className="clock-bezel">
                <div className="clock-dial-marks">
                  <span className="mark mark-12" />
                  <span className="mark mark-3" />
                  <span className="mark mark-6" />
                  <span className="mark mark-9" />
                </div>
                <div className="clock-center-dot" />
                <div className="clock-hand-hour" />
                <div className="clock-hand-minute" />
              </div>
            </div>
            <span className="digit">4</span>
          </div>
        </div>

        {/* Main Title & Message */}
        <h1 className="notfound-title">Page Not Found</h1>

        <p className="notfound-subtitle">
          Looks like this page took a wrong turn.
        </p>

        <p className="notfound-description">
          The page you are looking for may have been moved, removed, or does not exist.
        </p>

        {/* Interactive Action Buttons */}
        <div className="notfound-actions">
          <Link to="/" className="notfound-btn-primary">
            <AppIcon icon={HomeIcon} size={18} color="#ffffff" strokeWidth={2} />
            <span>Go to Home</span>
          </Link>

          <button
            type="button"
            onClick={handleGoBack}
            className="notfound-btn-secondary"
            aria-label="Go back to previous page"
          >
            <AppIcon icon={ArrowLeftIcon} size={18} color="#475569" strokeWidth={2} />
            <span>Go Back</span>
          </button>
        </div>

        {/* Subtle Brand Tagline */}
        <div className="notfound-footer-tagline">
          <div className="notfound-accent-bar" />
          <p>{storeName} Lifestyle &amp; Timepieces</p>
        </div>
      </div>
    </main>
  );
}
