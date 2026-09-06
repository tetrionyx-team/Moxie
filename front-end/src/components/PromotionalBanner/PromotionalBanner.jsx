import React from "react";
import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import "./PromotionalBanner.css";

// Exact 3 Banner Images
import banner1 from "../../assets/images/banners/banner_lamborghini.jpeg";
import banner2 from "../../assets/images/banners/banner_gshock.jpg";
import banner3 from "../../assets/images/banners/banner_thar.jpg";

export default function PromotionalBanner() {
  return (
    <section className="moxie-banner-stack" aria-label="Featured Story Banners">
      {/* BANNER 1 */}
      <article
        className="moxie-sticky-banner banner-one"
        aria-label="Tonino Lamborghini Luxury Chronograph Watch"
      >
        <img
          src={banner1}
          alt="Tonino Lamborghini Luxury Chronograph Watch"
          loading="eager"
        />
        <div className="banner-overlay" />
        <div className="banner-content">
          <Link
            to="/products/watches"
            className="banner-shop-btn"
            aria-label="Shop Now - Tonino Lamborghini Luxury Chronograph Watch"
          >
            <span>Shop Now</span>
            <FiArrowRight className="banner-btn-icon" aria-hidden="true" />
          </Link>
        </div>
      </article>

      {/* BANNER 2 */}
      <article
        className="moxie-sticky-banner banner-two"
        aria-label="Casio G-SHOCK GA-2100 Series Watch"
      >
        <img
          src={banner2}
          alt="Casio G-SHOCK GA-2100 Series Watch"
          loading="eager"
        />
        <div className="banner-overlay" />
        <div className="banner-content">
          <Link
            to="/products/watches"
            className="banner-shop-btn"
            aria-label="Shop Now - Casio G-SHOCK GA-2100 Series Watch"
          >
            <span>Shop Now</span>
            <FiArrowRight className="banner-btn-icon" aria-hidden="true" />
          </Link>
        </div>
      </article>

      {/* BANNER 3 */}
      <article
        className="moxie-sticky-banner banner-three"
        aria-label="Mahindra Thar Die-Cast Metal Model 1:18 Scale"
      >
        <img
          src={banner3}
          alt="Mahindra Thar Die-Cast Metal Model 1:18 Scale"
          loading="eager"
        />
        <div className="banner-overlay" />
        <div className="banner-content">
          <Link
            to="/products"
            className="banner-shop-btn"
            aria-label="Shop Now - Mahindra Thar Die-Cast Metal Model 1:18 Scale"
          >
            <span>Shop Now</span>
            <FiArrowRight className="banner-btn-icon" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </section>
  );
}






