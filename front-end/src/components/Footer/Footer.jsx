import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaXTwitter } from "react-icons/fa6";
import { FiMapPin, FiPhone, FiMail, FiClock, FiArrowUp, FiChevronDown } from "react-icons/fi";
import MoxieLogo from "../../assets/logo/moxie.png";
import ContactModal from "../contact/ContactModal";
import PrivacyPolicyModal from "../PrivacyPolicy/PrivacyPolicyModal";
import TermsConditionsModal from "../TermsConditions/TermsConditionsModal";
import RefundPolicyModal from "../RefundPolicy/RefundPolicyModal";
import ShippingPolicyModal from "../ShippingPolicy/ShippingPolicyModal";
import "./Footer.css";

export default function Footer() {
  const [contactOpen, setContactOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);

  // Mobile Accordion state: only one open at a time ('categories' | 'service' | null)
  const [mobileAccordion, setMobileAccordion] = useState(null);

  const toggleAccordion = (section) => {
    setMobileAccordion((prev) => (prev === section ? null : section));
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="moxie-footer" role="contentinfo">
      {/* Subtle Background Watermark */}
      <div className="footer-watermark" aria-hidden="true">
        M
      </div>

      <div className="footer-container">
        {/* Main Grid */}
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

          {/* COLUMN 2 — CATEGORIES (ACCORDION ON MOBILE) */}
          <div
            className={`footer-column nav-column categories-column ${mobileAccordion === "categories" ? "is-open" : ""
              }`}
          >
            <button
              type="button"
              className="column-heading-btn"
              onClick={() => toggleAccordion("categories")}
              aria-expanded={mobileAccordion === "categories"}
              aria-controls="footer-categories-nav"
            >
              <div className="column-heading-wrap">
                <h3 className="column-heading">Categories</h3>
                <div className="heading-gold-line" aria-hidden="true" />
              </div>
              <span className="mobile-chevron-icon" aria-hidden="true">
                <FiChevronDown />
              </span>
            </button>
            <nav
              id="footer-categories-nav"
              className="footer-nav-collapse"
              aria-label="Categories navigation"
            >
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

          {/* COLUMN 3 — SERVICE (ACCORDION ON MOBILE) */}
          <div
            className={`footer-column nav-column service-column ${mobileAccordion === "service" ? "is-open" : ""
              }`}
          >
            <button
              type="button"
              className="column-heading-btn"
              onClick={() => toggleAccordion("service")}
              aria-expanded={mobileAccordion === "service"}
              aria-controls="footer-service-nav"
            >
              <div className="column-heading-wrap">
                <h3 className="column-heading">Service</h3>
                <div className="heading-gold-line" aria-hidden="true" />
              </div>
              <span className="mobile-chevron-icon" aria-hidden="true">
                <FiChevronDown />
              </span>
            </button>
            <nav
              id="footer-service-nav"
              className="footer-nav-collapse"
              aria-label="Customer service navigation"
            >
              <ul className="footer-nav-list">
                <li>
                  <button
                    type="button"
                    className="footer-nav-btn"
                    onClick={() => setRefundOpen(true)}
                    aria-label="Open Return and Refund Policy modal"
                  >
                    Return & Refund Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-nav-btn"
                    onClick={() => setShippingOpen(true)}
                    aria-label="Open Shipping Policy modal"
                  >
                    Shipping Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-nav-btn"
                    onClick={() => setPrivacyOpen(true)}
                    aria-label="Open Privacy Policy modal"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="footer-nav-btn"
                    onClick={() => setTermsOpen(true)}
                    aria-label="Open Terms and Conditions modal"
                  >
                    Terms & Conditions
                  </button>
                </li>
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
                <li><Link to="/track-order">Track Order</Link></li>
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
                  <span className="contact-label">Location</span>
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
                  <span className="contact-label">Customer Support</span>
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

      {/* Privacy Policy Modal */}
      {privacyOpen && (
        <PrivacyPolicyModal
          isOpen={privacyOpen}
          onClose={() => setPrivacyOpen(false)}
        />
      )}

      {/* Terms & Conditions Modal */}
      {termsOpen && (
        <TermsConditionsModal
          isOpen={termsOpen}
          onClose={() => setTermsOpen(false)}
          onOpenPrivacyPolicy={() => {
            setTermsOpen(false);
            setPrivacyOpen(true);
          }}
        />
      )}

      {/* Return & Refund Policy Modal */}
      {refundOpen && (
        <RefundPolicyModal
          isOpen={refundOpen}
          onClose={() => setRefundOpen(false)}
        />
      )}

      {/* Shipping Policy Modal */}
      {shippingOpen && (
        <ShippingPolicyModal
          isOpen={shippingOpen}
          onClose={() => setShippingOpen(false)}
        />
      )}
    </footer>
  );
}
