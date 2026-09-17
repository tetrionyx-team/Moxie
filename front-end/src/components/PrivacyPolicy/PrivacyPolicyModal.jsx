import React, { useEffect, useRef } from "react";
import {
  FiX,
  FiShield,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCheckCircle,
} from "react-icons/fi";
import "./PrivacyPolicyModal.css";

export default function PrivacyPolicyModal({ isOpen, onClose }) {
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
        aria-labelledby="privacy-modal-title"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        ref={modalRef}
      >
        {/* Sticky Modal Header */}
        <header className="privacy-modal-header">
          <div className="privacy-header-content">
            <div className="privacy-header-badge">
              <FiShield className="privacy-badge-icon" aria-hidden="true" />
              <span>LEGAL & COMPLIANCE</span>
            </div>
            <h2 id="privacy-modal-title" className="privacy-modal-title">
              PRIVACY POLICY
            </h2>
            <p className="privacy-last-updated">Last Updated: September 12, 2026</p>
          </div>
          <button
            type="button"
            className="privacy-close-btn"
            onClick={onClose}
            aria-label="Close Privacy Policy"
          >
            <FiX size={20} />
          </button>
        </header>

        {/* Scrollable Policy Body */}
        <div className="privacy-modal-body">
          {/* Introduction */}
          <div className="privacy-intro-box">
            <p>
              At <strong>Moxie</strong>, we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your information when you use our website, products, and services.
            </p>
            <p className="privacy-intro-agree">
              By using the Moxie website, you agree to the practices described in this Privacy Policy.
            </p>
          </div>

          <div className="privacy-sections-list">
            {/* Section 1 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">1. Information We Collect</h3>
              <p>When you use Moxie, we may collect the following information:</p>

              <h4 className="privacy-subheading">Personal Information</h4>
              <ul className="privacy-bullet-list">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Billing and shipping address</li>
                <li>Account login information</li>
                <li>Other information you voluntarily provide</li>
              </ul>

              <h4 className="privacy-subheading">Order & Payment Information</h4>
              <p>When you place an order, we may collect information necessary to process your purchase, such as:</p>
              <ul className="privacy-bullet-list">
                <li>Order details</li>
                <li>Billing information</li>
                <li>Shipping details</li>
                <li>Payment status</li>
              </ul>
              <div className="privacy-callout-note">
                <strong>Note:</strong> Payment details may be processed securely through our third-party payment service providers. Moxie does not unnecessarily store complete card or banking information.
              </div>

              <h4 className="privacy-subheading">Technical Information</h4>
              <p>We may automatically collect:</p>
              <ul className="privacy-bullet-list">
                <li>IP address</li>
                <li>Browser type</li>
                <li>Device information</li>
                <li>Operating system</li>
                <li>Pages visited</li>
                <li>Website usage information</li>
                <li>Cookies and similar technologies</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">2. How We Use Your Information</h3>
              <p>We may use your information to:</p>
              <ul className="privacy-bullet-list">
                <li>Create and manage your Moxie account</li>
                <li>Process and deliver your orders</li>
                <li>Provide customer support</li>
                <li>Send order confirmations and updates</li>
                <li>Process payments securely</li>
                <li>Improve our website and services</li>
                <li>Personalize your shopping experience</li>
                <li>Detect and prevent fraud or unauthorized activity</li>
                <li>Send promotional communications where permitted</li>
                <li>Comply with applicable laws and legal requirements</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">3. Cookies</h3>
              <p>
                Moxie may use cookies and similar technologies to improve your browsing experience.
              </p>
              <p>Cookies may help us:</p>
              <ul className="privacy-bullet-list">
                <li>Remember your preferences</li>
                <li>Keep you signed in</li>
                <li>Understand website usage</li>
                <li>Improve website performance</li>
                <li>Provide relevant content</li>
              </ul>
              <p>
                You can manage or disable cookies through your browser settings. Some website features may not work properly if cookies are disabled.
              </p>
            </section>

            {/* Section 4 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">4. How We Protect Your Information</h3>
              <p>
                We take reasonable technical and organizational measures to protect your personal information against:
              </p>
              <ul className="privacy-bullet-list">
                <li>Unauthorized access</li>
                <li>Loss</li>
                <li>Misuse</li>
                <li>Alteration</li>
                <li>Disclosure</li>
                <li>Destruction</li>
              </ul>
              <p>
                However, no online service can guarantee complete security of information transmitted over the internet.
              </p>
            </section>

            {/* Section 5 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">5. Sharing Your Information</h3>
              <p>
                <strong>We do not sell your personal information.</strong>
              </p>
              <p>
                We may share limited information with trusted service providers when necessary to operate Moxie, including:
              </p>
              <ul className="privacy-bullet-list">
                <li>Payment processors</li>
                <li>Shipping and delivery partners</li>
                <li>Website hosting providers</li>
                <li>Analytics and technology providers</li>
                <li>Customer support services</li>
              </ul>
              <p>
                These providers are expected to handle information securely and only for the purposes required to provide their services.
              </p>
              <p>
                We may also disclose information when required by law, legal proceedings, or to protect the rights and safety of Moxie, our users, or others.
              </p>
            </section>

            {/* Section 6 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">6. Payment Security</h3>
              <p>
                Payments made through Moxie may be processed by secure third-party payment providers.
              </p>
              <p>
                Your payment information may be handled directly by the payment provider according to its own privacy and security policies.
              </p>
              <p>
                Moxie does not intentionally retain complete payment card details unless specifically required and legally permitted.
              </p>
            </section>

            {/* Section 7 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">7. Your Rights</h3>
              <p>Depending on applicable law, you may have the right to:</p>
              <ul className="privacy-bullet-list">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Update your account information</li>
                <li>Withdraw certain permissions or consents</li>
                <li>Request information about how your data is used</li>
              </ul>
              <p>
                To exercise these rights, please contact us using the details provided below.
              </p>
            </section>

            {/* Section 8 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">8. Account Information</h3>
              <p>
                If you create a Moxie account, you are responsible for keeping your login credentials confidential.
              </p>
              <p>
                Please contact us immediately if you believe your account has been accessed without your permission.
              </p>
            </section>

            {/* Section 9 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">9. Third-Party Links</h3>
              <p>
                Our website may contain links to third-party websites or services.
              </p>
              <p>
                Moxie is not responsible for the privacy practices, security, or content of those third-party websites.
              </p>
              <p>
                We recommend reviewing their privacy policies before providing personal information.
              </p>
            </section>

            {/* Section 10 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">10. Children's Privacy</h3>
              <p>
                Moxie is not intended to knowingly collect personal information from children without appropriate consent.
              </p>
              <p>
                If you believe that a child has provided personal information to us without proper authorization, please contact us so that we can take appropriate action.
              </p>
            </section>

            {/* Section 11 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">11. Data Retention</h3>
              <p>We retain personal information only for as long as reasonably necessary to:</p>
              <ul className="privacy-bullet-list">
                <li>Provide our services</li>
                <li>Complete transactions</li>
                <li>Maintain business and accounting records</li>
                <li>Resolve disputes</li>
                <li>Prevent fraud</li>
                <li>Meet legal and regulatory requirements</li>
              </ul>
              <p>
                When information is no longer required, we may securely delete or anonymize it.
              </p>
            </section>

            {/* Section 12 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">12. Changes to This Privacy Policy</h3>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our services, technology, or legal requirements.
              </p>
              <p>
                When we make significant changes, we may update the "Last Updated" date and provide additional notice where appropriate.
              </p>
              <p>
                We encourage you to review this page periodically.
              </p>
            </section>

            {/* Section 13 */}
            <section className="privacy-section">
              <h3 className="privacy-section-heading">13. Contact Us</h3>
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:
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
                        Thoothukudi (DT) - 628206
                      </address>
                    </div>
                  </div>
                </div>

                <p className="privacy-response-note">
                  We will make reasonable efforts to respond to privacy-related requests in a timely manner.
                </p>
              </div>
            </section>

            {/* Closing Note */}
            <div className="privacy-closing-card">
              <div className="privacy-closing-header">
                <FiCheckCircle className="privacy-closing-icon" />
                <h4>Your Privacy Matters</h4>
              </div>
              <p>
                We believe shopping online should be simple, secure, and transparent.
              </p>
              <p className="privacy-closing-commit">
                Moxie is committed to handling your information responsibly and protecting your privacy.
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
