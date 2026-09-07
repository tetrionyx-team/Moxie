import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { submitProductReview } from "../../api/reviewApi";
import { useToast } from "../../context/ToastContext";
import "./WriteReviewModal.css";

export default function WriteReviewModal({ order, product, user, onClose, onSuccess }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const productId = product?.id || order?.productId || order?.product_id || order?.id;
  const productName = product?.name || order?.name || "Product";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please write a few words about your experience.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitProductReview({
        product_id: productId,
        order_id: order?.id,
        rating: Number(rating),
        text: text.trim(),
        name: name.trim() || user?.name || "Verified Buyer",
      });

      if (toast) {
        toast("Thank you! Your verified review has been submitted.");
      }

      // Mark this order item as reviewed in localStorage to prevent duplicate reviews in current session
      try {
        const key = `reviewed_order_${order?.id}_prod_${productId}`;
        localStorage.setItem(key, "true");
      } catch {}

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Could not submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-head">
          <div>
            <h3>Write a Review</h3>
            <p className="review-product-name">{productName}</p>
          </div>
          <button
            type="button"
            className="review-close-btn"
            onClick={onClose}
            aria-label="Close review modal"
          >
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="review-modal-body">
          {error && <div className="review-error-banner">{error}</div>}

          {/* Star Rating Selector */}
          <div className="review-field-group">
            <label className="review-field-label">Overall Rating</label>
            <div className="interactive-stars-row" role="radiogroup" aria-label="Select rating">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    className="star-pick-btn"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  >
                    <FaStar className={isFilled ? "star-gold" : "star-gray"} />
                  </button>
                );
              })}
              <span className="rating-text-hint">
                {rating === 5 && "Excellent"}
                {rating === 4 && "Very Good"}
                {rating === 3 && "Good"}
                {rating === 2 && "Fair"}
                {rating === 1 && "Poor"}
              </span>
            </div>
          </div>

          {/* Review Text */}
          <div className="review-field-group">
            <label className="review-field-label">Your Review *</label>
            <textarea
              className="review-textarea"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you like or dislike about this product? How was the quality and fit?"
              required
            />
          </div>

          {/* Reviewer Name */}
          <div className="review-field-group">
            <label className="review-field-label">Your Name (Display Name)</label>
            <input
              type="text"
              className="review-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul S."
            />
          </div>

          <div className="review-actions-row">
            <button
              type="button"
              className="review-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="review-submit-btn"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
