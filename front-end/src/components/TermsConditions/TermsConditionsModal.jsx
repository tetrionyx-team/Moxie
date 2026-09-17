import React, { useEffect, useRef } from "react";
import {
  FiX,
  FiFileText,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCheckCircle,
} from "react-icons/fi";
import "../PrivacyPolicy/PrivacyPolicyModal.css";

export default function TermsConditionsModal({ isOpen, onClose, onOpenPrivacyPolicy }) {
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
        aria-labelledby="terms-modal-title"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        ref={modalRef}
      >
        {/* Sticky Modal Header */}
        <header className="privacy-modal-header">
          <div className="privacy-header-content">
            <div className="privacy-header-badge">
              <FiFileText className="privacy-badge-icon" aria-hidden="true" />
              <span>LEGAL & COMPLIANCE</span>
            </div>
            <h2 id="terms-modal-title" className="privacy-modal-title">
              TERMS & CONDITIONS
            </h2>
            <p className="privacy-last-updated">Last Updated: September 12, 2026</p>
          </div>
          <button
            type="button"
            className="privacy-close-btn"
            onClick={onClose}
            aria-label="Close Terms and Conditions"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Scrollable Terms Body */}
        <div className="privacy-modal-body">
          {/* Welcome & Intro */}
          <div className="privacy-intro-box">
            <p>
              Welcome to <strong>Moxie</strong>.
            </p>
            <p className="privacy-intro-agree">
              By accessing our website or placing an order, you agree to the following Terms & Conditions.
            </p>
          </div>

          <div className="privacy-sections-list">
            {/* Section 1 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">1. Website Use</h3>
              <p>Use Moxie only for lawful purposes.</p>
              <p>Please provide accurate information and keep your account credentials secure.</p>
              <p>Unauthorized access, misuse, fraud, or interference with the website is not permitted.</p>
            </section>

            {/* Section 2 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">2. Products & Pricing</h3>
              <p>We make reasonable efforts to provide accurate product descriptions, images, prices, and availability.</p>
              <p>Product appearance may vary slightly from displayed images.</p>
              <p>Prices and availability may change without prior notice.</p>
            </section>

            {/* Section 3 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">3. Orders & Payments</h3>
              <p>Orders are confirmed after successful submission and payment verification.</p>
              <p>Moxie may cancel orders due to product unavailability, pricing errors, payment issues, or suspected fraudulent activity.</p>
              <p>Payments may be processed securely through third-party payment providers.</p>
            </section>

            {/* Section 4 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">4. Cancellation</h3>
              <p>Order cancellation depends on the order status.</p>
              <p>Once an order has been processed or shipped, cancellation may not be possible.</p>
            </section>

            {/* Section 5 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">5. Delivery & Shipping</h3>
              <p>Moxie aims to deliver orders within the estimated timeframe shown at checkout or in your order confirmation.</p>
              <p>Delivery times may vary due to location, courier delays, weather, holidays, or other unforeseen circumstances.</p>
              <p>Customers must provide a complete and accurate delivery address and contact number.</p>
              <p>Moxie is not responsible for delays caused by incorrect or incomplete information.</p>
              <p>If your package arrives damaged or appears tampered with, please take photos/videos and contact Moxie support promptly.</p>
            </section>

            {/* Section 6 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">6. Returns & Refunds</h3>
              <p>Returns, replacements, and refunds are subject to Moxie's Return & Refund Policy.</p>
              <p>Eligibility may depend on the product condition, return period, product category, and reason for return.</p>
            </section>

            {/* Section 7 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">7. Damaged or Incorrect Products</h3>
              <p>If you receive a damaged, defective, incomplete, or incorrect product, contact Moxie support as soon as possible with your order details and supporting photos/videos.</p>
            </section>

            {/* Section 8 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">8. Promotions</h3>
              <p>Discounts, coupons, and promotional offers may have specific conditions, validity periods, and usage limits.</p>
              <p>Moxie may modify or withdraw promotions where permitted.</p>
            </section>

            {/* Section 9 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">9. Intellectual Property</h3>
              <p>Moxie's logos, branding, images, text, graphics, videos, and website design are protected by applicable intellectual property laws.</p>
              <p>They may not be copied or used without permission.</p>
            </section>

            {/* Section 10 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">10. Third-Party Services</h3>
              <p>Moxie may use trusted third-party services for payments, shipping, hosting, analytics, and other services.</p>
              <p>Their own terms and policies may apply.</p>
            </section>

            {/* Section 11 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">11. Website Availability</h3>
              <p>Moxie aims to provide reliable service but does not guarantee uninterrupted or error-free website access.</p>
              <p>Temporary interruptions may occur due to maintenance, technical issues, or circumstances beyond our control.</p>
            </section>

            {/* Section 12 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">12. Privacy</h3>
              <p>
                Your use of Moxie is also subject to our{" "}
                <button
                  type="button"
                  className="privacy-inline-link"
                  onClick={() => {
                    if (onOpenPrivacyPolicy) {
                      onOpenPrivacyPolicy();
                    }
                  }}
                  aria-label="Open Privacy Policy"
                >
                  Privacy Policy
                </button>
                , which explains how your personal information is collected and handled.
              </p>
            </section>

            {/* Section 13 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">13. Changes to These Terms</h3>
              <p>Moxie may update these Terms & Conditions when necessary.</p>
              <p>Updates will be reflected on this page with a revised Last Updated date.</p>
            </section>

            {/* Section 14 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">14. Governing Law</h3>
              <p>These Terms are governed by the applicable laws of India.</p>
              <p>Disputes will be subject to the appropriate courts having jurisdiction over Thoothukudi, Tamil Nadu, unless otherwise required by law.</p>
            </section>

            {/* Section 15 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">15. Contact Us</h3>
              <p>
                If you have questions, concerns, or inquiries regarding these Terms & Conditions, please contact us:
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

            {/* Closing Note */}
            <div className="privacy-closing-card">
              <div className="privacy-closing-header">
                <FiCheckCircle className="privacy-closing-icon" />
                <h4>Thank you for choosing Moxie.</h4>
              </div>
              <p>
                We are dedicated to providing you with premium products, reliable service, and a trustworthy shopping experience.
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
