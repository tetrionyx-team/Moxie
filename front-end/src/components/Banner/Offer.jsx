import React from "react";
import "./Offer.css";

function Offer() {
  const benefits = [
    "🚚 Free Delivery on Orders ₹999+",
    "🎉 Flat 20% OFF on Smart Watches",
    "💳 Secure Payments Available",
    "🔄 Easy Returns Within 7 Days",
  ];

  return (
    <div className="benefits-marquee" aria-label="Store Benefits & Promotions">
      <div className="benefits-track">
        {/* Original items */}
        {benefits.map((benefit, index) => (
          <span key={`orig-${index}`} className="benefit-item">
            {benefit}
          </span>
        ))}
        {/* Duplicated once for seamless infinite loop */}
        {benefits.map((benefit, index) => (
          <span key={`dup-${index}`} className="benefit-item" aria-hidden="true">
            {benefit}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Offer;

