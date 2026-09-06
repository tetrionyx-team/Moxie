import React, { useEffect } from "react";
import { LuLogOut, LuX } from "react-icons/lu";
import "./LogoutConfirmModal.css";

export default function LogoutConfirmModal({ isOpen, onClose, onConfirm }) {
  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="logout-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      aria-describedby="logout-modal-desc"
    >
      <div
        className="logout-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Right Close Button */}
        <button
          type="button"
          className="logout-modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <LuX aria-hidden="true" />
        </button>

        {/* Circular Gold Icon */}
        <div className="logout-modal-icon-wrap" aria-hidden="true">
          <LuLogOut />
        </div>

        {/* Modal Title */}
        <h3 id="logout-modal-title" className="logout-modal-title">
          Confirm Logout
        </h3>

        {/* Modal Message */}
        <p id="logout-modal-desc" className="logout-modal-desc">
          Are you sure you want to logout from this account?
        </p>

        {/* Actions */}
        <div className="logout-modal-actions">
          <button
            type="button"
            className="logout-modal-btn logout-modal-btn-no"
            onClick={onClose}
          >
            No, Stay Logged In
          </button>
          <button
            type="button"
            className="logout-modal-btn logout-modal-btn-yes"
            onClick={onConfirm}
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
}
