import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { FiMapPin, FiPhone, FiMail, FiClock, FiArrowUp } from "react-icons/fi";
import MoxieLogo from "../../assets/logo/moxie.png";
import ContactModal from "../contact/ContactModal";
import "./Footer.css";

export default function Footer() {
  const [contactOpen, setContactOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <footer className="moxie-footer" role="contentinfo">
      {/* Subtle Background Watermark */}
      <div className="footer-watermark" aria-hidden="true">
        M
      </div>

      <div className="footer-container">
        {/* Main 4-Column Grid */}
        <div className="footer-grid">
          {/* COLUMN 1 — MOXIE BRAND */}
          <div className="footer-column brand-column">
            <Link to="/" className="footer-logo-link" aria-label="Moxie Home">
              <img
                src={MoxieLogo}
                alt="Moxie Logo"
                className="footer-logo-img"
                width="160"
                height="50"
              />
            </Link>

            <div className="footer-tagline-wrap">
              <span className="footer-tagline">SMARTER CHOICES, BETTER LIFE</span>
              <div className="tagline-accent-line" aria-hidden="true" />
            </div>

            <p className="brand-description">
              Elevate your daily style with Moxie’s premium collection of watches, shoes, caps, and comfort-focused gear.
            </p>

            <div className="social-links-row" aria-label="Social Media Links">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="Facebook"
              >
                <FaFacebookF />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="Instagram"
              >
                <FaInstagram />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="X / Twitter"
              >
                <FaXTwitter />
              </a>
            </div>
          </div>

          {/* COLUMN 2 — CATEGORIES */}
          <div className="footer-column nav-column">
            <div className="column-heading-wrap">
              <h3 className="column-heading">Categories</h3>
              <div className="heading-gold-line" aria-hidden="true" />
            </div>
            <nav aria-label="Categories navigation">
              <ul className="footer-nav-list">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/products/watches">Watches</Link></li>
                <li><Link to="/products/shoes">Shoes</Link></li>
                <li><Link to="/products/air-buds">Air Buds</Link></li>
                <li><Link to="/products/sliders">Sliders</Link></li>
                <li><Link to="/products/caps">Caps</Link></li>
                <li><Link to="/products/accessories">Accessories</Link></li>
                <li><Link to="/deals">Deals</Link></li>
              </ul>
            </nav>
          </div>

          {/* COLUMN 3 — SERVICE */}
          <div className="footer-column nav-column">
            <div className="column-heading-wrap">
              <h3 className="column-heading">Service</h3>
              <div className="heading-gold-line" aria-hidden="true" />
            </div>
            <nav aria-label="Customer service navigation">
              <ul className="footer-nav-list">
                <li><Link to="/">Refund / Collection</Link></li>
                <li><Link to="/">Privacy Policy</Link></li>
                <li><Link to="/">Terms and Conditions</Link></li>
                <li>
                  <button
                    type="button"
                    className="footer-nav-btn"
                    onClick={() => setContactOpen(true)}
                    aria-label="Open Contact Us modal"
                  >
                    Contact
                  </button>
                </li>
                <li><Link to="/profile">Tracking</Link></li>
              </ul>
            </nav>
          </div>

          {/* COLUMN 4 — CONTACT US */}
          <div className="footer-column contact-column">
            <div className="column-heading-wrap">
              <h3 className="column-heading">Contact Us</h3>
              <div className="heading-gold-line" aria-hidden="true" />
            </div>

            <div className="contact-items-list">
              {/* 1. Address */}
              <div className="contact-item">
                <div className="contact-icon-circle" aria-hidden="true">
                  <FiMapPin />
                </div>
                <div className="contact-text">
                  <address className="contact-value not-italic">
                    3/185, Savariyar Temple South Street,<br />
                    Kulasekaranpattinam,<br />
                    Thoothukudi (DT) - 628206
                  </address>
                </div>
              </div>

              {/* 2. Mobile */}
              <div className="contact-item">
                <div className="contact-icon-circle" aria-hidden="true">
                  <FiPhone />
                </div>
                <div className="contact-text">
                  <span className="contact-label">Mobile</span>
                  <div className="contact-value contact-links">
                    <a href="tel:7871327802" className="contact-link">7871327802</a>
                    <span className="contact-separator">-</span>
                    <a href="tel:7448327802" className="contact-link">7448327802</a>
                  </div>
                </div>
              </div>

              {/* 3. Email */}
              <div className="contact-item">
                <div className="contact-icon-circle" aria-hidden="true">
                  <FiMail />
                </div>
                <div className="contact-text">
                  <span className="contact-label">Email</span>
                  <div className="contact-value contact-links">
                    <a href="mailto:moxiegadgets.ss@gmail.com" className="contact-link">
                      moxiegadgets.ss@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* 4. Opening Hours */}
              <div className="contact-item">
                <div className="contact-icon-circle" aria-hidden="true">
                  <FiClock />
                </div>
                <div className="contact-text">
                  <span className="contact-label">Open Daily</span>
                  <p className="contact-value highlight-hours">
                    9:00 AM - 9:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="footer-divider" />

        {/* Bottom Row */}
        <div className="footer-bottom-row">
          <p className="copyright-text">
            © 2026 Moxie. All rights reserved.
          </p>

          <span className="bottom-tagline">
            SMARTER CHOICES, BETTER LIFE
          </span>

          <button
            type="button"
            onClick={scrollToTop}
            className="back-to-top-btn"
            aria-label="Back to Top"
            title="Back to Top"
          >
            <FiArrowUp />
          </button>
        </div>
      </div>

      {/* Contact Us Modal */}
      {contactOpen && (
        <ContactModal
          isOpen={contactOpen}
          onClose={() => setContactOpen(false)}
        />
      )}
    </footer>
  );
}
