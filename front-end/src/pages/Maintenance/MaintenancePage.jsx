import React from "react";
import { AppIcon, SettingsIcon, ShoppingBagIcon, HeartIcon } from "../../icons";
import fallbackLogo from "../../assets/logo/moxie.png";
import "./MaintenancePage.css";

export default function MaintenancePage({ settings = {} }) {
  const storeName = settings.store_name || settings.storeName || "Moxie";
  const storeLogo = settings.store_logo || settings.storeLogo || null;

  return (
    <main className="moxie-maintenance-page" role="main" aria-label={`${storeName} Under Maintenance`}>
      {/* Decorative Watch Dial Accent in Background */}
      <div className="maintenance-watch-dial-bg" aria-hidden="true">
        <div className="dial-outer-ring" />
        <div className="dial-inner-ring" />
      </div>

      <div className="moxie-maintenance-content">
        {/* Brand Logo */}
        <div className="maintenance-brand-box">
          {storeLogo ? (
            <img
              src={storeLogo}
              alt={storeName}
              className="maintenance-store-logo"
            />
          ) : (
            <img
              src={fallbackLogo}
              alt={storeName}
              className="maintenance-store-logo"
            />
          )}
        </div>

        {/* Status Badge */}
        <div className="maintenance-status-badge">
          <span>OUR STORE IS CURRENTLY</span>
        </div>

        {/* Main Heading */}
        <h1 className="maintenance-main-title">
          <span className="title-lead">Under</span>
          <span className="title-accent">Maintenance</span>
        </h1>

        {/* Description */}
        <p className="maintenance-description">
          We&apos;re currently working behind the scenes to improve your shopping experience at {storeName}.
          We&apos;ll be back soon with a better, faster, and more stylish experience.
        </p>

        {/* Feature Highlights Grid */}
        <div className="maintenance-features-grid">
          <div className="maintenance-feature-card">
            <div className="feature-icon-wrapper">
              <AppIcon icon={SettingsIcon} size={24} color="#7c3aed" strokeWidth={1.75} />
            </div>
            <span className="feature-card-label">Better Performance</span>
          </div>

          <div className="maintenance-feature-card">
            <div className="feature-icon-wrapper">
              <AppIcon icon={ShoppingBagIcon} size={24} color="#7c3aed" strokeWidth={1.75} />
            </div>
            <span className="feature-card-label">More Amazing Products</span>
          </div>

          <div className="maintenance-feature-card">
            <div className="feature-icon-wrapper">
              <AppIcon icon={HeartIcon} size={24} color="#7c3aed" strokeWidth={1.75} />
            </div>
            <span className="feature-card-label">A Smoother Shopping Experience</span>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="maintenance-footer-notice">
          <div className="notice-accent-line" />
          <p className="notice-primary-text">PLEASE CHECK BACK SHORTLY.</p>
          <p className="notice-secondary-tagline">Good things take time.</p>
        </div>
      </div>
    </main>
  );
}
