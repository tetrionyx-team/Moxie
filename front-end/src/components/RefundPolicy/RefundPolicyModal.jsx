import React, { useEffect, useRef } from "react";
import {
  FiX,
  FiRotateCcw,
  FiVideo,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";

import "../PrivacyPolicy/PrivacyPolicyModal.css";

export default function RefundPolicyModal({ isOpen, onClose }) {
  const modalRef = useRef(null);

  // Lock body scroll on mount and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Focus modal container for screen reader and keyboard accessibility
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="privacy-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="privacy-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-modal-title"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        ref={modalRef}
      >
        {/* Sticky Modal Header */}
        <header className="privacy-modal-header">
          <div className="privacy-header-content">
            <div className="privacy-header-badge">
              <FiRotateCcw className="privacy-badge-icon" aria-hidden="true" />
              <span>RETURN & REPLACEMENT POLICY</span>
            </div>
            <h2 id="refund-modal-title" className="privacy-modal-title">
              RETURN & REFUND POLICY
            </h2>
            <p className="privacy-last-updated">Last Updated: September 12, 2026</p>
          </div>
          <button
            type="button"
            className="privacy-close-btn"
            onClick={onClose}
            aria-label="Close Return and Refund Policy"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Scrollable Policy Body */}
        <div className="privacy-modal-body">
          {/* Introduction Box */}
          <div className="privacy-intro-box">
            <p>
              At <strong>Moxie</strong>, we are committed to ensuring you receive your order in good condition.
            </p>
          </div>

          <div className="privacy-sections-list">
            {/* Section 1: Return & Replacement */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">1. Return & Replacement</h3>

              {/* Special Emphasis - Return Window Highlight Card */}
              <div className="privacy-callout-note" style={{ display: "flex", alignItems: "flex-start", gap: "10px", margin: "10px 0 16px" }}>
                <FiClock style={{ color: "#c99b45", fontSize: "18px", flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <strong>Return Window:</strong> Return/replacement requests must be made within <strong>1–3 days</strong> of delivery.
                </div>
              </div>

              <ul className="privacy-bullet-list">
                <li>Return/replacement requests must be made within 1–3 days of delivery.</li>
                <li>
                  Eligible damaged, defective, incorrect, or incomplete products will receive a <strong>100% replacement with the same product</strong>, subject to verification and availability.
                </li>
              </ul>
            </section>

            {/* Section 2: Mandatory Unboxing Video */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">2. Mandatory Unboxing Video</h3>

              {/* Special Emphasis - Unboxing Video Highlight Card */}
              <div
                style={{
                  background: "#fbf7ef",
                  border: "1px solid rgba(201, 155, 69, 0.4)",
                  borderLeft: "4px solid #c99b45",
                  borderRadius: "8px",
                  padding: "14px 18px",
                  margin: "12px 0 18px",
                  color: "#071426",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "4px", color: "#c99b45" }}>
                  <FiVideo size={18} />
                  <span>Important</span>
                </div>
                <p style={{ margin: 0, fontSize: "14px", fontWeight: "500", color: "#1e293b", lineHeight: "1.5" }}>
                  A minimum <strong>1-minute continuous, unedited unboxing video</strong> is required for return/replacement validation.
                </p>
              </div>

              <ul className="privacy-bullet-list">
                <li>A minimum 1-minute continuous, unedited unboxing video is mandatory.</li>
                <li>The video must clearly show the package, shipping label, opening process, and product condition.</li>
                <li>Claims without proper unboxing evidence may not be accepted.</li>
              </ul>
            </section>

            {/* Section 3: Product Condition */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">3. Product Condition</h3>
              <p>To ensure eligible processing, please note:</p>
              <ul className="privacy-bullet-list">
                <li>Keep the original product, packaging, accessories, and invoice until the issue is resolved.</li>
                <li>Customer-caused damage, misuse, modification, or normal wear and tear is not eligible.</li>
              </ul>
            </section>

            {/* Section 4: Replacement Process */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">4. Replacement Process</h3>
              <p>
                Once the claim is verified and approved, Moxie will arrange the same-product replacement.
              </p>
              <p>
                If the same product is unavailable, Moxie will contact you regarding an alternative resolution.
              </p>
            </section>

            {/* Section 5: Contact Us */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">5. Contact Us</h3>
              <p>
                If you have questions or need assistance with a return or replacement request, please reach out to us:
              </p>

              <div className="privacy-contact-card">
                <div className="privacy-contact-brand">
                  <h4>Moxie</h4>
                </div>

                <div className="privacy-contact-grid">
                  <div className="privacy-contact-row">
                    <div className="privacy-contact-icon">
                      <FiMail />
                    </div>
                    <div className="privacy-contact-info">
                      <span className="privacy-contact-label">Email</span>
                      <a href="mailto:moxiegadgets.ss@gmail.com" className="privacy-contact-link">
                        moxiegadgets.ss@gmail.com
                      </a>
                    </div>
                  </div>

                  <div className="privacy-contact-row">
                    <div className="privacy-contact-icon">
                      <FiPhone />
                    </div>
                    <div className="privacy-contact-info">
                      <span className="privacy-contact-label">Phone</span>
                      <div className="privacy-phones-group">
                        <a href="tel:7871327802" className="privacy-contact-link">7871327802</a>
                        <span className="privacy-phone-sep">/</span>
                        <a href="tel:7448327802" className="privacy-contact-link">7448327802</a>
                      </div>
                    </div>
                  </div>

                  <div className="privacy-contact-row">
                    <div className="privacy-contact-icon">
                      <FiMapPin />
                    </div>
                    <div className="privacy-contact-info">
                      <span className="privacy-contact-label">Address</span>
                      <address className="privacy-address-text">
                        3/185, Savariyar Temple South Street,<br />
                        Kulasekaranpattinam,<br />
                        Thoothukudi (DT),<br />
                        Tamil Nadu - 628206,<br />
                        India
                      </address>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Closing Trust Card */}
            <div className="privacy-closing-card">
              <div className="privacy-closing-header">
                <FiCheckCircle className="privacy-closing-icon" />
                <h4>Moxie — Your satisfaction matters.</h4>
              </div>
              <p className="privacy-closing-commit">
                We are committed to delivering genuine, quality-checked products with dependable support.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Action */}
        <footer className="privacy-modal-footer">
          <button
            type="button"
            className="privacy-understand-btn"
            onClick={onClose}
          >
            I Understand
          </button>
        </footer>
      </div>
    </div>
  );
}
