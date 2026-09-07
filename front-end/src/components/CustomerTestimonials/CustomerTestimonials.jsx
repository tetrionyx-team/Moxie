import React, { useState, useEffect } from "react";
import { API_URL, BACKEND_URL } from "../../config";
import "./CustomerTestimonials.css";

// Project local profile avatars
import profile1 from "../../assets/images/profile1.png";
import profile2 from "../../assets/images/profile2.png";
import profile3 from "../../assets/images/profile3.png";

const getReviewImageUrl = (image) => {
  if (!image) return null;
  let cleanImage = image;
  if (typeof cleanImage === "string") {
    cleanImage = cleanImage
      .replace(/^http:\/\/127\.0\.0\.1:8000/, BACKEND_URL)
      .replace(/^http:\/\/localhost:8000/, BACKEND_URL);

    if (cleanImage.startsWith("http://") || cleanImage.startsWith("https://")) {
      return cleanImage;
    }
  }
  try {
    return new URL(cleanImage, BACKEND_URL).href;
  } catch {
    return cleanImage;
  }
};

export default function CustomerTestimonials() {
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/reviews/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch reviews");
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.results || []);
        if (list.length > 0) {
          const mapped = list.map((item, idx) => ({
            id: item.id || `api-review-${idx}`,
            name: item.name || "Verified Customer",
            rating: Number(item.rating) || 5,
            message: item.text || item.message || "",
            image:
              getReviewImageUrl(item.image) ||
              (idx % 3 === 0 ? profile1 : idx % 3 === 1 ? profile2 : profile3),
          }));
          setTestimonials(mapped);
        } else {
          setTestimonials([]);
        }
      })
      .catch(() => {
        setTestimonials([]);
      });
  }, []);

  if (!testimonials || testimonials.length === 0) {
    return null;
  }

  const renderStars = (rating = 5) => {
    const stars = [];
    const count = Math.min(Math.max(Math.round(rating), 1), 5);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`testimonial-star ${i <= count ? "filled" : "empty"}`}
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill={i <= count ? "#f5b800" : "#d1d5db"}
          aria-hidden="true"
        >
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      );
    }
    return stars;
  };

  const renderCard = (item, uniqueKey, isDuplicate = false) => {
    return (
      <article
        key={uniqueKey}
        className="testimonial-card standard-card"
        aria-hidden={isDuplicate ? "true" : undefined}
      >
        {/* Card Header: Avatar, Name, Stars & Quote Icon */}
        <div className="testimonial-card-header">
          <div className="testimonial-user-meta">
            <img
              src={item.image || profile1}
              alt={item.name}
              className="testimonial-avatar"
              onError={(e) => {
                e.currentTarget.src = profile1;
              }}
            />
            <div className="testimonial-user-details">
              <h3 className="testimonial-user-name">{item.name}</h3>
              <div
                className="testimonial-stars-wrap"
                aria-label={`${item.rating || 5} out of 5 stars`}
              >
                {renderStars(item.rating)}
              </div>
            </div>
          </div>

          {/* Top Right Quote Icon */}
          <div className="testimonial-quote-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="32"
              height="32"
              fill="currentColor"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>
        </div>

        {/* Card Message Body */}
        <div className="testimonial-card-body">
          <p className="testimonial-message">{item.message}</p>
        </div>
      </article>
    );
  };

  return (
    <section
      className="customer-testimonials-section"
      aria-label="Customer Testimonials"
    >
      <div className="testimonials-container">
        {/* Section Heading */}
        <h2 className="testimonials-heading">Customers are saying us?</h2>
      </div>

      {/* Continuous Marquee Carousel Moving Right to Left */}
      <div className="testimonial-marquee" aria-label="Customer Reviews Carousel">
        <div className="testimonial-track">
          {/* Group 1: Original Reviews */}
          <div className="testimonial-group">
            {testimonials.map((item, index) =>
              renderCard(item, `orig-${item.id || index}`, false)
            )}
          </div>

          {/* Group 2: Duplicated for Seamless Infinite Loop */}
          <div className="testimonial-group" aria-hidden="true">
            {testimonials.map((item, index) =>
              renderCard(item, `dup-${item.id || index}`, true)
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
