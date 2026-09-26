import React, { useState, useRef, useEffect } from "react";
import { FiX, FiCheckCircle, FiUploadCloud, FiTrash2 } from "react-icons/fi";
import { FaStar } from "react-icons/fa";
import { submitProductReview } from "../../api/reviewApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getFallbackImage, getOrderImageUrl } from "../../utils/orderImage";
import "./WriteReviewModal.css";

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function WriteReviewModal({ orderItem, order, product, user: userProp, onClose, onSuccess }) {
  const toast = useToast();
  const { user: authUser } = useAuth() || {};
  const user = userProp || authUser;

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState([]); // Array of { file, previewUrl, id }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const activeItem = orderItem || (Array.isArray(order?.items) && order.items.length > 0 ? order.items[0] : null);
  const orderItemId = activeItem?.id || null;
  const productId = product?.id || activeItem?.productId || activeItem?.product_id || order?.productId || order?.product_id;
  const productName = activeItem?.name || product?.name || order?.name || "Moxie Product";
  const productVariant = activeItem?.variant || order?.variant || "";
  const rawImg = activeItem?.image || product?.image || order?.image;
  const fallbackImg = getFallbackImage(productName);
  const productImg = getOrderImageUrl(rawImg, productName);

  // Authenticated customer display name (Read-Only)
  const displayName =
    user?.name ||
    user?.fullName ||
    user?.full_name ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "") ||
    user?.firstName ||
    user?.username ||
    (user?.email ? user.email.split("@")[0] : "Verified Customer");

  // Clean up object URL memory leaks on unmount or photo removal
  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.previewUrl && p.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(p.previewUrl);
        }
      });
    };
  }, [photos]);

  // Handle multiple photo selection & validation
  const handlePhotoSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    setError(null);

    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const validExts = [".jpg", ".jpeg", ".png", ".webp"];

    const currentCount = photos.length;
    if (currentCount >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const availableSlots = MAX_PHOTOS - currentCount;
    const filesToProcess = selectedFiles.slice(0, availableSlots);

    if (selectedFiles.length > availableSlots) {
      setError(`Only ${availableSlots} more photo${availableSlots > 1 ? "s" : ""} could be added (max ${MAX_PHOTOS}).`);
    }

    const newPhotos = [];

    for (const file of filesToProcess) {
      // 5 MB limit
      if (file.size > MAX_FILE_SIZE) {
        setError("Upload JPG, PNG or WEBP images under 5 MB.");
        continue;
      }

      // Format check
      const fileExt = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!validMimes.includes(file.type.toLowerCase()) && !validExts.includes(fileExt)) {
        setError("Upload JPG, PNG or WEBP images under 5 MB.");
        continue;
      }

      // Duplicate prevention by filename and size
      const isDuplicate = photos.some(
        (p) => p.file.name === file.name && p.file.size === file.size
      ) || newPhotos.some(
        (p) => p.file.name === file.name && p.file.size === file.size
      );

      if (isDuplicate) {
        continue;
      }

      newPhotos.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file: file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (newPhotos.length > 0) {
      setPhotos((prev) => [...prev, ...newPhotos]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove individual photo
  const handleRemovePhoto = (idToRemove) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === idToRemove);
      if (target?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((p) => p.id !== idToRemove);
    });
    setError(null);
  };

  const handleOpenFileDialog = () => {
    if (photos.length >= MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Please write a review of your experience.");
      return;
    }
    if (text.trim().length < 5) {
      setError("Review must be at least 5 characters long.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      if (orderItemId) formData.append("order_item_id", String(orderItemId));
      if (productId) formData.append("product_id", String(productId));
      if (order?.rawId || order?.id) formData.append("order_id", String(order.rawId || order.id));
      formData.append("rating", String(Number(rating)));
      formData.append("text", text.trim());
      formData.append("name", displayName);

      if (user?.email) {
        formData.append("email", user.email);
        formData.append("customer_email", user.email);
      }

      // Append all uploaded photos
      photos.forEach((photoObj) => {
        formData.append("images", photoObj.file);
      });

      await submitProductReview(formData);

      if (toast) {
        toast("Thank you for your review!");
      }

      // Mark locally in storage for instant UI responsiveness
      if (orderItemId) {
        try {
          localStorage.setItem(`reviewed_order_item_${orderItemId}`, "true");
        } catch {}
      }
      if (order?.id && productId) {
        try {
          localStorage.setItem(`reviewed_order_${order.id}_prod_${productId}`, "true");
        } catch {}
      }

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
        {/* Modal Header */}
        <div className="review-modal-head">
          <div className="review-product-preview-row">
            <img
              src={productImg || fallbackImg}
              alt={productName}
              className="review-product-thumb"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = fallbackImg;
              }}
            />
            <div className="review-product-info-wrap">
              <span className="review-verified-tag">
                <FiCheckCircle className="tag-icon" /> Verified Purchase
              </span>
              <h3 className="review-modal-title">{productName}</h3>
              {productVariant && <p className="review-modal-variant">{productVariant}</p>}
            </div>
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="review-modal-body">
          {error && <div className="review-error-banner">{error}</div>}

          {/* 1. Customer Name (Auto-filled & Read-only) */}
          <div className="review-field-group">
            <div className="review-label-with-hint">
              <label className="review-field-label">Customer Name</label>
              <span className="review-readonly-hint">Verified account</span>
            </div>
            <input
              type="text"
              className="review-input review-input-readonly"
              value={displayName}
              readOnly
              tabIndex={-1}
              aria-label="Customer Name"
            />
          </div>

          {/* 2. Star Rating Selector */}
          <div className="review-field-group">
            <label className="review-field-label">Your Rating *</label>
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
                {rating === 5 && "5.0 ★ (Excellent)"}
                {rating === 4 && "4.0 ★ (Very Good)"}
                {rating === 3 && "3.0 ★ (Good)"}
                {rating === 2 && "2.0 ★ (Fair)"}
                {rating === 1 && "1.0 ★ (Poor)"}
              </span>
            </div>
          </div>

          {/* 3. Review Description */}
          <div className="review-field-group">
            <label className="review-field-label">Your Review *</label>
            <textarea
              className="review-textarea"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you like or dislike about this product? How was the quality, craftsmanship, and overall experience?"
              required
              minLength={5}
              maxLength={2000}
            />
            <span className="review-char-count">{text.length} / 2000 characters</span>
          </div>

          {/* 4. Multiple Product Photos Upload (Optional) */}
          <div className="review-field-group review-photo-upload-section">
            <div className="review-label-with-hint">
              <label className="review-field-label">Product Photos (Optional)</label>
              <span className="review-photo-count-hint">
                {photos.length} / {MAX_PHOTOS} photos
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoSelect}
              style={{ display: "none" }}
              aria-label="Upload product photos"
            />

            {photos.length === 0 ? (
              <div
                className="review-photo-dropzone"
                onClick={handleOpenFileDialog}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleOpenFileDialog();
                }}
              >
                <div className="review-photo-dropzone-icon">
                  <FiUploadCloud size={20} />
                </div>
                <div className="review-photo-dropzone-text">
                  <span className="upload-prompt-text">+ Add Product Photos</span>
                  <span className="upload-help-text">
                    Add up to 5 product photos (optional). JPG, PNG, WEBP under 5 MB.
                  </span>
                </div>
              </div>
            ) : (
              <div className="review-multi-photo-gallery-wrapper">
                <div className="review-multi-photo-track">
                  {photos.map((photoItem, idx) => (
                    <div key={photoItem.id} className="review-photo-item-card">
                      <img
                        src={photoItem.previewUrl}
                        alt={`Preview ${idx + 1} for ${productName}`}
                        className="review-photo-item-img"
                      />
                      <button
                        type="button"
                        className="review-photo-remove-btn"
                        onClick={() => handleRemovePhoto(photoItem.id)}
                        title="Remove image"
                        aria-label={`Remove photo ${idx + 1}`}
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      className="review-photo-add-more-btn"
                      onClick={handleOpenFileDialog}
                      title="Add more photos"
                      aria-label="Add more photos"
                    >
                      <FiUploadCloud size={18} />
                      <span>+ Add More</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
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
