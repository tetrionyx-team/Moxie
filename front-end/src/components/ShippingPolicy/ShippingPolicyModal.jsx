import React, { useEffect, useRef } from "react";
import {
  FiX,
  FiTruck,
  FiVideo,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCheckCircle,
  FiBox,
} from "react-icons/fi";
import "../PrivacyPolicy/PrivacyPolicyModal.css";

export default function ShippingPolicyModal({ isOpen, onClose }) {
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
        aria-labelledby="shipping-modal-title"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        ref={modalRef}
      >
        {/* Sticky Modal Header */}
        <header className="privacy-modal-header">
          <div className="privacy-header-content">
            <div className="privacy-header-badge">
              <FiTruck className="privacy-badge-icon" aria-hidden="true" />
              <span>SHIPPING & DELIVERY</span>
            </div>
            <h2 id="shipping-modal-title" className="privacy-modal-title">
              SHIPPING POLICY
            </h2>
            <p className="privacy-last-updated">Last Updated: September 12, 2026</p>
          </div>
          <button
            type="button"
            className="privacy-close-btn"
            onClick={onClose}
            aria-label="Close Shipping Policy"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Scrollable Policy Body */}
        <div className="privacy-modal-body">
          {/* Introduction Box */}
          <div className="privacy-intro-box">
            <p>
              At <strong>Moxie</strong>, we aim to provide a smooth, reliable, and transparent delivery experience for every customer.
            </p>
          </div>

          <div className="privacy-sections-list">
            {/* Section 1: Order Processing & Dispatch */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">1. Order Processing & Dispatch</h3>
              <p>
                Orders are generally processed and dispatched within <strong>2–3 business days</strong> after successful order confirmation and payment verification.
              </p>
            </section>

            {/* Section 2: Delivery Time */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">2. Delivery Time</h3>
              <p>
                Once your order is dispatched, delivery generally takes <strong>3–7 business days</strong>, depending on the product, delivery location, and courier service.
              </p>
              <p>
                Actual delivery time may vary for certain products or locations.
              </p>
            </section>

            {/* Section 3: Shipping Charges */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">3. Shipping Charges</h3>
              <p>Shipping charges are product-based.</p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", margin: "14px 0 16px" }}>
                <div style={{ background: "#fbf7ef", border: "1px solid rgba(201, 155, 69, 0.3)", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", color: "#071426", marginBottom: "4px" }}>
                    <FiBox style={{ color: "#c99b45" }} />
                    <span>Tamil Nadu</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13.5px", color: "#475569" }}>
                    Free shipping is available based on the product.
                  </p>
                </div>

                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "700", color: "#071426", marginBottom: "4px" }}>
                    <FiTruck style={{ color: "#c99b45" }} />
                    <span>Other States in India</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13.5px", color: "#475569" }}>
                    Delivery is available, and applicable shipping charges may apply based on the product.
                  </p>
                </div>
              </div>

              <ul className="privacy-bullet-list">
                <li>
                  <strong>Tamil Nadu:</strong> Free shipping is available based on the product.
                </li>
                <li>
                  <strong>Other States in India:</strong> Delivery is available, and applicable shipping charges may apply based on the product.
                </li>
                <li>
                  Applicable shipping charges will be displayed or communicated before order confirmation.
                </li>
              </ul>
            </section>

            {/* Section 4: Delivery Locations */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">4. Delivery Locations</h3>
              <p>
                Moxie provides delivery across Tamil Nadu and other locations throughout India, subject to product availability and courier service coverage.
              </p>
              <p>
                Free shipping within Tamil Nadu is available for eligible products.
              </p>
            </section>

            {/* Section 5: Delivery Delays */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">5. Delivery Delays</h3>
              <p>
                We aim to deliver your order within the estimated timeframe.
              </p>
              <p>
                If an unexpected delay occurs due to courier issues, weather, operational circumstances, or other reasons, Moxie will inform you about the delay and the reason whenever possible.
              </p>
              <p>
                We will make reasonable efforts to ensure your order is delivered as quickly as possible.
              </p>
            </section>

            {/* Section 6: Damaged or Incorrect Products */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">6. Damaged or Incorrect Products</h3>
              <p>
                If your package arrives damaged, opened, tampered with, or contains an incorrect product, please contact Moxie immediately.
              </p>

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
                  A minimum <strong>1-minute continuous, unedited unboxing video</strong> is required for damaged or incorrect-product claims.
                </p>
              </div>

              <p style={{ fontWeight: "600", color: "#071426", marginBottom: "8px" }}>
                For return or replacement validation:
              </p>
              <ul className="privacy-bullet-list">
                <li>A minimum 1-minute continuous, unedited unboxing video is mandatory.</li>
                <li>The video must clearly show the package from the beginning of the unboxing until the product is fully revealed.</li>
                <li>The package label and product condition should be clearly visible in the video.</li>
                <li>Please keep the original packaging and product safely.</li>
                <li>Damage or incorrect-product claims must be reported within 1–3 days of delivery.</li>
                <li>Claims without the required unboxing video or proper evidence may not be eligible for return or replacement.</li>
              </ul>
            </section>

            {/* Section 7: Incorrect Delivery Address */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">7. Incorrect Delivery Address</h3>
              <p>
                Customers are responsible for providing a complete and accurate delivery address and contact number when placing an order.
              </p>
              <p>
                If an order is returned to Moxie because of an incorrect, incomplete, or unavailable delivery address:
              </p>
              <ul className="privacy-bullet-list">
                <li>The parcel may be returned to our facility.</li>
                <li>Re-shipping may be arranged upon request.</li>
                <li>Additional shipping charges may apply for re-delivery.</li>
              </ul>
            </section>

            {/* Section 8: Contact Us */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">8. Contact Us</h3>
              <p>
                If you have questions regarding shipping or your order delivery status, please contact us:
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
                <h4>Thank You for Choosing Moxie</h4>
              </div>
              <p className="privacy-closing-commit">
                We are committed to providing a safe, transparent, and reliable delivery experience.
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
