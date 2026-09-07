import React, { useState, useEffect } from "react";
import ReviewCard from "./ReviewCard";
import "./Reviews.css";

import { API_URL, BACKEND_URL } from "../../config";

const API_ORIGIN = BACKEND_URL;

const getReviewImageUrl = (image) => {
  if (!image) return null;
  let cleanImage = image;
  if (typeof cleanImage === "string") {
    cleanImage = cleanImage
      .replace(/^http:\/\/127\.0\.0\.1:8000/, API_ORIGIN)
      .replace(/^http:\/\/localhost:8000/, API_ORIGIN);

    if (cleanImage.startsWith("http://") || cleanImage.startsWith("https://")) {
      return cleanImage;
    }
  }
  try {
    return new URL(cleanImage, API_ORIGIN).href;
  } catch {
    return cleanImage;
  }
};

function Reviews() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/reviews/`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch reviews");
        }
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.results || []);
        const mappedData = list.map((item) => ({
          ...item,
          rating: Number(item.rating),
          image: getReviewImageUrl(item.image)
        }));
        setTestimonials(mappedData);
      })
      .catch((error) => {
        console.error("Error loading reviews:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="container text-center py-5">
        <div className="spinner-border text-warning" role="status">
          <span className="visually-hidden">Loading reviews...</span>
        </div>
      </div>
    );
  }

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="rating-section py-5">
      <div className="container">
        {/* Section Heading */}
        <h2 className="rating-heading text-center mb-2">Customers are saying us?</h2>

        {/* Continuous Marquee Carousel Wrapper */}
        <div className="reviews-marquee-wrapper">
          <div className="reviews-marquee-track">
            {testimonials.map((item) => (
              <ReviewCard
                key={`orig-${item.id}`}
                review={item}
                position="side"
              />
            ))}
            {/* Duplicate list to create a seamless looping effect */}
            {testimonials.map((item) => (
              <ReviewCard
                key={`dup-${item.id}`}
                review={item}
                position="side"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Reviews;

