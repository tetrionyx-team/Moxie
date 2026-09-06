import React, { useState, useEffect } from "react";
import {
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiTag,
  FiMessageSquare,
  FiSend,
  FiMapPin,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import { FaInstagram } from "react-icons/fa6";
import "./ContactModal.css";

export default function ContactModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Close on Escape key & Lock body scroll
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

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "message" && value.length > 500) return;

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Please enter your name.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email.";
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = "Invalid email address.";
    }

    const phoneDigits = formData.phone.replace(/[^0-9]/g, "");
    if (!formData.phone.trim()) {
      newErrors.phone = "Please enter phone number.";
    } else if (phoneDigits.length < 10) {
      newErrors.phone = "Enter valid 10-digit phone.";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Please enter subject.";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Please enter message.";
    } else if (formData.message.length > 500) {
      newErrors.message = "Max 500 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      setSubmitted(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    }
  };

  return (
    <div
      className="contact-modal-backdrop"
      onClick={onClose}
      role="presentation"
      data-testid="contact-modal-backdrop"
    >
      <div
        className="contact-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="contact-modal-header">
          <div className="contact-modal-header-text">
            <div className="title-row">
              <span className="gold-accent-pill" aria-hidden="true" />
              <h2 id="contact-modal-title" className="contact-modal-title">
                Contact <span className="title-accent">Us</span>
              </h2>
            </div>
            <p className="contact-modal-subtitle">
              Fill in the details below and we'll get back to you as soon as possible.
            </p>
          </div>
          <button
            type="button"
            className="contact-modal-close-btn"
            onClick={onClose}
            aria-label="Close contact form"
            title="Close (Esc)"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        {/* Success Toast */}
        {submitted && (
          <div className="contact-success-banner" role="alert">
            <FiCheckCircle className="success-icon" aria-hidden="true" />
            <span>Thank you! Your message has been received.</span>
          </div>
        )}

        {/* Top 2-Column Section */}
        <div className="contact-modal-top-grid">
          {/* Left Column: Form */}
          <div className="contact-form-section">
            <form onSubmit={handleSubmit} noValidate className="contact-form">
              {/* Row 1: Name & Email */}
              <div className="form-row-two-col">
                <div className="form-group">
                  <div className={`input-wrap ${errors.name ? "has-error" : ""}`}>
                    <FiUser className="input-icon" aria-hidden="true" />
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                  {errors.name && <span className="field-error-msg">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <div className={`input-wrap ${errors.email ? "has-error" : ""}`}>
                    <FiMail className="input-icon" aria-hidden="true" />
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      placeholder="Your Email"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-input"
                    />
                  </div>
                  {errors.email && <span className="field-error-msg">{errors.email}</span>}
                </div>
              </div>

              {/* Row 2: Phone Number */}
              <div className="form-group">
                <div className={`input-wrap ${errors.phone ? "has-error" : ""}`}>
                  <FiPhone className="input-icon" aria-hidden="true" />
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    placeholder="Your Phone Number"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                {errors.phone && <span className="field-error-msg">{errors.phone}</span>}
              </div>

              {/* Row 3: Subject */}
              <div className="form-group">
                <div className={`input-wrap ${errors.subject ? "has-error" : ""}`}>
                  <FiTag className="input-icon" aria-hidden="true" />
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    placeholder="Subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                {errors.subject && <span className="field-error-msg">{errors.subject}</span>}
              </div>

              {/* Row 4: Message */}
              <div className="form-group">
                <div className={`textarea-wrap ${errors.message ? "has-error" : ""}`}>
                  <FiMessageSquare className="textarea-icon" aria-hidden="true" />
                  <textarea
                    id="contact-message"
                    name="message"
                    rows="3"
                    placeholder="Your Message"
                    value={formData.message}
                    onChange={handleChange}
                    className="form-textarea"
                    maxLength={500}
                  />
                  <div className="char-counter">{formData.message.length}/500</div>
                </div>
                {errors.message && <span className="field-error-msg">{errors.message}</span>}
              </div>

              {/* Submit Button */}
              <button type="submit" className="contact-submit-btn">
                <FiSend className="btn-send-icon" aria-hidden="true" />
                <span>Send Message</span>
              </button>
            </form>
          </div>

          {/* Right Column: Get in Touch & Contact Info */}
          <div className="contact-info-section">
            <div className="section-title-wrap">
              <div className="title-row">
                <span className="gold-accent-pill" aria-hidden="true" />
                <h3 className="section-title">Get in Touch</h3>
              </div>
              <p className="section-subtitle">
                Reach us through any of the following channels.
              </p>
            </div>

            <div className="contact-cards-grid">
              {/* Card 1: Our Location */}
              <div className="info-card">
                <div className="info-card-icon-circle" aria-hidden="true">
                  <FiMapPin />
                </div>
                <div className="info-card-content">
                  <h4 className="info-card-title">Our Location</h4>
                  <address className="info-card-desc not-italic">
                    3/185, Savariyar Temple South Street,<br />
                    Kulasekaranpattinam,<br />
                    Thoothukudi (DT) - 628206
                  </address>
                </div>
              </div>

              {/* Card 2: Call Us */}
              <div className="info-card">
                <div className="info-card-icon-circle" aria-hidden="true">
                  <FiPhone />
                </div>
                <div className="info-card-content">
                  <h4 className="info-card-title">Call Us</h4>
                  <div className="info-card-desc info-links">
                    <a href="tel:7871327802" className="info-link">7871327802</a>
                    <span className="info-sep">-</span>
                    <a href="tel:7448327802" className="info-link">7448327802</a>
                  </div>
                  <div className="info-card-hours-sub">
                    Open Daily<br />9:00 AM – 9:00 PM
                  </div>
                </div>
              </div>

              {/* Card 3: Email Us */}
              <div className="info-card">
                <div className="info-card-icon-circle" aria-hidden="true">
                  <FiMail />
                </div>
                <div className="info-card-content">
                  <h4 className="info-card-title">Email Us</h4>
                  <div className="info-card-desc">
                    <a href="mailto:moxiegadgets.ss@gmail.com" className="info-link">
                      moxiegadgets.ss@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Card 4: Business Hours */}
              <div className="info-card">
                <div className="info-card-icon-circle" aria-hidden="true">
                  <FiClock />
                </div>
                <div className="info-card-content">
                  <h4 className="info-card-title">Business Hours</h4>
                  <p className="info-card-desc">
                    <strong>Open Daily</strong><br />
                    9:00 AM – 9:00 PM
                  </p>
                </div>
              </div>
            </div>

            {/* Follow Us (Instagram Only) */}
            <div className="follow-us-box">
              <div className="title-row">
                <span className="gold-accent-pill" aria-hidden="true" />
                <h4 className="follow-us-title">Follow Us</h4>
              </div>
              <p className="follow-us-desc">
                Stay updated with our latest products, news and offers.
              </p>
              <div className="follow-us-links">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="instagram-follow-btn"
                  aria-label="Follow Moxie on Instagram"
                >
                  <FaInstagram className="ig-icon" aria-hidden="true" />
                  <span>@moxie.gadgets</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Map (Underneath BOTH Top Columns) */}
        <div className="contact-modal-map-wrap">
          <div className="contact-map-container">
            <iframe
              title="Moxie Store Location Map"
              src="https://maps.google.com/maps?q=3%2F185%2C+Savariyar+Temple+South+Street%2C+Kulasekaranpattinam%2C+Thoothukudi+628206&t=&z=15&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
