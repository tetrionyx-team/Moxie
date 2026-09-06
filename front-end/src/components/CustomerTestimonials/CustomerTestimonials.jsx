import React, { useState, useEffect } from "react";
import { BACKEND_URL } from "../../config";
import "./CustomerTestimonials.css";

// Project local profile avatars
import profile1 from "../../assets/images/profile1.png";
import profile2 from "../../assets/images/profile2.png";
import profile3 from "../../assets/images/profile3.png";

const DEFAULT_TESTIMONIALS = [
  {
    id: "testimonial-1",
    name: "Aarav Sharma",
    rating: 5,
    message:
      "The build quality of the Tonino Lamborghini watch blew me away. Super fast delivery and the packaging felt ultra-luxurious. Definitely buying again from Moxie!",
    image: profile1,
  },
  {
    id: "testimonial-2",
    name: "Rohan Kapoor",
    rating: 5,
    message:
      "Found the exact G-Shock series I was looking for. Premium customer service, smooth checkout, and 100% authentic product. Highly recommended for collectors!",
    image: profile2,
  },
  {
    id: "testimonial-3",
    name: "Priya Nair",
    rating: 5,
    message:
      "The 1:18 die-cast Mahindra Thar model has unbelievable detail. Looks amazing on my desk! The entire shopping experience with Moxie was top-notch.",
    image: profile3,
  },
  {
    id: "testimonial-4",
    name: "Vikram Malhotra",
    rating: 5,
    message:
      "Exceptional watch collection with unbeatable deals. The delivery was right on time and customer support answered all my questions instantly. A 5-star experience!",
    image: profile1,
  },
  {
    id: "testimonial-5",
    name: "Ananya Iyer",
    rating: 5,
    message:
      "Moxie is my go-to luxury lifestyle store now. Great warranty, authentic luxury items, and pristine packaging. Truly love the craftsmanship.",
    image: profile2,
  },
  {
    id: "testimonial-6",
    name: "Arjun Kumar",
    rating: 5,
    message:
      "Great collection and a smooth shopping experience. The product quality was excellent and delivery was faster than expected.",
    image: profile3,
  },
  {
    id: "testimonial-7",
    name: "Priya S",
    rating: 5,
    message:
      "Very happy with my purchase. The product matched the photos perfectly and the entire ordering process was simple and convenient.",
    image: profile1,
  },
];

const getReviewImageUrl = (image) => {
  if (!image) return null;
  try {
    return new URL(image, BACKEND_URL).href;
  } catch {
    return image;
  }
};

export default function CustomerTestimonials() {
  const [testimonials, setTestimonials] = useState(DEFAULT_TESTIMONIALS);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/reviews/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch reviews");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item, idx) => ({
            id: item.id || `api-review-${idx}`,
            name: item.name || "Verified Customer",
            rating: Number(item.rating) || 5,
            message: item.text || item.message || "",
            image:
              getReviewImageUrl(item.image) ||
              (idx % 3 === 0 ? profile1 : idx % 3 === 1 ? profile2 : profile3),
          }));
          // Ensure we have at least 5-7 items for smooth animation
          if (mapped.length < 5) {
            const combined = [...mapped, ...DEFAULT_TESTIMONIALS.slice(mapped.length)];
            setTestimonials(combined);
          } else {
            setTestimonials(mapped);
          }
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_TESTIMONIALS seamlessly
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
